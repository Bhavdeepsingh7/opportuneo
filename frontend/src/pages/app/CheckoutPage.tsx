import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { CheckoutCard } from '../../components/checkout/CheckoutCard'
import type { Plan } from '../../lib/pricing'
import './CheckoutPage.css'

interface CheckoutPageProps {
  plan?: Plan
}

interface CheckoutLocationState {
  plan?: Plan
}

function isPlan(value: unknown): value is Plan {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Plan
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.description === 'string' &&
    typeof candidate.monthlyPrice === 'number' &&
    Array.isArray(candidate.features) &&
    candidate.features.every((feature) => typeof feature === 'string') &&
    typeof candidate.messageLimit === 'number'
  )
}

export default function CheckoutPage({ plan: planFromProps }: CheckoutPageProps) {
  const location = useLocation()
  const state = location.state as CheckoutLocationState | null
  const selectedPlan = planFromProps ?? (isPlan(state?.plan) ? state.plan : undefined)

  if (!selectedPlan) {
    return (
      <main className="checkout-page">
        <div className="checkout-shell checkout-shell--empty">
          <Link to="/app/subscription" className="checkout-back-link">
            <ArrowLeft size={16} aria-hidden="true" />
            Back to plans
          </Link>
          <section className="checkout-empty" aria-labelledby="checkout-empty-title">
            <h1 id="checkout-empty-title">Select a plan to continue</h1>
            <p>Checkout needs a plan object with pricing, features, and usage limits.</p>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="checkout-page">
      <div className="checkout-shell">
        <Link to="/app/subscription" className="checkout-back-link">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to plans
        </Link>
        <CheckoutCard plan={selectedPlan} />
      </div>
    </main>
  )
}
