import ProtectedRoute from './components/ProtectedRoute.jsx'
import AuthConfirm from './pages/AuthConfirm.jsx'
import AdminDashboard from './pages/Admin/Dashboard.jsx'
import BuyerLanding from './pages/buyer/BuyerLanding.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import ResetPassword from './pages/ResetPassword.jsx'

function App() {
  if (window.location.pathname === '/admin') {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminDashboard />
      </ProtectedRoute>
    )
  }

  if (window.location.pathname === '/buyer') {
    return (
      <ProtectedRoute allowedRoles={['buyer']}>
        <BuyerLanding />
      </ProtectedRoute>
    )
  }

  if (window.location.pathname === '/auth/confirm') {
    return <AuthConfirm />
  }

  if (window.location.pathname === '/forgot-password') {
    return <ForgotPassword />
  }

  if (window.location.pathname === '/reset-password') {
    return <ResetPassword />
  }

  if (window.location.pathname === '/login') {
    return <Login />
  }

  return <Register />
}

export default App
