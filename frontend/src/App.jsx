import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import AuthPage from './pages/AuthPage'
import AppShell from './pages/AppShell'
import Dashboard from './pages/app/Dashboard'
import SettingsPage from './pages/app/SettingsPage'
import SubscriptionPage from './pages/app/SubscriptionPage'
import CheckoutPage from './pages/app/CheckoutPage'
import LandingPage from './pages/LandingPage'
import LegalPage from './pages/legal/LegalPage'

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
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/privacy-policy" element={<LegalPage type="privacy" />} />
            <Route path="/terms-and-conditions" element={<LegalPage type="terms" />} />
            <Route path="/refund-and-cancellation-policy" element={<LegalPage type="refund" />} />
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
              <Route path="checkout"   element={<CheckoutPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/auth" replace />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  )
}
