export interface Plan {
  id: string
  name: string
  description: string
  monthlyPrice: number
  features: string[]
  messageLimit: number
}

const roundToCurrency = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100

/**
 * Returns the price for display. 
 * Since GST is removed, this is identical to the total price.
 */
export function calculateBasePrice(totalPrice: number): number {
  return roundToCurrency(totalPrice)
}

/**
 * @deprecated GST has been removed from the project.
 */
export function calculateGST(_totalPrice: number): number {
  return 0
}

export function formatCurrency(
  amount: number,
  options: { currency?: string; locale?: string } = {},
): string {
  const { currency = 'INR', locale = 'en-IN' } = options

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(roundToCurrency(amount))
}
