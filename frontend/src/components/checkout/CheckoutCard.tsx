import { Card, CardContent } from '../ui/card'
import type { Plan } from '../../lib/pricing'
import { BillingSummary } from './BillingSummary'
import { PaymentButton } from './PaymentButton'
import { PlanDetails } from './PlanDetails'
import { TrustSection } from './TrustSection'

interface CheckoutCardProps {
  plan: Plan
}

export function CheckoutCard({ plan }: CheckoutCardProps) {
  return (
    <Card className="checkout-card">
      <CardContent className="checkout-card__content">
        <div className="checkout-card__primary">
          <PlanDetails plan={plan} />
        </div>

        <aside className="checkout-card__aside" aria-label="Billing and payment">
          <BillingSummary plan={plan} />
          <TrustSection />
          <PaymentButton plan={plan} />
        </aside>
      </CardContent>
    </Card>
  )
}
