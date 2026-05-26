import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Zap, LayoutDashboard, Settings, LogOut, Menu, X, ChevronRight, DollarSign } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './AppShell.css'

const NAV = [
  { path: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/app/subscription', label: 'Subscription', icon: DollarSign },
  { path: '/app/settings',  label: 'Settings',  icon: Settings },
]

export default function AppShell({ children }) {
  const { user, signOut } = useAuth()
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
          <span className="logo-bolt">⚡</span>
          <span className="logo-name">OutreachAI</span>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(({ path, label, icon: NavIcon }) => (
            <button
              key={path}
              className={`nav-item ${isActive(path) ? 'active' : ''}`}
              onClick={() => { navigate(path); setMobileOpen(false) }}
            >
              {NavIcon({ size: 16 })}
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
              <span className="user-plan">Free plan</span>
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
          <span className="logo-name" style={{ fontFamily: 'var(--font-head)', fontWeight: 900 }}>OutreachAI</span>
          <div style={{ width: 36 }} />
        </header>

        <main className="shell-content">
          {children}
        </main>
      </div>
    </div>
  )
}
