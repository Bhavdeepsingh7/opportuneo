import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '../../context/AppContext'
import { sendEmails, getGmailAuthUrl, getGmailTokens, verifyGmailToken } from '../../lib/api'
import { Mail, Send, CheckCircle2, XCircle, RefreshCw, RotateCcw, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import './pages.css'

export default function SendPage() {
  const { generatedEmails, gmailTokens, gmailEmail, setGmailTokens, setGmailEmail, resetWizard } = useAppState()
  const navigate = useNavigate()

  const [sending, setSending] = useState(false)
  const [results, setResults] = useState(null)
  const [fromName, setFromName] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [fetchingTokens, setFetchingTokens] = useState(false)

  // Handle Gmail OAuth callback (backend redirects here with ?gmail_session=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const connected  = params.get('gmail_connected')
    const gmailErr   = params.get('gmail_error')
    const sessionId  = params.get('gmail_session')
    const emailParam = params.get('gmail_email')

    if (gmailErr) {
      toast.error(`Gmail error: ${decodeURIComponent(gmailErr)}`)
      window.history.replaceState({}, '', window.location.pathname)
      return
    }

    if (connected && sessionId) {
      setFetchingTokens(true)
      getGmailTokens(sessionId)
        .then(res => {
          setGmailTokens(res.data.tokens)
          setGmailEmail(decodeURIComponent(emailParam || ''))
          toast.success(`Gmail connected: ${decodeURIComponent(emailParam || '')}`)
        })
        .catch(() => toast.error('Failed to retrieve Gmail tokens — try again'))
        .finally(() => {
          setFetchingTokens(false)
          window.history.replaceState({}, '', window.location.pathname)
        })
    }
  }, [])

  const connectGmail = async () => {
    try {
      const res = await getGmailAuthUrl()
      window.location.href = res.data.url
    } catch { toast.error('Could not start Gmail OAuth') }
  }

  const verifyGmail = async () => {
    setVerifying(true)
    try {
      const res = await verifyGmailToken(gmailTokens)
      if (res.data.valid) toast.success(`Gmail OK — ${res.data.email}`)
      else { setGmailTokens(null); setGmailEmail(''); toast.error('Token expired — reconnect') }
    } catch { toast.error('Verification failed') }
    setVerifying(false)
  }

  const handleSend = async () => {
    if (!gmailTokens || !generatedEmails?.length) return
    setSending(true)
    try {
      const emails = generatedEmails.map(e => ({
        to: e.contact.email,
        subject: e.subject,
        body: e.body,
        contact_name: e.contact.name,
      }))
      const res = await sendEmails({
        token_data: gmailTokens,
        from_name: fromName || gmailEmail.split('@')[0],
        from_email: gmailEmail,
        emails,
      })
      setResults(res.data.results)
      const { sent, failed } = res.data.summary
      if (failed === 0) toast.success(`All ${sent} emails sent! 🎉`)
      else toast(`${sent} sent, ${failed} failed`, { icon: '⚠️' })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Send failed — check Gmail connection')
    } finally { setSending(false) }
  }

  if (!generatedEmails?.length) {
    return (
      <div className="page-content"><div className="container-sm">
        <div className="alert alert-amber">
          <AlertCircle size={14} style={{ flexShrink: 0 }} />
          No emails generated yet.{' '}
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/app/configure')}>Go to Configure →</button>
        </div>
      </div></div>
    )
  }

  return (
    <div className="page-content">
      <div className="container-sm">
        <div className="page-hd">
          <h1>Send Emails</h1>
          <p>Connect Gmail and send {generatedEmails.length} personalized emails from your own account.</p>
        </div>

        {/* Gmail connection */}
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, marginBottom: 4 }}>Gmail Account</h3>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
            Emails are sent <em>from your Gmail</em> — not a third-party address.
          </p>

          {fetchingTokens ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text2)' }}>
              <span className="spinner" /> Retrieving Gmail tokens…
            </div>
          ) : !gmailTokens ? (
            <div className="gmail-connect-card">
              <div style={{ fontSize: 40 }}>📧</div>
              <h3>Connect your Gmail</h3>
              <p style={{ fontSize: 13, color: 'var(--text2)' }}>
                One-click Google OAuth — your password is never shared.
              </p>
              <button className="btn btn-primary" onClick={connectGmail}>
                <GoogleIcon /> Connect Gmail
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span className="badge badge-green"><CheckCircle2 size={12} /> {gmailEmail}</span>
              <button className="btn btn-sm btn-secondary" onClick={verifyGmail} disabled={verifying}>
                {verifying ? <span className="spinner" /> : <RefreshCw size={12} />} Verify
              </button>
              <button className="btn btn-sm btn-danger" onClick={() => { setGmailTokens(null); setGmailEmail('') }}>
                <XCircle size={12} /> Disconnect
              </button>
            </div>
          )}
        </div>

        {/* Sender display name */}
        {gmailTokens && !results && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="form-group">
              <label className="form-label">Your display name (optional)</label>
              <input
                placeholder={gmailEmail.split('@')[0]}
                value={fromName}
                onChange={e => setFromName(e.target.value)}
              />
              <span className="form-hint">Shown as the "From" name. Defaults to your Gmail username.</span>
            </div>
          </div>
        )}

        {/* Email list preview */}
        {!results && (
          <>
            <h3 style={{ fontSize: 14, marginBottom: 12, color: 'var(--text2)' }}>
              {generatedEmails.length} emails queued
            </h3>
            <div className="send-list" style={{ marginBottom: 24 }}>
              {generatedEmails.map((e, i) => (
                <div key={i} className="send-row">
                  <Mail size={14} color="var(--text3)" style={{ flexShrink: 0 }} />
                  <div className="send-to">
                    <div className="send-email">
                      {e.contact.name}
                      <span style={{ color: 'var(--text3)', fontWeight: 400, fontSize: 12 }}>
                        {' '}&lt;{e.contact.email}&gt;
                      </span>
                    </div>
                    <div className="send-subj">{e.subject}</div>
                  </div>
                  <span className="badge badge-gray">{e.contact.company}</span>
                </div>
              ))}
            </div>

            <button
              className="btn btn-primary btn-lg"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={handleSend}
              disabled={!gmailTokens || sending}
            >
              {sending
                ? <><span className="spinner" /> Sending {generatedEmails.length} emails…</>
                : <><Send size={16} /> Send {generatedEmails.length} Emails Now</>
              }
            </button>
            {!gmailTokens && (
              <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text3)', marginTop: 8 }}>
                Connect Gmail above to enable sending
              </p>
            )}
          </>
        )}

        {/* Results */}
        {results && (
          <div className="fade-up">
            <div className="send-summary" style={{ marginBottom: 24 }}>
              <div className="send-stat">
                <div className="send-stat-val" style={{ color: 'var(--green)' }}>
                  {results.filter(r => r.success).length}
                </div>
                <div className="send-stat-lbl">Sent ✓</div>
              </div>
              <div className="send-stat">
                <div className="send-stat-val" style={{ color: results.filter(r => !r.success).length > 0 ? 'var(--red)' : 'var(--text3)' }}>
                  {results.filter(r => !r.success).length}
                </div>
                <div className="send-stat-lbl">Failed</div>
              </div>
              <div className="send-stat">
                <div className="send-stat-val">{results.length}</div>
                <div className="send-stat-lbl">Total</div>
              </div>
            </div>

            <div className="send-list" style={{ marginBottom: 24 }}>
              {results.map((r, i) => (
                <div key={i} className="send-row">
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{r.success ? '✅' : '❌'}</span>
                  <div className="send-to">
                    <div className="send-email">{r.email}</div>
                    {r.error    && <div style={{ fontSize: 12, color: 'var(--red)'   }}>{r.error}</div>}
                    {r.message_id && <div style={{ fontSize: 11, color: 'var(--text3)' }}>ID: {r.message_id}</div>}
                  </div>
                  <span className={`badge ${r.success ? 'badge-green' : 'badge-red'}`}>
                    {r.success ? 'Sent' : 'Failed'}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => { resetWizard(); navigate('/app/dashboard') }}>
                <RotateCcw size={14} /> New Campaign
              </button>
              <button className="btn btn-ghost" onClick={() => navigate('/app/dashboard')}>
                Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}
