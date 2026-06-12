import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Coins, MailCheck, ShieldCheck, Sparkles, UploadCloud } from 'lucide-react'
import logo from '../assets/logo.png'
import Footer from '../components/Footer'
import heroImage from '../assets/hero.png'
import './LandingPage.css'

const features = [
  {
    icon: UploadCloud,
    title: 'Resume-aware personalization',
    copy: 'Upload your resume and add job context so every email reflects your skills, target role, and intent.',
  },
  {
    icon: MailCheck,
    title: 'Recruiter-ready outreach',
    copy: 'Generate clear, concise emails for recruiters, hiring managers, founders, and referral contacts.',
  },
  {
    icon: Coins,
    title: 'Simple email credits',
    copy: 'Starter, Pro, and Agency plans include monthly credits. Extra credits cost Rs 1 including GST.',
  },
]

const steps = [
  'Upload your resume',
  'Import recruiter or company contacts',
  'Add the role and job context',
  'Generate and send personalized outreach',
]

const plans = [
  ['Starter', 'Rs 499/mo', '1,000 email credits'],
  ['Pro', 'Rs 1,499/mo', '5,000 email credits'],
  ['Agency', 'Rs 3,999/mo', '20,000 email credits'],
]

export default function LandingPage() {
  return (
    <main className="landing-page">
      <header className="landing-nav">
        <Link to="/" className="landing-brand" aria-label="Opportuneo home">
          <img src={logo} alt="" style={{ height: '32px' }} />
          <strong>opportuneo</strong>
        </Link>
        <nav aria-label="Primary navigation">
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <Link to="/auth">Login</Link>
          <Link to="/auth?mode=signup" className="landing-nav-cta">Sign up</Link>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="landing-hero__content">
          <div className="landing-eyebrow">
            <Sparkles size={14} />
            AI job outreach workspace
          </div>
          <h1>Turn job opportunities into warm conversations.</h1>
          <p>
            Opportuneo helps job seekers, career coaches, and placement teams generate resume-aware outreach emails for recruiters, hiring managers, and referral contacts.
          </p>
          <div className="landing-actions">
            <Link to="/auth?mode=signup" className="landing-button landing-button--primary">
              Start free
              <ArrowRight size={17} />
            </Link>
            <Link to="/auth" className="landing-button landing-button--secondary">
              Login
            </Link>
          </div>
        </div>

        <div className="landing-visual" aria-label="Opportuneo product preview">
          <img src={heroImage} alt="" />
          <div className="landing-preview">
            <div className="landing-preview__top">
              <span>Campaign</span>
              <strong>Frontend roles</strong>
            </div>
            <div className="landing-preview__message">
              <span>To: hiring.manager@company.com</span>
              <p>Your React work, portfolio, and role context are ready for a concise outreach draft.</p>
            </div>
            <div className="landing-preview__meter">
              <span>Credits available</span>
              <strong>5,000</strong>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="landing-section">
        <div className="landing-section__heading">
          <h2>Everything you need for focused job outreach.</h2>
          <p>Replace generic cold emails with targeted messages built from your profile, contacts, and goals.</p>
        </div>
        <div className="landing-feature-grid">
          {features.map((feature) => {
            const FeatureIcon = feature.icon

            return (
              <article key={feature.title} className="landing-feature">
                <span><FeatureIcon size={20} /></span>
                <h3>{feature.title}</h3>
                <p>{feature.copy}</p>
            </article>
            )
          })}
        </div>
      </section>

      <section className="landing-workflow">
        <div>
          <h2>From resume to outreach in minutes.</h2>
          <p>Opportuneo keeps the workflow practical: bring your resume, contacts, and job target, then review the generated emails before sending.</p>
        </div>
        <ol>
          {steps.map((step) => (
            <li key={step}>
              <CheckCircle2 size={18} />
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section id="pricing" className="landing-section">
        <div className="landing-section__heading">
          <h2>Simple pricing for every outreach volume.</h2>
          <p>All prices include GST. Buy extra credits anytime with a minimum purchase of 50 credits.</p>
        </div>
        <div className="landing-plan-grid">
          {plans.map(([name, price, credits]) => (
            <article key={name} className="landing-plan">
              <h3>{name}</h3>
              <strong>{price}</strong>
              <p>{credits}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-cta">
        <ShieldCheck size={22} />
        <h2>Build a better job search pipeline today.</h2>
        <p>Secure signup, GST-inclusive checkout, and instant plan activation after successful payment.</p>
        <Link to="/auth?mode=signup" className="landing-button landing-button--primary">
          Create your account
          <ArrowRight size={17} />
        </Link>
      </section>

      <Footer />
    </main>
  )
}
