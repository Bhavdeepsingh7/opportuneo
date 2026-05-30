import { useEffect } from 'react'
import { Outlet, useNavigate, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useAppState } from '../context/AppContext'
import {
  LayoutDashboard, Settings, LogOut, DollarSign, Coins
} from 'lucide-react'
import Footer from '../components/Footer'
import './AppShell.css'

const NAV = [
  { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/app/subscription', icon: DollarSign, label: 'Subscription' },
  { divider: true },
  { to: '/app/settings', icon: Settings, label: 'Settings' },
]

export default function AppShell() {
  const { user, loading, signOut } = useAuth()
  const { availableCredits, subscriptionName } = useAppState()
  const navigate = useNavigate()
  const formattedCredits = new Intl.NumberFormat('en-IN').format(availableCredits || 0)

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

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <button className="sidebar-logo" onClick={() => navigate('/app/dashboard')}>
            <span className="logo-glow">op</span>
            <span className="logo-label">opportuneo</span>
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

        <div className="sidebar-bottom-wrap">
          <div className="subscription-pill" title={`Current subscription: ${subscriptionName}`}>
            <span>Subscription</span>
            <strong>{subscriptionName}</strong>
          </div>

          <div className="sidebar-bottom">
            <div className="user-pill">
              <div className="user-avatar">
                {user.user_metadata?.avatar_url
                  ? <img src={user.user_metadata.avatar_url} alt="avatar" />
                  : <span>{(user.email || 'U')[0].toUpperCase()}</span>
                }
              </div>
              <button className="btn-signout" onClick={signOut} title="Sign out" aria-label="Sign out">
                <LogOut size={15} />
              </button>
              <div className="user-info">
                <span className="user-name">
                  {user.user_metadata?.full_name || user.email?.split('@')[0]}
                </span>
                <span className="user-email">{user.email}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="shell-main">
        <header className="shell-topbar" aria-label="Account credits">
          <div className="credits-pill" title={`${formattedCredits} email credits available`}>
            <Coins size={16} />
            <span>{formattedCredits}</span>
            <small>credits</small>
          </div>
        </header>
        <div className="shell-content">
          <Outlet />
        </div>
        <Footer />
      </main>
    </div>
  )
}
