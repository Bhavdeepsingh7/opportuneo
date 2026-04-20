import { useEffect } from 'react'
import { Outlet, useNavigate, useLocation, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Upload, Users, Wand2,
  Mail, Send, Settings, LogOut, Zap
} from 'lucide-react'
import './AppShell.css'

const NAV = [
  { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/app/resume', icon: Upload, label: 'Resume' },
  { to: '/app/contacts', icon: Users, label: 'Contacts' },
  { to: '/app/configure', icon: Wand2, label: 'Configure' },
  { to: '/app/review', icon: Mail, label: 'Review' },
  { to: '/app/send', icon: Send, label: 'Send' },
  { divider: true },
  { to: '/app/settings', icon: Settings, label: 'Settings' },
]

export default function AppShell() {
  const { user, loading, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!loading && !user) navigate('/auth')
  }, [user, loading, navigate])

  if (loading) {
    return (
      <div className="shell-loading">
        <span className="spinner spinner-lg" />
      </div>
    )
  }
  if (!user) return null

  // Parse wizard step for progress
  const steps = ['resume', 'contacts', 'configure', 'review', 'send']
  const currentStep = steps.findIndex(s => location.pathname.includes(s))

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <button className="sidebar-logo" onClick={() => navigate('/app/dashboard')}>
            <span className="logo-glow">⚡</span>
            <span className="logo-label">OutreachAI</span>
          </button>

          <nav className="sidebar-nav">
            {NAV.map((item, i) =>
              item.divider
                ? <div key={i} className="nav-divider" />
                : (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  >
                    <item.icon size={16} />
                    <span>{item.label}</span>
                  </NavLink>
                )
            )}
          </nav>
        </div>

        <div className="sidebar-bottom">
          <div className="user-pill">
            <div className="user-avatar">
              {user.user_metadata?.avatar_url
                ? <img src={user.user_metadata.avatar_url} alt="avatar" />
                : <span>{(user.email || 'U')[0].toUpperCase()}</span>
              }
            </div>
            <div className="user-info">
              <span className="user-name">
                {user.user_metadata?.full_name || user.email?.split('@')[0]}
              </span>
              <span className="user-email">{user.email}</span>
            </div>
          </div>
          <button className="btn-signout" onClick={signOut} title="Sign out">
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="shell-main">
        {/* Wizard steps bar shown on wizard pages */}
        {currentStep >= 0 && (
          <div className="wizard-bar">
            <div className="container">
              <div className="steps-nav">
                {['Resume', 'Contacts', 'Configure', 'Review', 'Send'].map((label, i) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
                    {i > 0 && <div className="step-line" />}
                    <div className={`step-item ${i === currentStep ? 'active' : i < currentStep ? 'done' : ''}`}>
                      <div className="step-dot">
                        {i < currentStep ? '✓' : i + 1}
                      </div>
                      <span className="step-label-text">{label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  )
}
