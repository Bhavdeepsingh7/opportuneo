import { Check } from 'lucide-react'

const STEPS = [
  { n: 1, label: 'Resume' },
  { n: 2, label: 'Contacts' },
  { n: 3, label: 'Settings' },
  { n: 4, label: 'Review' },
  { n: 5, label: 'Send' },
]

export default function WizardSteps({ current }) {
  return (
    <div className="steps-nav" style={{ flexWrap: 'wrap', gap: 0 }}>
      {STEPS.map((step, i) => {
        const isDone = step.n < current
        const isActive = step.n === current
        return (
          <div key={step.n} style={{ display: 'flex', alignItems: 'center' }}>
            <div className={`step-item ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}>
              <div className="step-dot">
                {isDone ? <Check size={12} /> : step.n}
              </div>
              <span className="step-label-text" style={{ display: 'none' }}>{step.label}</span>
              <span className="step-label-visible">{step.label}</span>
            </div>
            {i < STEPS.length - 1 && <div className="step-line" />}
          </div>
        )
      })}
    </div>
  )
}
