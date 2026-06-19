import { useCallback, useMemo, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { AlertCircle, ArrowRight, FileSpreadsheet, Trash2, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { parseContacts } from '../../../lib/api'
import { supabase } from '../../../lib/supabase'
import './Step2Contacts.css'

export default function Step2Contacts({ data, setData, nextStep, prevStep }) {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [consentConfirmed, setConsentConfirmed] = useState(false)

  const contacts = useMemo(() => (Array.isArray(data.contacts) ? data.contacts : []), [data.contacts])

  const onDrop = useCallback((accepted) => {
    if (accepted?.[0]) {
      setFile(accepted[0])
      setError('')
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'application/pdf': ['.pdf'], 'text/plain': ['.txt'] },
    maxFiles: 1,
  })

  const canContinue = contacts.length > 0

  const handleParse = async () => {
    if (!file) return
    setError('')
    if (!consentConfirmed) {
      setError('You must confirm that these contacts have opted in to receive communications.')
      toast.error('Consent confirmation required')
      return
    }
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const fd = new FormData()
      fd.append('file', file)
      fd.append('consent_confirmed', 'true')
      const { data: res } = await parseContacts(fd, session?.access_token)
      setData({ contacts: res.contacts })
      toast.success(`${res.count || res.contacts?.length || 0} contacts loaded`)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to parse contacts')
    } finally {
      setLoading(false)
    }
  }

  const removeContact = (idx) => {
    const updated = contacts.filter((_, i) => i !== idx)
    setData({ contacts: updated })
  }

  const summary = useMemo(() => {
    if (!contacts.length) return null
    const companies = new Set(contacts.map((c) => c.company).filter(Boolean))
    return { companies: companies.size }
  }, [contacts])

  return (
    <div className="oa-step oa-step2 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[var(--text)]">Upload contacts</h2>
        <p className="mt-1 text-sm text-[var(--text2)]">
          Import a CSV (name, email, company, title) or upload a PDF contact sheet.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg3)] p-4">
        <div className="text-xs font-semibold text-[var(--text2)] padding-5px">CSV format</div>
        <div className="mt-1 text-sm text-[var(--text3)] padding-5px">
          Columns: <span className="text-[var(--text2)]">name</span>, <span className="text-[var(--text2)]">email</span>,{' '}
          <span className="text-[var(--text2)]">company</span>, <span className="text-[var(--text2)]">title</span>
        </div>
      </div>

      <div
        {...getRootProps()}
        className={[
          'dropzone',
          'rounded-2xl border border-dashed p-8 text-center transition',
          'border-[var(--border2)] bg-[var(--bg3)]',
          isDragActive ? 'border-[var(--accent)] bg-[rgba(109,95,255,.08)]' : '',
        ].join(' ')}
      >
        <input {...getInputProps()} />
        <div className="space-y-2">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--bg2)] ring-1 ring-[var(--border)]">
            <FileSpreadsheet size={18} className="text-[var(--accent3)]" />
          </div>
          <div className="text-sm font-semibold text-[var(--text)]">
            {file ? file.name : isDragActive ? 'Drop it here' : 'Drag & drop your contacts file'}
          </div>
          <div className="text-xs text-[var(--text3)]">CSV or PDF — click to browse</div>
        </div>
      </div>

      {/* Required Consent Checkbox */}
      <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg3)] p-3">
        <input
          id="upload-consent"
          type="checkbox"
          checked={consentConfirmed}
          onChange={(e) => setConsentConfirmed(e.target.checked)}
          className="h-4 w-4 rounded border-[var(--border2)] bg-[var(--bg2)] text-[var(--accent)] focus:ring-0 focus:ring-offset-0 cursor-pointer"
        />
        <label htmlFor="upload-consent" className="text-xs text-[var(--text2)] font-semibold select-none cursor-pointer">
          I confirm these contacts have opted in to receive communications.
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
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg2)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--border2)] hover:bg-[var(--bg4)] disabled:opacity-50 sm:w-auto"
          onClick={handleParse}
          disabled={!file || loading}
        >
          {loading ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/80" /> Importing…</> : <><Users size={16} /> Import contacts</>}
        </button>

        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent2)] disabled:opacity-50 sm:w-auto"
          onClick={nextStep}
          disabled={!canContinue}
          title={!canContinue ? 'Import at least one contact to continue' : 'Continue'}
        >
          Continue <ArrowRight size={16} />
        </button>
      </div>

      {contacts.length > 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg3)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[var(--text)]">{contacts.length} contacts ready</div>
              <div className="text-xs text-[var(--text3)]">
                {summary ? `${summary.companies} companies` : '—'}
              </div>
            </div>
            <button
              className="text-xs font-semibold text-[var(--text3)] hover:text-[var(--text)]"
              onClick={prevStep}
              type="button"
            >
              Edit previous step
            </button>
          </div>

          <div className="mt-3 divide-y divide-[var(--border)]">
            {contacts.slice(0, 12).map((c, i) => (
              <div key={`${c.email || i}-${i}`} className="oa-contact-row flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-[var(--text)]">{c.name || '—'}</div>
                  <div className="truncate text-xs text-[var(--text3)]">
                    {c.email || '—'} · {c.title || '—'} · {c.company || '—'}
                  </div>
                </div>
                <button
                  className="rounded-lg p-2 text-[var(--text3)] hover:bg-[var(--bg2)] hover:text-[var(--text)]"
                  onClick={() => removeContact(i)}
                  title="Remove contact"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          {contacts.length > 12 && (
            <div className="mt-2 text-xs text-[var(--text3)]">
              Showing 12 of {contacts.length}. You can review the full list later.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
