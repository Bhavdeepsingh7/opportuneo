import { BadgeCheck, LockKeyhole, ShieldCheck } from 'lucide-react'

const trustItems = [
  { icon: ShieldCheck, label: 'Secure payments powered by Razorpay' },
  { icon: LockKeyhole, label: 'SSL secured checkout' },
  { icon: BadgeCheck, label: 'Instant plan activation after successful payment' },
]

export function TrustSection() {
  return (
    <section className="checkout-section checkout-trust" aria-label="Checkout security and trust">
      {trustItems.map(({ icon: Icon, label }) => (
        <div key={label} className="checkout-trust__item">
          <span className="checkout-icon" aria-hidden="true">
            <Icon size={17} />
          </span>
          <span>{label}</span>
        </div>
      ))}
    </section>
  )
}
