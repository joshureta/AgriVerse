import ProtectedRoute from './components/ProtectedRoute.jsx'
import AuthConfirm from './pages/AuthConfirm.jsx'
import AdminDashboard from './pages/Admin/Dashboard.jsx'
import EditUser from './pages/Admin/EditUser.jsx'
import InventoryManagement from './pages/Admin/InventoryManagement.jsx'
import UserManagement from './pages/Admin/UserManagement.jsx'
import BuyerLanding from './pages/buyer/BuyerLanding.jsx'
import BuyerCart from './pages/buyer/BuyerCart.jsx'
import BuyerOrders from './pages/buyer/BuyerOrders.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import ResetPassword from './pages/ResetPassword.jsx'

function App() {
  if (window.location.pathname === '/admin/users/edit') {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <EditUser />
      </ProtectedRoute>
    )
  }

  if (path === '/admin/users') {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <UserManagement />
      </ProtectedRoute>
    )
  }

  if (path === '/admin') {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminDashboard />
      </ProtectedRoute>
    )
  }

  if (path === '/buyer/order' || path === '/buyer/orders') {
    return (
      <ProtectedRoute allowedRoles={['buyer']}>
        <BuyerOrders />
      </ProtectedRoute>
    )
  }

  if (path === '/buyer/cart' || path === '/buyer/shopping-cart') {
    return (
      <ProtectedRoute allowedRoles={['buyer']}>
        <BuyerCart />
      </ProtectedRoute>
    )
  }

  if (path === '/buyer') {
    return (
      <ProtectedRoute allowedRoles={['buyer']}>
        <BuyerLanding />
      </ProtectedRoute>
    )
  }

  if (path === '/auth/confirm') {
    return <AuthConfirm />
  }

  if (path === '/forgot-password') {
    return <ForgotPassword />
  }

  if (path === '/reset-password') {
    return <ResetPassword />
  }

  if (path === '/login') {
    return <Login />
  }

  return <Register />
}

export default App
