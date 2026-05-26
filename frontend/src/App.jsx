import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import AuthPage from './pages/AuthPage'
import AppShell from './pages/AppShell'
import Dashboard from './pages/app/Dashboard'
import SettingsPage from './pages/app/SettingsPage'
import SubscriptionPage from './pages/app/SubscriptionPage'

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              style: { background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border2)', fontSize: 13 },
              success: { iconTheme: { primary: 'var(--green)', secondary: 'var(--bg3)' } },
              error: { iconTheme: { primary: 'var(--red)', secondary: 'var(--bg3)' } },
            }}
          />
          <Routes>
            <Route path="/" element={<Navigate to="/auth" replace />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/app" element={<AppShell />}>
              <Route index element={<Navigate to="/app/dashboard" replace />} />
              <Route path="dashboard"  element={<Dashboard />} />
              {/* Legacy URLs → wizard */}
              <Route path="resume"     element={<Navigate to="/app/dashboard" replace />} />
              <Route path="contacts"   element={<Navigate to="/app/dashboard" replace />} />
              <Route path="configure"  element={<Navigate to="/app/dashboard" replace />} />
              <Route path="review"     element={<Navigate to="/app/dashboard" replace />} />
              <Route path="send"       element={<Navigate to="/app/dashboard" replace />} />
              <Route path="settings"   element={<SettingsPage />} />
              <Route path="subscription"   element={<SubscriptionPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/auth" replace />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  )
}
