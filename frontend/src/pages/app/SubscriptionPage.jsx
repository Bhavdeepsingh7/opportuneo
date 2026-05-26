import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  Check,
  Minus,
  Sparkles,
  X,
  Zap,
} from 'lucide-react'
import './SubscriptionPage.css'

const plans = [
  {
    name: 'Starter',
    monthly: 19,
    description: 'For solo operators launching focused outbound campaigns.',
    cta: 'Start Starter',
    features: [
      '2,000 AI credits',
      '1 workspace',
      'Basic email outreach',
      'Analytics dashboard',
      'Email support',
    ],
  },
  {
    name: 'Pro',
    monthly: 49,
    description: 'For fast-moving teams personalizing outreach at scale.',
    cta: 'Start Pro',
    featured: true,
    features: [
      '10,000 AI credits',
      'Unlimited campaigns',
      'Advanced personalization',
      'LinkedIn automation',
      'Team collaboration',
      'Priority support',
    ],
  },
  {
    name: 'Enterprise',
    custom: true,
    description: 'For organizations with complex workflows and custom needs.',
    cta: 'Contact sales',
    features: [
      'Unlimited credits',
      'API access',
      'Custom integrations',
      'Dedicated manager',
      'SLA support',
      'Advanced analytics',
    ],
  },
]

const comparison = [
  ['AI credits', '2,000', '10,000', 'Unlimited'],
  ['Workspaces', '1', 'Unlimited', 'Unlimited'],
  ['Email outreach', true, true, true],
  ['Advanced personalization', false, true, true],
  ['LinkedIn automation', false, true, true],
  ['Team collaboration', false, true, true],
  ['API access', false, false, true],
  ['SLA support', false, false, true],
  ['Dedicated manager', false, false, true],
]

const faqs = [
  ['Can I cancel anytime?', 'Yes. You can cancel or change your plan anytime from billing settings. Your workspace remains available until the end of the billing cycle.'],
  ['Do unused credits roll over?', 'Monthly plan credits reset each billing cycle. Yearly plans include larger credit pools and custom rollover options for Enterprise customers.'],
  ['Is there a free trial?', 'Yes. New teams can explore Outreach AI with sample credits before choosing a paid plan.'],
  ['Can I upgrade later?', 'Absolutely. Upgrades are instant, and your campaigns, contacts, and personalization settings move with you.'],
]

const logos = ['NOVA', 'Flux', 'Orbit', 'Northstar', 'Pulse']

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
}

