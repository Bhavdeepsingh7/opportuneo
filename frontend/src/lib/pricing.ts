export interface Plan {
  id: string
  name: string
  description: string
  monthlyPrice: number
  features: string[]
  messageLimit: number
}

export const GST_RATE = 18

const roundToCurrency = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100

export function calculateBasePrice(totalPrice: number, gstRate: number = GST_RATE): number {
  return roundToCurrency(totalPrice / (1 + gstRate / 100))
}

export function calculateGST(totalPrice: number, gstRate: number = GST_RATE): number {
  return roundToCurrency(totalPrice - calculateBasePrice(totalPrice, gstRate))
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
