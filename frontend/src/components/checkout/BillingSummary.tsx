import type { Plan } from '../../lib/pricing'
import { formatCurrency } from '../../lib/pricing'

interface BillingSummaryProps {
  plan: Plan
}

export function BillingSummary({ plan }: BillingSummaryProps) {
  return (
    <section className="checkout-section checkout-summary" aria-labelledby="checkout-summary-title">
      <h2 id="checkout-summary-title">Order Summary</h2>

      <dl className="checkout-summary__rows">
        <div>
          <dt>Price</dt>
          <dd>{formatCurrency(plan.monthlyPrice)}</dd>
        </div>
        <div className="checkout-summary__total">
          <dt>Total Payable</dt>
          <dd>{formatCurrency(plan.monthlyPrice)}</dd>
        </div>
      </dl>
    </section>
  )
}
