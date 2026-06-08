from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)
USER = {"id": "12345678-1234-1234-1234-123456789012", "email": "test@example.com"}


def test_create_order_uses_server_price_in_paise():
    razorpay_client = MagicMock()
    razorpay_client.order.create.return_value = {
        "id": "order_test",
        "amount": 49900,
        "currency": "INR",
    }
    app.dependency_overrides = {}

    with patch("app.routers.payments._razorpay_client", return_value=razorpay_client), \
         patch("app.routers.payments.settings.razorpay_key_id", "rzp_test_key"):
        from app.routers.payments import _current_user
        app.dependency_overrides[_current_user] = lambda: USER
        response = client.post("/api/payments/orders", json={"plan_id": "starter"})

    app.dependency_overrides = {}
    assert response.status_code == 200
    assert response.json() == {
        "order_id": "order_test",
        "amount": 49900,
        "currency": "INR",
        "key_id": "rzp_test_key",
    }
    assert razorpay_client.order.create.call_args.args[0]["amount"] == 49900


def test_verify_payment_activates_subscription():
    razorpay_client = MagicMock()
    razorpay_client.order.fetch.return_value = {
        "amount": 149900,
        "currency": "INR",
        "status": "paid",
        "notes": {"user_id": USER["id"], "plan_id": "pro"},
    }

    from app.routers.payments import _current_user
    app.dependency_overrides[_current_user] = lambda: USER
    with patch("app.routers.payments._razorpay_client", return_value=razorpay_client), \
         patch("app.routers.payments._get_profile", AsyncMock(return_value={
             "subscription_name": "Free",
             "available_credits": 0,
             "razorpay_payment_id": None,
             "razorpay_payment_ids": [],
         })), \
         patch("app.routers.payments._update_profile", AsyncMock(side_effect=lambda _user_id, updates: updates)) as update:
        response = client.post("/api/payments/verify", json={
            "razorpay_order_id": "order_test",
            "razorpay_payment_id": "pay_test",
            "razorpay_signature": "signature_test",
        })

    app.dependency_overrides = {}
    assert response.status_code == 200
    assert response.json()["subscription_name"] == "Pro"
    assert response.json()["available_credits"] == 5000
    assert update.await_args.args[1]["subscription_status"] == "active"
    razorpay_client.utility.verify_payment_signature.assert_called_once()


def test_verify_payment_is_idempotent():
    razorpay_client = MagicMock()
    razorpay_client.order.fetch.return_value = {
        "amount": 5000,
        "currency": "INR",
        "status": "paid",
        "notes": {"user_id": USER["id"], "plan_id": "custom-credits-50"},
    }

    from app.routers.payments import _current_user
    app.dependency_overrides[_current_user] = lambda: USER
    with patch("app.routers.payments._razorpay_client", return_value=razorpay_client), \
         patch("app.routers.payments._get_profile", AsyncMock(return_value={
             "subscription_name": "Starter",
             "subscription_status": "active",
             "available_credits": 1050,
             "razorpay_payment_id": "pay_test",
             "razorpay_payment_ids": ["pay_test"],
         })), \
         patch("app.routers.payments._update_profile", AsyncMock()) as update:
        response = client.post("/api/payments/verify", json={
            "razorpay_order_id": "order_test",
            "razorpay_payment_id": "pay_test",
            "razorpay_signature": "signature_test",
        })

    app.dependency_overrides = {}
    assert response.status_code == 200
    assert response.json()["available_credits"] == 1050
    update.assert_not_awaited()


def test_get_subscription_returns_persistent_profile_state():
    from app.routers.payments import _current_user
    app.dependency_overrides[_current_user] = lambda: USER
    with patch("app.routers.payments._get_profile", AsyncMock(return_value={
        "subscription_name": "Starter",
        "subscription_status": "active",
        "available_credits": 900,
    })):
        response = client.get("/api/payments/subscription")

    app.dependency_overrides = {}
    assert response.status_code == 200
    assert response.json() == {
        "subscription_name": "Starter",
        "subscription_status": "active",
        "available_credits": 900,
    }


def test_payment_captured_webhook_activates_subscription():
    razorpay_client = MagicMock()
    razorpay_client.order.fetch.return_value = {
        "amount": 49900,
        "currency": "INR",
        "status": "paid",
        "notes": {"user_id": USER["id"], "plan_id": "starter"},
    }

    with patch("app.routers.payments.settings.razorpay_webhook_secret", "webhook_secret"), \
         patch("app.routers.payments._razorpay_client", return_value=razorpay_client), \
         patch("app.routers.payments._activate_payment", AsyncMock(return_value={
             "subscription_name": "Starter",
             "subscription_status": "active",
             "available_credits": 1000,
         })) as activate:
        response = client.post(
            "/api/payments/webhook",
            headers={"X-Razorpay-Signature": "signature"},
            json={
                "event": "payment.captured",
                "payload": {"payment": {"entity": {
                    "id": "pay_webhook",
                    "order_id": "order_webhook",
                }}},
            },
        )

    assert response.status_code == 200
    assert response.json()["processed"] is True
    activate.assert_awaited_once()
    razorpay_client.utility.verify_webhook_signature.assert_called_once()
