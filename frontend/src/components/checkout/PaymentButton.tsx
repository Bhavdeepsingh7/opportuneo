import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Button } from '../ui/button'
import type { Plan } from '../../lib/pricing'

interface PaymentButtonProps {
  disabled?: boolean
  plan: Plan
}

export async function handlePayment(plan: Plan): Promise<void> {
  if (!plan?.id) {
    throw new Error('A valid plan is required before starting payment.')
  }

  // TODO: Create Razorpay order from backend.
  // TODO: Receive order details.
  // TODO: Open Razorpay checkout.
  // TODO: Verify payment signature.
  // TODO: Activate subscription.
  // TODO: Redirect to success page.
}

export function PaymentButton({ disabled = false, plan }: PaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onPay = async () => {
    setError(null)
    setIsLoading(true)

    try {
      await handlePayment(plan)
    } catch (paymentError) {
      const message = paymentError instanceof Error ? paymentError.message : 'Unable to start payment. Please try again.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="checkout-payment">
      <Button fullWidth isLoading={isLoading} disabled={disabled} onClick={onPay}>
        {isLoading ? 'Preparing checkout' : 'Proceed to Payment'}
        {!isLoading ? <ArrowRight size={17} aria-hidden="true" /> : null}
      </Button>

      {error ? (
        <p className="checkout-payment__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
