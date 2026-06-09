import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Zap, LayoutDashboard, Settings, LogOut, Menu, X, ChevronRight, DollarSign } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAppState } from '../context/AppContext'
import './AppShell.css'

const NAV = [
  { path: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/app/subscription', label: 'Subscription', icon: DollarSign },
  { path: '/app/settings',  label: 'Settings',  icon: Settings },
]

export default function AppShell({ children }) {
  const { user, signOut } = useAuth()
  const { availableCredits, subscriptionName } = useAppState()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (p) => location.pathname.startsWith(p)

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth')
  }

  return (
    <div className="shell">
      {/* Sidebar */}
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-logo" onClick={() => navigate('/app/dashboard')}>
          <span className="logo-bolt">op</span>
          <span className="logo-name">opportuneo</span>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(({ path, label, icon: NavIcon }) => (
            <button
              key={path}
              className={`nav-item ${isActive(path) ? 'active' : ''}`}
              onClick={() => { navigate(path); setMobileOpen(false) }}
            >
              <NavIcon size={16} />
              {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="user-avatar">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="user-info">
              <span className="user-email">{user?.email || 'User'}</span>
              <div className="flex items-center gap-1.5">
                <span className="user-plan">{subscriptionName}</span>
                <span className="flex items-center gap-0.5 rounded-full bg-[var(--glow2)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent)] ring-1 ring-[rgba(109,95,255,.2)]">
                  <Zap size={10} className="fill-current" />
                  {availableCredits}
                </span>
              </div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm sign-out-btn" onClick={handleSignOut}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />}

      {/* Main */}
      <div className="shell-main">
        {/* Mobile topbar */}
        <header className="mobile-topbar">
          <button className="btn btn-ghost btn-icon" onClick={() => setMobileOpen(true)}>
            <Menu size={20} />
          </button>
          <span className="logo-name" style={{ fontFamily: 'var(--font-head)', fontWeight: 900 }}>opportuneo</span>
          <div style={{ width: 36 }} />
        </header>

        <main className="shell-content">
          {children}
        </main>
      </div>
    </div>
  )
}
