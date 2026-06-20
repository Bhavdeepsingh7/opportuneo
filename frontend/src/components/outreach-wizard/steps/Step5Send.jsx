/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, RefreshCw, Send, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { getGmailAuthUrl, getGmailTokens, sendEmails, verifyGmailToken } from '../../../lib/api'
import { supabase } from '../../../lib/supabase'
import './Step5Send.css'

export default function Step5Send({ data, setData, prevStep }) {
  const emails = Array.isArray(data.generatedEmails) ? data.generatedEmails : []
  const [fromName, setFromName] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [fetchingTokens, setFetchingTokens] = useState(false)
  const [sending, setSending] = useState(false)
  const [results, setResults] = useState(null)

  const [consentConfirmed, setConsentConfirmed] = useState(false)

  const canSend = useMemo(() => {
    return !!data.gmailTokens && emails.length > 0 && !sending && consentConfirmed
  }, [data.gmailTokens, emails.length, sending, consentConfirmed])

  // Handle Gmail OAuth callback (?gmail_connected=1&gmail_session=...&gmail_email=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const connected = params.get('gmail_connected')
    const gmailErr = params.get('gmail_error')
    const sessionId = params.get('gmail_session')
    const emailParam = params.get('gmail_email')

    if (gmailErr) {
      toast.error(`Gmail error: ${decodeURIComponent(gmailErr)}`)
      window.history.replaceState({}, '', window.location.pathname)
      return
    }

    if (connected && sessionId) {
      setFetchingTokens(true)
      getGmailTokens(sessionId)
        .then((res) => {
          setData({
            gmailTokens: res.data.tokens,
            gmailEmail: decodeURIComponent(emailParam || ''),
          })
          toast.success(`Gmail connected: ${decodeURIComponent(emailParam || '')}`)
        })
        .catch(() => toast.error('Failed to retrieve Gmail tokens — try again'))
        .finally(() => {
          setFetchingTokens(false)
          window.history.replaceState({}, '', window.location.pathname)
        })
    }
  }, [setData])

  const connectGmail = async () => {
    try {
      const res = await getGmailAuthUrl()
      window.location.href = res.data.url
    } catch {
      toast.error('Could not start Gmail OAuth')
    }
  }

  const verifyGmail = async () => {
    if (!data.gmailTokens) return
    setVerifying(true)
    try {
      const res = await verifyGmailToken(data.gmailTokens)
      if (res.data.valid) toast.success(`Gmail OK — ${res.data.email}`)
      else {
        setData({ gmailTokens: null, gmailEmail: '' })
        toast.error('Token expired — reconnect')
      }
    } catch {
      toast.error('Verification failed')
    } finally {
      setVerifying(false)
    }
  }

  const handleSend = async () => {
    if (!data.gmailTokens || !emails.length) return
    if (emails.length > 10) {
      toast.error("Maximum 10 recipients allowed per sending action.")
      return
    }
    if (!consentConfirmed) {
      toast.error("Consent confirmation is required.")
      return
    }
    setSending(true)
    try {
      const payload = emails.map((e) => ({
        to: e.contact.email,
        subject: e.subject,
        body: e.body,
        contact_name: e.contact.name,
      }))
      const { data: { session } } = await supabase.auth.getSession()
      const res = await sendEmails({
        token_data: data.gmailTokens,
        from_name: fromName || (data.gmailEmail ? data.gmailEmail.split('@')[0] : ''),
        from_email: data.gmailEmail,
        emails: payload,
        resume_file_path: data.resumeFilePath || null,
        consent_confirmed: true,
      }, session?.access_token)
      setResults([])
      toast.success(res.data.message || 'Campaign queued successfully')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Send failed — check Gmail connection')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="oa-step oa-step5 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[var(--text)]">Send emails</h2>
        <p className="mt-1 text-sm text-[var(--text2)]">
          Connect Gmail and send {emails.length} personalized emails from your own account.
        </p>
      </div>

      {!emails.length && (
        <div className="flex items-start gap-2 rounded-xl border border-[rgba(245,166,35,.25)] bg-[var(--amber-bg)] px-4 py-3 text-sm text-[var(--amber)]">
          <AlertCircle size={16} className="mt-0.5" />
          <div>No emails to send. Go back and generate/review first.</div>
        </div>
      )}

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg3)] p-5 flex flex-col gap-3">
        <div className="text-sm font-semibold text-[var(--text)]">Gmail account</div>
        <div className="mt-1 text-xs text-[var(--text3)]">
          Emails are sent from your Gmail via OAuth. Your password is never shared.
        </div>

        <div className="mt-4">
          {fetchingTokens ? (
            <div className="flex items-center gap-2 text-sm text-[var(--text2)]">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
              Retrieving Gmail tokens…
            </div>
          ) : !data.gmailTokens ? (
            <button
              className="inline-flex w-full items-center justify-center rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent2)] disabled:opacity-50 sm:w-auto"
              onClick={connectGmail}
              disabled={!emails.length}
              title={!emails.length ? 'Generate emails first' : 'Connect Gmail'}
            >
              Connect Gmail
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-[var(--green-bg)] px-3 py-1 text-xs font-semibold text-[var(--green)] ring-1 ring-[rgba(34,211,160,.25)]">
                <CheckCircle2 size={14} /> {data.gmailEmail || 'Connected'}
              </span>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg2)] px-3 py-2 text-xs font-semibold text-[var(--text)] transition hover:border-[var(--border2)] hover:bg-[var(--bg4)] disabled:opacity-50"
                onClick={verifyGmail}
                disabled={verifying}
              >
                {verifying ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/80" /> : <RefreshCw size={14} />}
                Verify
              </button>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[rgba(249,107,107,.25)] bg-[var(--red-bg)] px-3 py-2 text-xs font-semibold text-[var(--red)] transition hover:bg-[rgba(249,107,107,.12)]"
                onClick={() => setData({ gmailTokens: null, gmailEmail: '' })}
              >
                <XCircle size={14} /> Disconnect
              </button>
            </div>
          )}
        </div>
      </div>

      {data.gmailTokens && !results && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg3)] p-5">
          <div className="text-xs font-semibold text-[var(--text2)]">Your display name (optional)</div>
          <input
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg2)] px-3 py-2 text-sm text-[var(--text)]"
            placeholder={data.gmailEmail ? data.gmailEmail.split('@')[0] : 'Your name'}
            value={fromName}
            onChange={(e) => setFromName(e.target.value)}
          />
          <div className="mt-1 text-xs text-[var(--text3)]">Shown as the “From” name.</div>
        </div>
      )}

      {!results ? (
        <div className="space-y-4">
          {/* Sending limits notice */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg3)] p-3 text-xs text-[var(--text3)]">
            Sending limits help maintain compliance and sender reputation. Maximum 10 recipients per action, and 100 emails per user daily.
          </div>

          {/* Required Consent Checkbox */}
          <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg3)] p-3">
            <input
              id="send-consent"
              type="checkbox"
              checked={consentConfirmed}
              onChange={(e) => setConsentConfirmed(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--border2)] bg-[var(--bg2)] text-[var(--accent)] focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <label htmlFor="send-consent" className="text-xs text-[var(--text2)] font-semibold select-none cursor-pointer">
              I confirm that all recipients have explicitly consented to receive communications from me.
            </label>
          </div>

          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent2)] disabled:opacity-50"
            onClick={handleSend}
            disabled={!canSend}
            title={!data.gmailTokens ? 'Connect Gmail first' : emails.length ? '' : 'No emails to send'}
          >
            {sending ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Sending {emails.length} emails…
              </>
            ) : (
              <>
                <Send size={16} /> Send {emails.length} emails now
              </>
            )}
          </button>
          <button
            className="inline-flex w-full items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg2)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--border2)] hover:bg-[var(--bg4)] sm:w-auto"
            onClick={prevStep}
          >
            Back
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="oa-results rounded-2xl border border-[var(--border)] bg-[var(--bg3)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">Campaign queued successfully</div>
            {!!results.length && <div className="mt-3 space-y-2">
              {results.map((r, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg2)] px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[var(--text)]">{r.email}</div>
                    {r.error && <div className="text-xs text-[var(--red)]">{r.error}</div>}
                    {r.message_id && <div className="text-xs text-[var(--text3)]">ID: {r.message_id}</div>}
                  </div>
                  <div className="shrink-0 text-sm">{r.success ? '✅' : '❌'}</div>
                </div>
              ))}
            </div>}
          </div>
          <div className="text-xs text-[var(--text3)]">
            You can start a new campaign from the app menu (or refresh and use “Start over”).
          </div>
        </div>
      )}
    </div>
  )
}