function BillingToggle({ billing, setBilling }) {
  return (
    <div className="billing-toggle inline-flex items-center gap-1 rounded-full p-1">
      {['monthly', 'yearly'].map((mode) => {
        const active = billing === mode
        return (
          <button
            key={mode}
            type="button"
            aria-pressed={active}
            onClick={() => setBilling(mode)}
            className={[
              'relative rounded-full px-5 py-2 text-sm font-semibold transition',
              active ? 'text-white' : 'text-[var(--text3)] hover:text-[var(--text)]',
            ].join(' ')}
          >
            {active && (
              <motion.span
                layoutId="billing-pill"
                className="absolute inset-0 rounded-full bg-[var(--accent)]"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative z-10 capitalize">{mode}</span>
          </button>
        )
      })}
    </div>
  )
}

function PlanCard({ plan, billing, index }) {
  const price = useMemo(() => {
    if (plan.custom) return 'Custom'
    const amount = billing === 'yearly' ? Math.round(plan.monthly * 0.8) : plan.monthly
    return `$${amount}`
  }, [billing, plan])

  return (
    <motion.article
      variants={fadeUp}
      whileHover={{ y: -8, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className={[
        'pricing-card rounded-[24px] p-6 sm:p-7',
        plan.featured ? 'featured' : '',
      ].join(' ')}
    >
      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--text2)]">{plan.description}</p>
          </div>
          {plan.featured && (
            <span className="popular-badge rounded-full px-3 py-1 text-xs font-semibold text-[var(--accent3)]">
              Most Popular
            </span>
          )}
        </div>

        <div className="mt-8 flex items-end gap-2">
          <span className="text-5xl font-semibold tracking-tight text-white">{price}</span>
          {!plan.custom && <span className="pb-2 text-sm font-medium text-[var(--text3)]">/month</span>}
        </div>
        {billing === 'yearly' && !plan.custom && (
          <div className="mt-2 text-xs font-semibold text-[var(--green)]">Billed yearly with 20% savings</div>
        )}

        <button
          type="button"
          className={[
            'mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold transition',
            plan.featured
              ? 'cta-glow bg-[var(--accent)] text-white hover:bg-[var(--accent2)]'
              : 'bg-white/[.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.08)] hover:bg-white/[.12]',
          ].join(' ')}
        >
          {plan.cta}
          {index === 1 ? <Zap size={16} /> : <ArrowRight size={16} />}
        </button>

        <div className="mt-7 space-y-3">
          {plan.features.map((feature) => (
            <div key={feature} className="flex items-start gap-3 text-sm text-[var(--text2)]">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--green-bg)] text-[var(--green)]">
                <Check size={13} />
              </span>
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.article>
  )
}

function ValueCell({ value }) {
  if (value === true) return <Check className="mx-auto text-[var(--green)]" size={18} />
  if (value === false) return <X className="mx-auto text-[var(--text3)]" size={17} />
  return <span className="font-semibold text-[var(--text)]">{value}</span>
}

function FaqItem({ item, open, onClick }) {
  return (
    <div className="faq-card rounded-2xl">
      <button
        type="button"
        onClick={onClick}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="text-sm font-semibold text-white">{item[0]}</span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[.07] text-[var(--text2)]">
          {open ? <Minus size={15} /> : <Sparkles size={15} />}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="faq-answer px-5"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
          >
            <p className="pb-5 text-sm leading-6 text-[var(--text2)]">{item[1]}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function SubscriptionPage() {
  const [billing, setBilling] = useState('monthly')
  const [openFaq, setOpenFaq] = useState(0)

  return (
    <main className="pricing-page">
      <motion.div
        className="pricing-bg-glow one"
        animate={{ scale: [1, 1.08, 1], opacity: [.55, .8, .55] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="pricing-bg-glow two"
        animate={{ scale: [1.04, 1, 1.04], opacity: [.45, .7, .45] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="pricing-shell">
        <motion.section
          variants={stagger}
          initial="hidden"
          animate="show"
          className="mx-auto max-w-4xl text-center"
        >
          <motion.div variants={fadeUp} className="pricing-eyebrow mx-auto inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-[var(--accent3)]">
            <Sparkles size={14} />
            AI-native outreach infrastructure
          </motion.div>
          <motion.h1 variants={fadeUp} className="mt-7 text-4xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
            Scale Your Outreach with AI
          </motion.h1>
          <motion.p variants={fadeUp} className="mx-auto mt-6 max-w-2xl text-base leading-8 text-[var(--text2)] sm:text-lg">
            Automate lead generation, personalize every message, and launch high-converting outbound campaigns from one intelligent workspace.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <BillingToggle billing={billing} setBilling={setBilling} />
            <span className="save-badge rounded-full px-4 py-2 text-xs font-semibold text-[var(--green)]">
              Save 20% yearly
            </span>
          </motion.div>
        </motion.section>

        <motion.section
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="mt-16 grid gap-5 lg:grid-cols-3"
        >
          {plans.map((plan, index) => (
            <PlanCard key={plan.name} plan={plan} billing={billing} index={index} />
          ))}
        </motion.section>

        <motion.section variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.18 }} className="mt-20">
          <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-2xl font-semibold text-white sm:text-3xl">Compare plans</h2>
              <p className="mt-2 text-sm text-[var(--text2)]">Everything you need to pick the right outreach engine.</p>
            </div>
          </div>
          <div className="compare-panel rounded-[24px] p-2">
            <table className="compare-table w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="rounded-tl-[18px] px-5 py-4 text-[var(--text2)]">Feature</th>
                  {plans.map((plan, i) => (
                    <th key={plan.name} className={`px-5 py-4 text-center text-white ${i === plans.length - 1 ? 'rounded-tr-[18px]' : ''}`}>
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparison.map((row) => (
                  <tr key={row[0]}>
                    <td className="px-5 py-4 text-[var(--text2)]">{row[0]}</td>
                    {row.slice(1).map((value, i) => (
                      <td key={`${row[0]}-${i}`} className="px-5 py-4 text-center">
                        <ValueCell value={value} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.section>

        <motion.section variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="mt-20">
          <motion.div variants={fadeUp} className="text-center">
            <h2 className="text-2xl font-semibold text-white sm:text-3xl">Trusted by 10,000+ teams</h2>
            <p className="mt-3 text-sm text-[var(--text2)]">From early-stage founders to revenue teams running global campaigns.</p>
          </motion.div>
          <motion.div variants={fadeUp} className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {logos.map((logo) => (
              <div key={logo} className="logo-pill rounded-2xl px-4 py-5 text-center text-sm font-semibold tracking-[0.18em] text-[var(--text3)]">
                {logo}
              </div>
            ))}
          </motion.div>
          <motion.div variants={fadeUp} className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              ['48M+', 'personalized messages generated'],
              ['6.4x', 'average campaign lift'],
              ['92%', 'less manual prospecting time'],
            ].map(([stat, label]) => (
              <div key={stat} className="trust-card rounded-[22px] p-5">
                <div className="text-3xl font-semibold text-white">{stat}</div>
                <div className="mt-2 text-sm text-[var(--text2)]">{label}</div>
              </div>
            ))}
          </motion.div>
        </motion.section>

        <motion.section variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="mx-auto mt-20 max-w-3xl">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-semibold text-white sm:text-3xl">Questions, answered</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((item, index) => (
              <FaqItem
                key={item[0]}
                item={item}
                open={openFaq === index}
                onClick={() => setOpenFaq(openFaq === index ? -1 : index)}
              />
            ))}
          </div>
        </motion.section>

        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="final-cta relative mt-20 overflow-hidden rounded-[28px] px-6 py-12 text-center sm:px-12 sm:py-16"
        >
          <motion.div
            className="absolute inset-0 opacity-60"
            animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
            style={{ backgroundImage: 'linear-gradient(120deg, rgba(109,95,255,.18), rgba(236,72,153,.12), rgba(34,211,160,.08))', backgroundSize: '220% 220%' }}
          />
          <div className="relative z-10 mx-auto max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              Start automating your outreach today
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[var(--text2)]">
              Turn prospects into conversations with AI-generated messaging, enrichment, and campaign intelligence.
            </p>
            <button type="button" className="cta-glow mt-8 inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-7 text-sm font-semibold text-white transition hover:bg-[var(--accent2)]">
              Get started
              <ArrowRight size={17} />
            </button>
          </div>
        </motion.section>
      </div>
    </main>
  )
}
