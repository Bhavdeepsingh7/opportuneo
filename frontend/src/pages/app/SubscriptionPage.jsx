import { useState } from 'react'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  Coins,
  Minus,
  Sparkles,
  X,
  Zap,
} from 'lucide-react'
import { formatCurrency } from '../../lib/pricing'
import './SubscriptionPage.css'

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    monthly: 499,
    messageLimit: 1000,
    description: 'For individual job seekers sending focused recruiter and hiring manager outreach.',
    cta: 'Start Starter',
    features: [
      '1,000 email credits per month',
      'AI-personalized job outreach emails',
      'Resume-aware message generation',
      'CSV contact upload',
      'Gmail sending workflow',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthly: 1499,
    messageLimit: 5000,
    description: 'For active job seekers running larger outreach campaigns across roles and companies.',
    cta: 'Start Pro',
    featured: true,
    features: [
      '5,000 email credits per month',
      'Advanced recruiter personalization',
      'Multiple job-context campaigns',
      'Follow-up sequence support',
      'Priority email support',
      'Campaign analytics',
    ],
  },
  {
    id: 'agency',
    name: 'Agency',
    monthly: 3999,
    messageLimit: 20000,
    description: 'For resume writers, career coaches, and placement teams handling outreach for many candidates.',
    cta: 'Start Agency',
    features: [
      '20,000 email credits per month',
      'Candidate-wise campaign organization',
      'Bulk personalization workflow',
      'Reusable outreach templates',
      'Priority support',
      'High-volume job outreach analytics',
    ],
  },
]

const comparison = [
  ['Monthly email credits', '1,000', '5,000', '20,000'],
  ['Resume-aware email generation', true, true, true],
  ['CSV contact upload', true, true, true],
  ['Gmail sending workflow', true, true, true],
  ['Multiple job-context campaigns', false, true, true],
  ['Follow-up sequence support', false, true, true],
  ['Candidate-wise organization', false, false, true],
  ['Priority support', false, true, true],
]

const faqs = [
  ['Can I cancel anytime?', 'Yes. You can cancel or change your plan anytime from billing settings. Your remaining monthly credits stay available until the billing cycle ends.'],
  ['Can I buy extra email credits?', 'Yes. Extra credits cost Rs 1 per credit including GST, with a minimum purchase of 50 credits.'],
  ['What counts as one credit?', 'One generated or sent job outreach email uses one email credit.'],
  ['Can I upgrade later?', 'Absolutely. Upgrades are instant, and your campaigns, contacts, and job-context settings move with you.'],
]

const outcomes = ['Recruiters', 'Hiring Managers', 'Founders', 'Talent Teams', 'Referrals']

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
}

function PlanCard({ plan, index }) {
  const navigate = useNavigate()
  const price = formatCurrency(plan.monthly)

  const startCheckout = () => {
    navigate('/app/checkout', {
      state: {
        plan: {
          id: plan.id,
          name: plan.name,
          description: plan.description,
          monthlyPrice: plan.monthly,
          features: plan.features,
          messageLimit: plan.messageLimit,
        },
      },
    })
  }

  return (
    <Motion.article
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
          <span className="pb-2 text-sm font-medium text-[var(--text3)]">/month</span>
        </div>

        <button
          type="button"
          onClick={startCheckout}
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
    </Motion.article>
  )
}

