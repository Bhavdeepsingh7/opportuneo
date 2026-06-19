import { useMemo, useState } from 'react'
import { AlertCircle, ArrowRight, Sparkles, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { generateEmails } from '../../../lib/api'
import { useAuth } from '../../../context/AuthContext'
import { useAppState } from '../../../context/AppContext'
import { supabase } from '../../../lib/supabase'
import './Step3Configure.css'

const TONES = [
  { id: 'confident', label: 'Confident', desc: 'Direct, assertive, leads with your strongest qualification' },
  { id: 'warm', label: 'Warm', desc: 'Friendly and genuinely curious about their work' },
  { id: 'humble', label: 'Humble', desc: 'Eager to learn, positions you as growth-oriented' },
]

export default function Step3Configure({ data, setData, nextStep, prevStep }) {
  const { availableCredits, setAvailableCredits } = useAppState()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [consentConfirmed, setConsentConfirmed] = useState(false)

  const contactCount = Array.isArray(data.contacts) ? data.contacts.length : 0

  const canGenerate = useMemo(() => {
    const hasResume = !!(data.resumeData && Object.keys(data.resumeData).length)
    const hasContacts = contactCount > 0
    return hasResume && hasContacts && !loading && consentConfirmed
  }, [contactCount, data.resumeData, loading, consentConfirmed])

  const handleGenerate = async () => {
    setError('')
    
    if (availableCredits < contactCount) {
      setError(`Insufficient credits. You need ${contactCount} credits but have ${availableCredits}.`)
      toast.error('Insufficient credits')
      return
    }

    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await generateEmails({
        resume_data: data.resumeData,
        contacts: data.contacts,
        job_context: data.jobContext,
        tone: data.tone,
        consent_confirmed: true,
      }, session?.access_token)
      
      setData({ generatedEmails: res.data.emails })
      if (res.data.available_credits !== undefined) {
        setAvailableCredits(res.data.available_credits)
      }
      toast.success(`${res.data.emails?.length || 0} emails generated`)
      nextStep()
    } catch (err) {
      if (err.response?.status === 402) {
        setError('Insufficient credits. Please upgrade your plan.')
      } else {
        setError(err.response?.data?.detail || err.message || 'Generation failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="oa-step oa-step3 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[var(--text)]">Configure campaign</h2>
        <p className="mt-1 text-sm text-[var(--text2)]">
          Add target context and choose a tone. Then we’ll generate emails for each contact.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg3)] p-4 padding-5px">
          <div className="text-xs font-semibold text-[var(--text3)]">Resume</div>
          <div className="mt-1 text-sm font-semibold text-[var(--text)]">
            {data.resumeData?.name || '—'} · {data.resumeData?.current_title || '—'}
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg3)] p-4 padding-5px">
          <div className="text-xs font-semibold text-[var(--text3)]">Contacts</div>
          <div className="mt-1 text-sm font-semibold text-[var(--text)]">
            {contactCount} recipients
          </div>
        </div>
      </div>

      {availableCredits < contactCount && contactCount > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-[rgba(255,152,0,.2)] bg-[rgba(255,152,0,.05)] p-4">
          <Zap size={20} className="text-[#FF9800]" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-[#FF9800]">Credits required: {contactCount}</div>
            <div className="text-xs text-[var(--text3)]">You currently have {availableCredits} credits.</div>
          </div>
          <a 
            href="/app/subscription" 
            className="text-xs font-bold text-[#FF9800] underline hover:no-underline"
          >
            Upgrade
          </a>
        </div>
      )}

      <div className="space-y-2">
        <div className="text-xs font-semibold text-[var(--text2)]">Job context (optional)</div>
        <textarea
          className="min-h-[140px] w-full rounded-2xl border border-[var(--border)] bg-[var(--bg3)] p-4 text-sm text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-2 focus:ring-[var(--glow)]"
          value={data.jobContext}
          onChange={(e) => setData({ jobContext: e.target.value })}
          placeholder="Describe the role/company you’re targeting (industry, stage, team size, etc.)"
        />
        <div className="text-xs text-[var(--text3)]">
          The more specific you are, the more targeted each email will be.
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-xs font-semibold text-[var(--text2)]">Tone</div>
        <div className="grid gap-3 sm:grid-cols-3">
          {TONES.map((t) => {
            const active = data.tone === t.id
            return (
              <button
                key={t.id}
                className={[
                  'rounded-2xl border p-4 text-left transition',
                  active
                    ? 'border-[rgba(109,95,255,.35)] bg-[rgba(109,95,255,.10)]'
                    : 'border-[var(--border)] bg-[var(--bg3)] hover:border-[var(--border2)]',
                ].join(' ')}
                onClick={() => setData({ tone: t.id })}
              >
                <div className="text-sm font-semibold text-[var(--text)]">{t.label}</div>
                <div className="mt-1 text-xs text-[var(--text3)]">{t.desc}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Required Consent Checkbox */}
      <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg3)] p-3">
        <input
          id="generate-consent"
          type="checkbox"
          checked={consentConfirmed}
          onChange={(e) => setConsentConfirmed(e.target.checked)}
          className="h-4 w-4 rounded border-[var(--border2)] bg-[var(--bg2)] text-[var(--accent)] focus:ring-0 focus:ring-offset-0 cursor-pointer"
        />
        <label htmlFor="generate-consent" className="text-xs text-[var(--text2)] font-semibold select-none cursor-pointer">
          I confirm that all recipients have explicitly consented to receive communications from me.
        </label>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-[rgba(249,107,107,.25)] bg-[var(--red-bg)] px-4 py-3 text-sm text-[var(--red)]">
          <AlertCircle size={16} className="mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          className="inline-flex w-full items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg2)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--border2)] hover:bg-[var(--bg4)] disabled:opacity-50 sm:w-auto"
          onClick={prevStep}
          disabled={loading}
        >
          Back
        </button>
        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent2)] disabled:opacity-50 sm:w-auto"
          onClick={handleGenerate}
          disabled={!canGenerate}
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Generating…
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Generate {contactCount > 0 ? `${contactCount} ` : ''}emails
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
