/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef } from 'react'
import { useAppState } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import { 
  getGmailAuthUrl, 
  getGmailTokens, 
  verifyGmailToken, 
  linkGmail, 
  disconnectGmail,
  uploadDefaultResume,
  deleteDefaultResume,
  updateProfile,
  deleteAccount
} from '../../lib/api'
import { 
  Mail, 
  FileText, 
  CreditCard, 
  User, 
  CheckCircle2, 
  RefreshCw, 
  XCircle, 
  Upload, 
  Trash2, 
  ShieldAlert,
  Loader2,
  ExternalLink,
  ChevronRight
} from 'lucide-react'
import toast from 'react-hot-toast'
import './SettingsPage.css'
import { supabase } from '../../lib/supabase'

export default function SettingsPage() {
  const { 
    gmailTokens, setGmailTokens, 
    gmailEmail, setGmailEmail,
    profile, setProfile,
    defaultResume, setDefaultResume,
    availableCredits,
    subscriptionName
  } = useAppState()
  const { user, signOut } = useAuth()
  
  const [checking, setChecking] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [loadingResume, setLoadingResume] = useState(false)
  const [updatingName, setUpdatingName] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [newName, setNewName] = useState('')

  const resumeInputRef = useRef(null)

  useEffect(() => {
    if (profile?.full_name) {
      setNewName(profile.full_name)
    }
  }, [profile])

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
      setFetching(true)
      const handleConnection = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) throw new Error('No session')

          const tokenRes = await getGmailTokens(sessionId)
          const tokens = tokenRes.data.tokens
          const email = decodeURIComponent(emailParam || '')

          setGmailTokens(tokens)
          setGmailEmail(email)

          // Link to profile in backend
          await linkGmail(email, session.access_token)
          
          toast.success(`✅ Gmail connected: ${email}`)
        } catch (err) {
          console.error(err)
          toast.error('Failed to link Gmail account')
        } finally {
          setFetching(false)
          window.history.replaceState({}, '', window.location.pathname)
        }
      }
      handleConnection()
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
      else { 
        setGmailTokens(null); 
        setGmailEmail(''); 
        toast.error('Token expired — reconnect') 
      }
    } catch { toast.error('Verify failed') }
    setChecking(false)
  }

  const handleDisconnectGmail = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await disconnectGmail(session.access_token)
      setGmailTokens(null)
      setGmailEmail('')
      toast.success('Gmail disconnected')
    } catch { toast.error('Failed to disconnect') }
  }

  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setLoadingResume(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const fd = new FormData()
      fd.append('file', file)
      const res = await uploadDefaultResume(fd, session.access_token)
      setDefaultResume({ filename: res.data.filename, parsed_data: res.data.parsed })
      toast.success('Resume uploaded as default')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed')
    } finally {
      setLoadingResume(false)
      if (resumeInputRef.current) resumeInputRef.current.value = ''
    }
  }

  const handleRemoveResume = async () => {
    if (!confirm('Are you sure you want to remove your default resume?')) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await deleteDefaultResume(session.access_token)
      setDefaultResume(null)
      toast.success('Resume removed')
    } catch { toast.error('Failed to remove resume') }
  }

  const handleUpdateName = async () => {
    if (!newName.trim()) return
    setUpdatingName(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await updateProfile({ full_name: newName.trim() }, session.access_token)
      setProfile({ ...profile, full_name: newName.trim() })
      toast.success('Profile updated')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Update failed')
    } finally {
      setUpdatingName(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm('PERMANENTLY DELETE ACCOUNT? This cannot be undone. All your campaigns, resumes, and data will be erased.')) return
    setDeletingAccount(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await deleteAccount(session.access_token)
      toast.success('Account deleted')
      signOut()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Delete failed. Contact support.')
      setDeletingAccount(false)
    }
  }

  const handleChangePassword = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/app/settings?reset_password=1`,
    })
    if (error) toast.error(error.message)
    else toast.success('Password reset email sent!')
  }

  return (
    <div className="settings-page">
      <div className="container-sm">
        <header className="settings-header">
          <h1>Settings</h1>
          <p>Manage your account, connections, and preferences.</p>
        </header>

        <div className="settings-grid">
          {/* 1. Gmail Connection */}
          <section className="settings-card">
            <div className="card-header">
              <div className="icon-box gmail"><Mail size={20} /></div>
              <div className="header-text">
                <h3>Gmail Connection</h3>
                <p>Used to send outreach emails from your personal account.</p>
              </div>
            </div>
            
            <div className="card-content">
              {fetching ? (
                <div className="loading-state">
                  <Loader2 className="spinner" size={18} />
                  <span>Connecting your Gmail...</span>
                </div>
              ) : gmailEmail ? (
                <div className="connection-info">
                  <div className="status-badge connected">
                    <CheckCircle2 size={14} />
                    <span>Connected as <strong>{gmailEmail}</strong></span>
                  </div>
                  <div className="action-row">
                    <button className="btn-action" onClick={verifyGmail} disabled={checking}>
                      {checking ? <Loader2 className="spinner" size={14} /> : <RefreshCw size={14} />}
                      Verify Status
                    </button>
                    <button className="btn-action" onClick={connectGmail}>
                      <RefreshCw size={14} />
                      Reconnect
                    </button>
                    <button className="btn-action danger" onClick={handleDisconnectGmail}>
                      <XCircle size={14} />
                      Disconnect
                    </button>
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <p>No Gmail account connected.</p>
                  <button className="btn-primary" onClick={connectGmail}>
                    <GoogleIcon />
                    Connect Gmail Account
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* 2. Resume */}
          <section className="settings-card">
            <div className="card-header">
              <div className="icon-box resume"><FileText size={20} /></div>
              <div className="header-text">
                <h3>Default Resume</h3>
                <p>This resume will be used by default for all new campaigns.</p>
              </div>
            </div>
            
            <div className="card-content">
              {loadingResume ? (
                <div className="loading-state">
                  <Loader2 className="spinner" size={18} />
                  <span>Parsing and saving resume...</span>
                </div>
              ) : defaultResume ? (
                <div className="file-info">
                  <div className="file-box">
                    <FileText size={24} className="text-accent" />
                    <div className="file-details">
                      <span className="filename">{defaultResume.filename}</span>
                      <span className="file-meta">Default resume active</span>
                    </div>
                  </div>
                  <div className="action-row">
                    <button className="btn-action" onClick={() => resumeInputRef.current?.click()}>
                      <Upload size={14} />
                      Replace
                    </button>
                    <button className="btn-action danger" onClick={handleRemoveResume}>
                      <Trash2 size={14} />
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <p>Upload a default resume to save time on every campaign.</p>
                  <button className="btn-secondary" onClick={() => resumeInputRef.current?.click()}>
                    <Upload size={14} />
                    Upload Resume
                  </button>
                </div>
              )}
              <input 
                type="file" 
                ref={resumeInputRef} 
                onChange={handleResumeUpload} 
                accept=".pdf,.docx,.txt" 
                style={{ display: 'none' }} 
              />
            </div>
          </section>

          {/* 3. Billing & Credits */}
          <section className="settings-card">
            <div className="card-header">
              <div className="icon-box billing"><CreditCard size={20} /></div>
              <div className="header-text">
                <h3>Billing & Credits</h3>
                <p>Manage your subscription plan and credit balance.</p>
              </div>
            </div>
            
            <div className="card-content">
              <div className="billing-stats">
                <div className="stat-item">
                  <span className="stat-label">Current Plan</span>
                  <span className="stat-value plan">{subscriptionName}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Credits Remaining</span>
                  <span className="stat-value">{availableCredits}</span>
                </div>
              </div>
              
              <button className="btn-primary w-full" onClick={() => window.location.href = '/app/subscription'}>
                Buy More Credits
              </button>

              <div className="billing-placeholders">
                <div className="placeholder-item">
                  <span>Billing History</span>
                  <span className="hint">Coming soon</span>
                </div>
                <div className="placeholder-item">
                  <span>Invoices</span>
                  <span className="hint">Coming soon</span>
                </div>
              </div>
            </div>
          </section>

          {/* 4. Account */}
          <section className="settings-card">
            <div className="card-header">
              <div className="icon-box account"><User size={20} /></div>
              <div className="header-text">
                <h3>Account</h3>
                <p>Update your profile information and security settings.</p>
              </div>
            </div>
            
            <div className="card-content">
              <div className="account-form">
                <div className="form-group">
                  <label>Full Name</label>
                  <div className="input-with-button">
                    <input 
                      type="text" 
                      value={newName} 
                      onChange={(e) => setNewName(e.target.value)} 
                      placeholder="Your Name"
                    />
                    <button 
                      className="btn-sm" 
                      onClick={handleUpdateName} 
                      disabled={updatingName || newName === profile?.full_name}
                    >
                      {updatingName ? <Loader2 className="spinner" size={14} /> : 'Update'}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" value={user?.email || ''} disabled />
                  <p className="form-hint">Email cannot be changed.</p>
                </div>
              </div>

              <div className="account-actions">
                <button className="btn-link" onClick={handleChangePassword}>
                  Change Password <ChevronRight size={14} />
                </button>
                
                <div className="danger-zone">
                  <h4>Danger Zone</h4>
                  <p>Once you delete your account, there is no going back.</p>
                  <button className="btn-danger-outline" onClick={handleDeleteAccount} disabled={deletingAccount}>
                    {deletingAccount ? <Loader2 className="spinner" size={14} /> : <ShieldAlert size={14} />}
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 18 18" style={{ marginRight: 8 }}>
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}
