import { useMemo, useState } from 'react'
import { Check, ShieldAlert } from 'lucide-react'
import { useAppState } from '../../context/AppContext'

import Step1Resume from './steps/Step1Resume'
import Step2Contacts from './steps/Step2Contacts'
import Step3Configure from './steps/Step3Configure'
import Step4Review from './steps/Step4Review'
import Step5Send from './steps/Step5Send'
import "./OutreachWizard.css"


const STEPS = [
  'Upload Background',
  'Upload Contacts',
  'Configure Campaign',
  'Review Emails',
  'Send Emails',
]

function clampStep(n) {
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(4, n))
}

export default function OutreachWizard() {
  const app = useAppState()

  const [currentStep, setCurrentStep] = useState(0)
  const [transitionKey, setTransitionKey] = useState(0)

  const data = useMemo(() => {
    return {
      resumeData: app.resumeData,
      resumeRaw: app.resumeRaw,
      resumeFilePath: app.resumeFilePath,
      contacts: app.contacts,
      generatedEmails: app.generatedEmails,
      jobContext: app.jobContext,
      tone: app.tone,
      gmailTokens: app.gmailTokens,
      gmailEmail: app.gmailEmail,
    }
  }, [
    app.resumeData,
    app.resumeRaw,
    app.resumeFilePath,
    app.contacts,
    app.generatedEmails,
    app.jobContext,
    app.tone,
    app.gmailTokens,
    app.gmailEmail,
  ])

  const setData = (updater) => {
    const next = typeof updater === 'function' ? updater(data) : updater
    if (next.resumeData !== undefined) app.setResumeData(next.resumeData)
    if (next.resumeRaw !== undefined) app.setResumeRaw(next.resumeRaw)
    if (next.resumeFilePath !== undefined) app.setResumeFilePath(next.resumeFilePath)
    if (next.contacts !== undefined) app.setContacts(next.contacts)
    if (next.generatedEmails !== undefined) app.setGeneratedEmails(next.generatedEmails)
    if (next.jobContext !== undefined) app.setJobContext(next.jobContext)
    if (next.tone !== undefined) app.setTone(next.tone)
    if (next.gmailTokens !== undefined) app.setGmailTokens(next.gmailTokens)
    if (next.gmailEmail !== undefined) app.setGmailEmail(next.gmailEmail)
  }

  const maxAllowedStep = useMemo(() => {
    const hasResume = !!(data.resumeData && Object.keys(data.resumeData).length)
    const hasContacts = Array.isArray(data.contacts) && data.contacts.length > 0
    const hasEmails = Array.isArray(data.generatedEmails) && data.generatedEmails.length > 0

    if (!hasResume) return 0
    if (!hasContacts) return 1
    if (!hasEmails) return 2
    return 4
  }, [data.contacts, data.generatedEmails, data.resumeData])

  const safeCurrentStep = clampStep(Math.min(currentStep, maxAllowedStep))

  const completedCount = useMemo(() => {
    const hasResume = !!(data.resumeData && Object.keys(data.resumeData).length)
    const hasContacts = Array.isArray(data.contacts) && data.contacts.length > 0
    const hasEmails = Array.isArray(data.generatedEmails) && data.generatedEmails.length > 0
    const hasSent = false
    return [hasResume, hasContacts, hasEmails, hasEmails, hasSent].filter(Boolean).length
  }, [data.contacts, data.generatedEmails, data.resumeData])

  const progressPct = Math.round((Math.max(completedCount, safeCurrentStep) / 5) * 100)

  const goToStep = (next) => {
    const allowed = clampStep(Math.min(next, maxAllowedStep))
    setCurrentStep(allowed)
    setTransitionKey((k) => k + 1)
  }

  const prevStep = () => goToStep(safeCurrentStep - 1)
  const nextStep = () => goToStep(safeCurrentStep + 1)

  const canGoBack = safeCurrentStep > 0

  const Step = useMemo(() => {
    switch (safeCurrentStep) {
      case 0:
        return Step1Resume
      case 1:
        return Step2Contacts
      case 2:
        return Step3Configure
      case 3:
        return Step4Review
      case 4:
        return Step5Send
      default:
        return Step1Resume
    }
  }, [safeCurrentStep])

  return (
    <div className="oa-wizard w-full py-10">
      <div className="oa-wizard-shell mx-auto w-full max-w-5xl px-6">
        {/* Compliance Banner */}
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[rgba(109,95,255,.25)] bg-[rgba(109,95,255,.05)] px-4 py-3.5 text-xs text-[var(--text2)] shadow-sm">
          <ShieldAlert size={16} className="text-[var(--accent)] shrink-0 mt-0.5" />
          <div>
            <strong className="text-[var(--text)]">Compliance Notice:</strong> Opportuneo may only be used to communicate with recipients who have explicitly consented to receive emails. Unsolicited commercial email is prohibited.
          </div>
        </div>

        <div className="oa-wizard-header mb-6 flex flex-col gap-2">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
                Email campaign assistant
              </h1>
              <p className="text-sm text-[var(--text2)]">
                Complete each step in order — we’ll carry your data through the flow.
              </p>
            </div>
            <div className="oa-progress flex flex-col items-end gap-2">
              <div className="text-xs font-semibold text-[var(--text2)]">
                Progress: <span className="text-[var(--text)]">{progressPct}%</span>
              </div>
              <div className="h-2 w-44 overflow-hidden rounded-full bg-[var(--bg4)] ring-1 ring-[var(--border)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent3)] transition-[width] duration-500 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Stepper */}
          <div className="oa-stepper mt-4 rounded-2xl border border-[var(--border)] bg-[var(--bg2)] px-4 py-3">
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {STEPS.map((label, idx) => {
                const isDone = idx < safeCurrentStep
                const isActive = idx === safeCurrentStep
                const isLocked = idx > maxAllowedStep
                return (
                  <div key={label} className="oa-stepper-wrap flex items-center">
                    <div
                      className={[
                        'oa-stepper-item',
                        'flex items-center gap-2 rounded-xl px-3 py-2',
                        isActive ? 'bg-[var(--glow2)] ring-1 ring-[rgba(109,95,255,.25)]' : '',
                        isDone ? 'text-[var(--green)]' : isLocked ? 'text-[var(--text3)]' : 'text-[var(--text2)]',
                      ].join(' ')}
                      aria-disabled={isLocked}
                    >
                      <div
                        className={[
                          'oa-stepper-dot',
                          'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ring-1',
                          isActive
                            ? 'bg-[var(--accent)] text-white ring-[var(--accent)]'
                            : isDone
                              ? 'bg-[var(--green-bg)] text-[var(--green)] ring-[rgba(34,211,160,.35)]'
                              : 'bg-[var(--bg)] text-[var(--text2)] ring-[var(--border2)]',
                        ].join(' ')}
                      >
                        {isDone ? <Check size={14} /> : idx + 1}
                      </div>
                      <div className="oa-stepper-label whitespace-nowrap text-sm font-semibold">
                        {label}
                      </div>
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div className="oa-stepper-connector mx-2 h-px w-10 bg-[var(--border)]" />
                    )}
                  </div>
                )
              })}
            </div>
            <div className="mt-2 text-xs text-[var(--text3)] pl-2.5" >
              Step {safeCurrentStep + 1} of 5
            </div>
          </div>
        </div>

        {/* Single-step stage */}
        <div className="relative">
          <div
            key={transitionKey}
            className="oa-step-stage rounded-2xl border border-[var(--border)] bg-[var(--bg2)] p-6 shadow-[0_20px_80px_rgba(0,0,0,.35)] animate-[wizardIn_.22s_ease-out]"
          >
            <Step data={data} setData={setData} nextStep={nextStep} prevStep={prevStep} />
          </div>
        </div>

        {/* Bottom nav */}
        <div className="oa-wizard-nav mt-5 flex items-center justify-between gap-3">
          <button
            className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg3)] px-4 py-2 text-sm font-semibold text-[var(--text2)] transition hover:border-[var(--border2)] hover:bg-[var(--bg4)] disabled:opacity-50"
            onClick={prevStep}
            disabled={!canGoBack}
          >
            Back
          </button>
          <button
            className="inline-flex items-center justify-center rounded-xl bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent2)] disabled:opacity-50"
            onClick={nextStep}
            disabled={safeCurrentStep >= maxAllowedStep}
            title={safeCurrentStep >= maxAllowedStep ? 'Complete the current step to continue' : 'Continue'}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