function CustomCreditsCard() {
  const [credits, setCredits] = useState(50)
  const navigate = useNavigate()
  const normalizedCredits = Math.max(50, Number.isFinite(credits) ? credits : 50)
  const total = normalizedCredits

  const buyCredits = () => {
    navigate('/app/checkout', {
      state: {
        plan: {
          id: `custom-credits-${normalizedCredits}`,
          name: 'Custom email credits',
          description: `${normalizedCredits.toLocaleString('en-IN')} extra job outreach email credits at Rs 1 per credit including GST.`,
          monthlyPrice: total,
          features: [
            `${normalizedCredits.toLocaleString('en-IN')} extra email credits`,
            'Rs 1 per credit including GST',
            'Credits added after successful payment',
            'Use for job outreach email generation and sending',
          ],
          messageLimit: normalizedCredits,
        },
      },
    })
  }

  return (
    <Motion.section variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="mt-10">
      <div className="custom-credits-panel rounded-[24px] p-6 sm:p-7">
        <div className="custom-credits-copy">
          <div className="pricing-eyebrow inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-[var(--green)]">
            <Coins size={14} />
            Extra credits
          </div>
          <h2 className="mt-5 text-2xl font-semibold text-white sm:text-3xl">Buy custom email credits</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--text2)]">
            Need more job outreach volume this month? Buy extra credits anytime. Each credit costs Rs 1 including GST.
          </p>
        </div>

        <div className="custom-credits-action">
          <label htmlFor="custom-credit-count" className="form-label">Credits</label>
          <input
            id="custom-credit-count"
            type="number"
            min="50"
            step="1"
            value={credits}
            onChange={(event) => setCredits(Number(event.target.value))}
            onBlur={() => setCredits(normalizedCredits)}
            aria-describedby="custom-credit-help"
          />
          <p id="custom-credit-help" className="form-hint">Minimum purchase is 50 credits.</p>
          <div className="custom-credits-total">
            <span>Total including GST</span>
            <strong>{formatCurrency(total)}</strong>
          </div>
          <button type="button" className="cta-glow custom-credits-button" onClick={buyCredits}>
            Buy credits
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </Motion.section>
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
          <Motion.div
            className="faq-answer px-5"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
          >
            <p className="pb-5 text-sm leading-6 text-[var(--text2)]">{item[1]}</p>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function SubscriptionPage() {
  const [openFaq, setOpenFaq] = useState(0)

  return (
    <main className="pricing-page">
      <Motion.div
        className="pricing-bg-glow one"
        animate={{ scale: [1, 1.08, 1], opacity: [.55, .8, .55] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <Motion.div
        className="pricing-bg-glow two"
        animate={{ scale: [1.04, 1, 1.04], opacity: [.45, .7, .45] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="pricing-shell">
        <Motion.section
          variants={stagger}
          initial="hidden"
          animate="show"
          className="mx-auto max-w-4xl text-center"
        >
          <Motion.div variants={fadeUp} className="pricing-eyebrow mx-auto inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-[var(--accent3)]">
            <Sparkles size={14} />
            AI-native job outreach
          </Motion.div>
          <Motion.h1 variants={fadeUp} className="mt-7 text-4xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
            Land More Interviews with Smarter Outreach
          </Motion.h1>
          <Motion.p variants={fadeUp} className="mx-auto mt-6 max-w-2xl text-base leading-8 text-[var(--text2)] sm:text-lg">
            Generate resume-aware emails, reach recruiters faster, and manage job outreach credits from one focused workspace.
          </Motion.p>
          <Motion.div variants={fadeUp} className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <span className="save-badge rounded-full px-4 py-2 text-xs font-semibold text-[var(--green)]">
              All prices include GST
            </span>
          </Motion.div>
        </Motion.section>

        <CustomCreditsCard />

        <Motion.section
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="mt-16 grid gap-5 lg:grid-cols-3"
        >
          {plans.map((plan, index) => (
            <PlanCard key={plan.name} plan={plan} index={index} />
          ))}
        </Motion.section>

        <Motion.section variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.18 }} className="mt-20">
          <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-2xl font-semibold text-white sm:text-3xl">Compare job outreach plans</h2>
              <p className="mt-2 text-sm text-[var(--text2)]">Choose the email credit volume that matches your search.</p>
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
        </Motion.section>

        <Motion.section variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="mt-20">
          <Motion.div variants={fadeUp} className="text-center">
            <h2 className="text-2xl font-semibold text-white sm:text-3xl">Built for modern job search outreach</h2>
            <p className="mt-3 text-sm text-[var(--text2)]">Reach the people who can actually move your application forward.</p>
          </Motion.div>
          <Motion.div variants={fadeUp} className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {outcomes.map((outcome) => (
              <div key={outcome} className="logo-pill rounded-2xl px-4 py-5 text-center text-sm font-semibold text-[var(--text3)]">
                {outcome}
              </div>
            ))}
          </Motion.div>
          <Motion.div variants={fadeUp} className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              ['1 credit', 'per generated or sent email'],
              ['Rs 1', 'per extra credit including GST'],
              ['50', 'minimum custom credit purchase'],
            ].map(([stat, label]) => (
              <div key={stat} className="trust-card rounded-[22px] p-5">
                <div className="text-3xl font-semibold text-white">{stat}</div>
                <div className="mt-2 text-sm text-[var(--text2)]">{label}</div>
              </div>
            ))}
          </Motion.div>
        </Motion.section>

        <Motion.section variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="mx-auto mt-20 max-w-3xl">
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
        </Motion.section>

        <Motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="final-cta relative mt-20 overflow-hidden rounded-[28px] px-6 py-12 text-center sm:px-12 sm:py-16"
        >
          <Motion.div
            className="absolute inset-0 opacity-60"
            animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
            style={{ backgroundImage: 'linear-gradient(120deg, rgba(109,95,255,.18), rgba(236,72,153,.12), rgba(34,211,160,.08))', backgroundSize: '220% 220%' }}
          />
          <div className="relative z-10 mx-auto max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              Start your next job outreach campaign
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[var(--text2)]">
              Upload contacts, add your job context, and send personalized emails that sound like you.
            </p>
            <button type="button" className="cta-glow mt-8 inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-7 text-sm font-semibold text-white transition hover:bg-[var(--accent2)]">
              Get started
              <ArrowRight size={17} />
            </button>
          </div>
        </Motion.section>
      </div>
    </main>
  )
}
