import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../ui/button'
import type { Plan } from '../../lib/pricing'
import { createPaymentOrder, verifyPayment } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useAppState } from '../../context/AppContext'

interface PaymentButtonProps {
  disabled?: boolean
  plan: Plan
}

interface RazorpayResponse {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

interface PaymentResult {
  subscription_name: string
  subscription_status: string
  available_credits: number
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      on: (event: string, callback: (response: { error?: { description?: string } }) => void) => void
      open: () => void
    }
  }
}

let razorpayScriptPromise: Promise<void> | null = null

function loadRazorpayCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve()
  if (razorpayScriptPromise) return razorpayScriptPromise

  razorpayScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Unable to load Razorpay Checkout. Please try again.'))
    document.body.appendChild(script)
  })
  return razorpayScriptPromise
}

export async function handlePayment(plan: Plan): Promise<PaymentResult> {
  if (!plan?.id) {
    throw new Error('A valid plan is required before starting payment.')
  }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Please sign in again before starting payment.')

  await loadRazorpayCheckout()
  const { data: order } = await createPaymentOrder(plan.id, session.access_token)

  return new Promise((resolve, reject) => {
    if (!window.Razorpay) {
      reject(new Error('Razorpay Checkout is unavailable.'))
      return
    }

    const checkout = new window.Razorpay({
      key: order.key_id,
      amount: order.amount,
      currency: order.currency,
      order_id: order.order_id,
      name: 'opportuneo',
      description: `${plan.name} - ${plan.description}`,
      prefill: {
        name: session.user.user_metadata?.full_name || '',
        email: session.user.email || '',
      },
      handler: async (payment: RazorpayResponse) => {
        try {
          const { data } = await verifyPayment(payment, session.access_token)
          resolve(data)
        } catch (error) {
          reject(error)
        }
      },
      modal: {
        ondismiss: () => reject(new Error('Payment popup was closed before completion.')),
      },
      theme: { color: '#6d5fff' },
    })

    checkout.on('payment.failed', (response) => {
      reject(new Error(response.error?.description || 'Payment failed. Please try again.'))
    })
    checkout.open()
  })
}

export function PaymentButton({ disabled = false, plan }: PaymentButtonProps) {
  const { user } = useAuth()
  const { setAvailableCredits, setSubscriptionName, setSubscriptionStatus } = useAppState()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onPay = async () => {
    setError(null)
    setIsLoading(true)

    try {
      const result = await handlePayment(plan)
      setAvailableCredits(result.available_credits)
      setSubscriptionName(result.subscription_name)
      setSubscriptionStatus(result.subscription_status)
      toast.success('Payment verified and subscription activated.')
    } catch (paymentError) {
      const apiMessage = typeof paymentError === 'object' && paymentError !== null && 'response' in paymentError
        ? (paymentError as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : null
      const message = apiMessage || (paymentError instanceof Error ? paymentError.message : 'Unable to start payment. Please try again.')
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="checkout-payment">
      <Button fullWidth isLoading={isLoading} disabled={disabled || !user} onClick={onPay}>
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
