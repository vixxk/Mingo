import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import AdminLayout from './layouts/AdminLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Listeners from './pages/Listeners'
import Sessions from './pages/Sessions'
import Wallet from './pages/Wallet'
import Payouts from './pages/Payouts'
import Analytics from './pages/Analytics'
import Notifications from './pages/Notifications'
import Settings from './pages/Settings'
import ProfileApprovals from './pages/ProfileApprovals'
import BannedMembers from './pages/BannedMembers'
import BestChoice from './pages/BestChoice'
import MemberReports from './pages/MemberReports'
import Activities from './pages/Activities'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-muted)',
        flexDirection: 'column',
        gap: 16,
      }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: '3px solid var(--border)',
          borderTopColor: 'var(--accent)',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ fontSize: 14, fontWeight: 500 }}>Loading...</span>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="users" element={<Users />} />
            <Route path="listeners" element={<Listeners />} />
            <Route path="sessions" element={<Sessions />} />
            <Route path="wallet" element={<Wallet />} />
            <Route path="payouts" element={<Payouts />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="settings" element={<Settings />} />
            <Route path="approvals" element={<ProfileApprovals />} />
            <Route path="banned" element={<BannedMembers />} />
            <Route path="best-choice" element={<BestChoice />} />
            <Route path="reports" element={<MemberReports />} />
            <Route path="activities" element={<Activities />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
