/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react'
import { useAppState } from '../../context/AppContext'
import { getGmailAuthUrl, getGmailTokens, verifyGmailToken } from '../../lib/api'
import { Key, CheckCircle2, ExternalLink, RefreshCw, Shield, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import './pages.css'

export default function SettingsPage() {
  const { gmailTokens, gmailEmail, setGmailTokens, setGmailEmail } = useAppState()
  const [checking, setChecking] = useState(false)
  const [fetching, setFetching] = useState(false)

  // Handle redirect back from Google OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const connected   = params.get('gmail_connected')
    const gmailErr    = params.get('gmail_error')
    const sessionId   = params.get('gmail_session')
    const emailParam  = params.get('gmail_email')

    if (gmailErr) {
      toast.error(`Gmail error: ${decodeURIComponent(gmailErr)}`)
      window.history.replaceState({}, '', window.location.pathname)
      return
    }

    if (connected && sessionId) {
      // Exchange session_id for actual tokens (one-time)
      setFetching(true)
      getGmailTokens(sessionId)
        .then(res => {
          setGmailTokens(res.data.tokens)
          setGmailEmail(decodeURIComponent(emailParam || ''))
          toast.success(`✅ Gmail connected: ${decodeURIComponent(emailParam || '')}`)
        })
        .catch(() => toast.error('Failed to retrieve Gmail tokens — try connecting again'))
        .finally(() => {
          setFetching(false)
          window.history.replaceState({}, '', window.location.pathname)
        })
    }
  }, [setGmailEmail, setGmailTokens])

  const connectGmail = async () => {
    try {
      const res = await getGmailAuthUrl()
      window.location.href = res.data.url
    } catch { toast.error('Could not start Gmail OAuth') }
  }

  const verifyGmail = async () => {
    setChecking(true)
    try {
      const res = await verifyGmailToken(gmailTokens)
      if (res.data.valid) toast.success(`Gmail valid ✓ — ${res.data.email}`)
      else { setGmailTokens(null); setGmailEmail(''); toast.error('Token expired — reconnect') }
    } catch { toast.error('Verify failed') }
    setChecking(false)
  }

  const disconnect = () => {
    setGmailTokens(null)
    setGmailEmail('')
    toast.success('Gmail disconnected')
  }

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  return (
    <div className="page-content">
      <div className="container-sm">
        <div className="page-hd"><h1>Settings</h1><p>Manage your Gmail connection and configuration.</p></div>

        {/* Gmail card */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
            <div style={{ width: 38, height: 38, background: 'var(--green-bg)', border: '1px solid rgba(34,211,160,.2)', borderRadius: 'var(--r)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
              📧
            </div>
            <div>
              <h3 style={{ fontSize: 15, marginBottom: 3 }}>Gmail Connection</h3>
              <p style={{ fontSize: 13, color: 'var(--text2)' }}>
                Authorize your Gmail to send outreach emails directly from your account.
              </p>
            </div>
          </div>

          {fetching ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text2)' }}>
              <span className="spinner" /> Retrieving Gmail tokens…
            </div>
          ) : gmailTokens ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span className="badge badge-green"><CheckCircle2 size={12} /> {gmailEmail}</span>
                <button className="btn btn-sm btn-secondary" onClick={verifyGmail} disabled={checking}>
                  {checking ? <span className="spinner" /> : <RefreshCw size={12} />} Verify
                </button>
                <button className="btn btn-sm btn-danger" onClick={disconnect}>
                  <XCircle size={12} /> Disconnect
                </button>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text3)' }}>
                Tokens are stored in your browser session only — cleared when you close the tab.
              </p>
            </div>
          ) : (
            <button className="btn btn-secondary" onClick={connectGmail}>
              <GoogleIcon /> Connect Gmail Account
            </button>
          )}
        </div>

        {/* API URL info */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 38, height: 38, background: 'var(--glow2)', border: '1px solid rgba(109,95,255,.2)', borderRadius: 'var(--r)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent2)', flexShrink: 0 }}>
              <Key size={16} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: 15, marginBottom: 3 }}>Backend API</h3>
              <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>
                Connected to: <code style={{ color: 'var(--accent3)', fontSize: 12 }}>{apiUrl}</code>
              </p>
              <p className="form-hint">Change via <code>VITE_API_URL</code> in <code>frontend/.env</code></p>
            </div>
          </div>
        </div>

        {/* Security note */}
        <div className="card" style={{ background: 'var(--glow2)', borderColor: 'rgba(109,95,255,.15)', marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Shield size={15} color="var(--accent2)" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--text)' }}>How tokens are protected:</strong> After you connect Gmail,
              tokens are fetched once from the backend and stored in your browser's <code>sessionStorage</code> only.
              They are never written to any database and are cleared automatically when you close the tab.
            </p>
          </div>
        </div>

        {/* Setup links */}
        <h3 style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 10 }}>Setup guides</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            ['Deploy backend to Railway',         'https://railway.app'],
            ['Get Anthropic API key',              'https://console.anthropic.com'],
            ['Create Google OAuth credentials',    'https://console.cloud.google.com/apis/credentials'],
            ['Create Supabase project',            'https://supabase.com'],
          ].map(([label, url]) => (
            <a key={url} href={url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--accent2)', textDecoration: 'underline', textUnderlineOffset: 2 }}>
              <ExternalLink size={12} /> {label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 18 18">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}
