import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, Zap, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/logo.png'
import Footer from '../components/Footer'
import './AuthPage.css'

export default function AuthPage() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState(() => searchParams.get('mode') === 'signup' ? 'signup' : 'login') // login | signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await signInWithEmail(email, password)
        if (error) throw error
        navigate('/app/dashboard')
      } else {
        const { error } = await signUpWithEmail(email, password)
        if (error) throw error
        setSuccess('Account created! Check your email to confirm, then log in.')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError(''); setLoading(true)
    try {
      const { error } = await signInWithGoogle()
      if (error) throw error
    } catch (err) {
      setError(err.message || 'Google sign-in failed')
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-orb auth-orb1" />
        <div className="auth-orb auth-orb2" />
        <div className="auth-grid" />
      </div>

      <div className="auth-card card fade-up">
        <div className="auth-logo">
          <img src={logo} alt="" style={{ height: '36px' }} />
          <span className="auth-logo-text">opportuneo</span>
        </div>

        <h1 className="auth-title">
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h1>
        <p className="auth-subtitle">
          {mode === 'login'
            ? 'Sign in to continue generating personalized outreach emails'
            : 'Start sending AI-personalized emails to HRs and employers'}
        </p>

        {/* Google */}
        <button className="btn-google" onClick={handleGoogle} disabled={loading}>
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div className="auth-or"><span>or</span></div>

        {/* Email form */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Email address</label>
            <div className="input-icon-wrap">
              <Mail size={15} className="input-icon" />
              <input
                type="email" required placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)}
                style={{ paddingLeft: '38px' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-icon-wrap">
              <Lock size={15} className="input-icon" />
              <input
                type={showPass ? 'text' : 'password'} required
                placeholder={mode === 'signup' ? 'Min 6 characters' : 'Your password'}
                value={password} onChange={e => setPassword(e.target.value)}
                style={{ paddingLeft: '38px', paddingRight: '40px' }}
                minLength={6}
              />
              <button type="button" className="input-icon-right" onClick={() => setShowPass(!showPass)}>
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="alert alert-error">
              <AlertCircle size={14} style={{flexShrink:0,marginTop:1}} /> {error}
            </div>
          )}
          {success && (
            <div className="alert alert-success">
              <CheckCircle2 size={14} style={{flexShrink:0,marginTop:1}} /> {success}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-lg" style={{width:'100%',justifyContent:'center'}} disabled={loading}>
            {loading ? <><span className="spinner" /> Processing…</> : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
          {' '}
          <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccess('') }}>
            {mode === 'login' ? 'Sign up free' : 'Sign in'}
          </button>
        </p>
      </div>
      <Footer />
    </div>
  )
}
