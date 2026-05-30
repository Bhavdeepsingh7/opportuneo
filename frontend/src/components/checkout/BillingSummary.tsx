import type { Plan } from '../../lib/pricing'
import { calculateBasePrice, calculateGST, formatCurrency, GST_RATE } from '../../lib/pricing'

interface BillingSummaryProps {
  gstRate?: number
  plan: Plan
}

export function BillingSummary({ gstRate = GST_RATE, plan }: BillingSummaryProps) {
  const basePrice = calculateBasePrice(plan.monthlyPrice, gstRate)
  const gstAmount = calculateGST(plan.monthlyPrice, gstRate)

  return (
    <section className="checkout-section checkout-summary" aria-labelledby="checkout-summary-title">
      <h2 id="checkout-summary-title">Order Summary</h2>

      <dl className="checkout-summary__rows">
        <div>
          <dt>Base Price</dt>
          <dd>{formatCurrency(basePrice)}</dd>
        </div>
        <div>
          <dt>GST ({gstRate}%)</dt>
          <dd>{formatCurrency(gstAmount)}</dd>
        </div>
        <div className="checkout-summary__total">
          <dt>Total Payable</dt>
          <dd>{formatCurrency(plan.monthlyPrice)}</dd>
        </div>
      </dl>
    </section>
  )
}
