from datetime import datetime, timezone
from typing import Any

import httpx
import razorpay
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel

from app.config import get_settings

from app.dependencies import get_current_user, get_supabase_headers

settings = get_settings()
router = APIRouter(prefix="/payments", tags=["payments"])

PLANS = {
    "starter": {"name": "Starter", "amount": 49900, "credits": 1000},
    "pro": {"name": "Pro", "amount": 149900, "credits": 5000},
    "agency": {"name": "Agency", "amount": 399900, "credits": 20000},
}


class CreateOrderRequest(BaseModel):
    plan_id: str


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


def _razorpay_client() -> razorpay.Client:
    if not settings.razorpay_key_id or not settings.razorpay_key_secret:
        raise HTTPException(status_code=503, detail="Razorpay is not configured")
    return razorpay.Client(auth=(settings.razorpay_key_id, settings.razorpay_key_secret))


def _plan_details(plan_id: str) -> dict[str, Any]:
    if plan_id in PLANS:
        return {"id": plan_id, **PLANS[plan_id], "purchase_type": "subscription"}

    prefix = "custom-credits-"
    if plan_id.startswith(prefix):
        try:
            credits = int(plan_id.removeprefix(prefix))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid credit purchase") from exc
        if credits < 50:
            raise HTTPException(status_code=400, detail="Minimum credit purchase is 50")
        return {
            "id": plan_id,
            "name": "Custom email credits",
            "amount": credits * 100,
            "credits": credits,
            "purchase_type": "credits",
        }

    raise HTTPException(status_code=400, detail="Unknown plan")


async def _get_profile(user_id: str) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(
            f"{settings.supabase_url}/rest/v1/profiles",
            params={"id": f"eq.{user_id}", "select": "*"},
            headers=get_supabase_headers(),
        )
    if response.status_code != 200 or not response.json():
        raise HTTPException(status_code=500, detail="User profile was not found")
    return response.json()[0]


async def _update_profile(user_id: str, updates: dict[str, Any]) -> dict[str, Any]:
    headers = {**get_supabase_headers(), "Prefer": "return=representation"}
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.patch(
            f"{settings.supabase_url}/rest/v1/profiles",
            params={"id": f"eq.{user_id}"},
            headers=headers,
            json=updates,
        )
    if response.status_code not in (200, 204):
        raise HTTPException(status_code=500, detail="Could not activate subscription")
    rows = response.json() if response.content else []
    return rows[0] if rows else updates


def _profile_response(profile: dict[str, Any]) -> dict[str, Any]:
    return {
        "subscription_name": profile.get("subscription_name", "Free"),
        "subscription_status": profile.get("subscription_status", "inactive"),
        "available_credits": int(profile.get("available_credits") or 0),
    }


def _validated_order_plan(order: dict[str, Any], user_id: str | None = None) -> dict[str, Any]:
    notes = order.get("notes") or {}
    if user_id and notes.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Order does not belong to this user")

    plan = _plan_details(notes.get("plan_id", ""))
    if (
        order.get("amount") != plan["amount"]
        or order.get("currency") != "INR"
        or order.get("status") != "paid"
    ):
        raise HTTPException(status_code=400, detail="Razorpay order is not paid or does not match the plan")
    return plan


async def _activate_payment(
    user_id: str,
    plan: dict[str, Any],
    order_id: str,
    payment_id: str,
) -> dict[str, Any]:
    profile = await _get_profile(user_id)
    processed_ids = list(profile.get("razorpay_payment_ids") or [])
    if payment_id in processed_ids:
        return _profile_response(profile)

    current_credits = int(profile.get("available_credits") or 0)
    is_credit_purchase = plan["purchase_type"] == "credits"
    updates = {
        "subscription_status": "active",
        "subscription_name": profile.get("subscription_name", "Free") if is_credit_purchase else plan["name"],
        "available_credits": current_credits + plan["credits"] if is_credit_purchase else plan["credits"],
        "razorpay_order_id": order_id,
        "razorpay_payment_id": payment_id,
        "razorpay_payment_ids": [*processed_ids, payment_id],
        "subscription_updated_at": datetime.now(timezone.utc).isoformat(),
    }
    return _profile_response(await _update_profile(user_id, updates))


@router.get("/subscription")
async def get_subscription(user: dict = Depends(get_current_user)):
    return _profile_response(await _get_profile(user["id"]))


@router.post("/orders")
async def create_order(req: CreateOrderRequest, user: dict = Depends(get_current_user)):
    plan = _plan_details(req.plan_id)
    order = _razorpay_client().order.create(
        {
            "amount": plan["amount"],  # Razorpay expects the smallest currency unit (paise).
            "currency": "INR",
            "receipt": f"{user['id'][:8]}-{int(datetime.now(timezone.utc).timestamp())}",
            "notes": {
                "user_id": user["id"],
                "plan_id": plan["id"],
                "plan_name": plan["name"],
                "credits": str(plan["credits"]),
                "purchase_type": plan["purchase_type"],
            },
        }
    )
    return {
        "order_id": order["id"],
        "amount": order["amount"],
        "currency": order["currency"],
        "key_id": settings.razorpay_key_id,
    }


@router.post("/verify")
async def verify_payment(req: VerifyPaymentRequest, user: dict = Depends(get_current_user)):
    client = _razorpay_client()
    try:
        client.utility.verify_payment_signature(req.model_dump())
        order = client.order.fetch(req.razorpay_order_id)
    except razorpay.errors.SignatureVerificationError as exc:
        raise HTTPException(status_code=400, detail="Payment signature verification failed") from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Could not verify payment with Razorpay") from exc

    plan = _validated_order_plan(order, user["id"])
    activated = await _activate_payment(
        user["id"],
        plan,
        req.razorpay_order_id,
        req.razorpay_payment_id,
    )
    return {"verified": True, **activated}


@router.post("/webhook")
async def razorpay_webhook(
    request: Request,
    razorpay_signature: str | None = Header(default=None, alias="X-Razorpay-Signature"),
):
    if not settings.razorpay_webhook_secret:
        raise HTTPException(status_code=503, detail="Razorpay webhook is not configured")
    if not razorpay_signature:
        raise HTTPException(status_code=400, detail="Missing Razorpay webhook signature")

    body = await request.body()
    try:
        _razorpay_client().utility.verify_webhook_signature(
            body.decode("utf-8"),
            razorpay_signature,
            settings.razorpay_webhook_secret,
        )
    except razorpay.errors.SignatureVerificationError as exc:
        raise HTTPException(status_code=400, detail="Invalid Razorpay webhook signature") from exc

    event = await request.json()
    if event.get("event") != "payment.captured":
        return {"received": True, "processed": False}

    payment = event.get("payload", {}).get("payment", {}).get("entity", {})
    order_id = payment.get("order_id")
    payment_id = payment.get("id")
    if not order_id or not payment_id:
        raise HTTPException(status_code=400, detail="Webhook payment data is incomplete")

    try:
        order = _razorpay_client().order.fetch(order_id)
        plan = _validated_order_plan(order)
        user_id = (order.get("notes") or {}).get("user_id")
        if not user_id:
            raise HTTPException(status_code=400, detail="Razorpay order has no user")
        activated = await _activate_payment(user_id, plan, order_id, payment_id)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Could not process Razorpay webhook") from exc

    return {"received": True, "processed": True, **activated}
