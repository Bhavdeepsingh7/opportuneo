import { CheckCircle2, MessagesSquare } from 'lucide-react'
import { Badge } from '../ui/badge'
import type { Plan } from '../../lib/pricing'
import { formatCurrency } from '../../lib/pricing'

interface PlanDetailsProps {
  plan: Plan
}

export function PlanDetails({ plan }: PlanDetailsProps) {
  const formattedLimit = new Intl.NumberFormat('en-IN').format(plan.messageLimit)
  const isCreditPurchase = plan.id.startsWith('custom-credits-')

  return (
    <section className="checkout-section" aria-labelledby="checkout-plan-title">
      <div className="checkout-plan__topline">
        <Badge tone="green">GST Included</Badge>
      </div>
      <h1 id="checkout-plan-title" className="checkout-plan__name">
        {plan.name}
      </h1>
      <p className="checkout-plan__description">{plan.description}</p>

      <div className="checkout-plan__price" aria-label={`${plan.name} payable price`}>
        <span>{formatCurrency(plan.monthlyPrice)}</span>
        <small>{isCreditPurchase ? 'one-time' : '/ month'}</small>
      </div>

      <div className="checkout-plan__metric">
        <span className="checkout-icon" aria-hidden="true">
          <MessagesSquare size={18} />
        </span>
        <span>{formattedLimit} email credits {isCreditPurchase ? 'in this purchase' : 'included monthly'}</span>
      </div>

      <div className="checkout-features" aria-labelledby="checkout-features-title">
        <h2 id="checkout-features-title">Included features</h2>
        <ul>
          {plan.features.map((feature) => (
            <li key={feature}>
              <CheckCircle2 size={17} aria-hidden="true" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
