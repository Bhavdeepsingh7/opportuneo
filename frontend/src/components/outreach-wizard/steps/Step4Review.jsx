import { useMemo, useState } from 'react'
import { AlertCircle, ArrowRight, ChevronDown, ChevronUp, Copy, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import './Step4Review.css'

export default function Step4Review({ data, setData, nextStep, prevStep }) {
  const emails = Array.isArray(data.generatedEmails) ? data.generatedEmails : []
  const [expanded, setExpanded] = useState(0)
  const [editing, setEditing] = useState({})

  const canContinue = emails.length > 0

  const getEmail = (idx) => ({ ...emails[idx], ...(editing[idx] || {}) })

  const editedCount = useMemo(() => Object.keys(editing).length, [editing])

  const handleEdit = (idx, field, value) => {
    setEditing((prev) => ({ ...prev, [idx]: { ...(prev[idx] || {}), [field]: value } }))
  }

  const handleSaveAll = () => {
    if (!editedCount) return
    const updated = emails.map((e, idx) => ({ ...e, ...(editing[idx] || {}) }))
    setData({ generatedEmails: updated })
    setEditing({})
    toast.success('Edits saved')
  }

  const handleCopy = async (idx) => {
    const e = getEmail(idx)
    await navigator.clipboard.writeText(`Subject: ${e.subject}\n\n${e.body}`)
    toast.success('Copied')
  }

  if (!emails.length) {
    return (
      <div className="oa-step oa-step4 space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text)]">Review emails</h2>
          <p className="mt-1 text-sm text-[var(--text2)]">
            Generate emails first — then you’ll be able to review and edit them here.
          </p>
        </div>
        <div className="flex items-start gap-2 rounded-xl border border-[rgba(245,166,35,.25)] bg-[var(--amber-bg)] px-4 py-3 text-sm text-[var(--amber)]">
          <AlertCircle size={16} className="mt-0.5" />
          <div>No emails generated yet.</div>
        </div>
        <button
          className="inline-flex w-full items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg2)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--border2)] hover:bg-[var(--bg4)] sm:w-auto"
          onClick={prevStep}
        >
          Back to Configure
        </button>
      </div>
    )
  }

  return (
    <div className="oa-step oa-step4 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text)]">Review emails</h2>
          <p className="mt-1 text-sm text-[var(--text2)]">
            Edit subject/body as needed. Your edits persist.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="text-xs font-semibold text-[var(--text2)]">
            {emails.length} emails · {editedCount ? `${editedCount} edited` : 'no edits'}
          </div>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg2)] px-3 py-2 text-xs font-semibold text-[var(--text)] transition hover:border-[var(--border2)] hover:bg-[var(--bg4)] disabled:opacity-50"
            onClick={handleSaveAll}
            disabled={!editedCount}
          >
            <Save size={14} /> Save edits
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {emails.map((_, idx) => {
          const e = getEmail(idx)
          const isOpen = expanded === idx
          const recipient = e.contact?.name || e.contact?.email || `Recipient ${idx + 1}`
          const subtitle = [e.contact?.title, e.contact?.company].filter(Boolean).join(' · ')

          return (
            <div key={idx} className="rounded-2xl border border-[var(--border)] bg-[var(--bg3)]">
              <button
                className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
                onClick={() => setExpanded(isOpen ? null : idx)}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-[var(--text)]">{recipient}</div>
                  <div className="truncate text-xs text-[var(--text3)]">{subtitle || e.contact?.email || ''}</div>
                  {!isOpen && <div className="mt-1 truncate text-xs text-[var(--text2)]">{e.subject}</div>}
                </div>
                <div className="shrink-0 text-[var(--text3)]">
                  {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </button>

              {isOpen && (
                <div className="space-y-3 border-t border-[var(--border)] px-4 py-4">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-[var(--text2)]">Subject</div>
                    <input
                      value={e.subject || ''}
                      onChange={(ev) => handleEdit(idx, 'subject', ev.target.value)}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg2)] px-3 py-2 text-sm text-[var(--text)]"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-[var(--text2)]">Body</div>
                    <textarea
                      value={e.body || ''}
                      onChange={(ev) => handleEdit(idx, 'body', ev.target.value)}
                      className="min-h-[180px] w-full rounded-xl border border-[var(--border)] bg-[var(--bg2)] px-3 py-2 text-sm text-[var(--text)]"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg2)] px-3 py-2 text-xs font-semibold text-[var(--text)] transition hover:border-[var(--border2)] hover:bg-[var(--bg4)]"
                      onClick={() => handleCopy(idx)}
                    >
                      <Copy size={14} /> Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          className="inline-flex w-full items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg2)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--border2)] hover:bg-[var(--bg4)] sm:w-auto"
          onClick={prevStep}
        >
          Back
        </button>
        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent2)] disabled:opacity-50 sm:w-auto"
          onClick={() => {
            if (editedCount) handleSaveAll()
            nextStep()
          }}
          disabled={!canContinue}
        >
          Continue <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}

