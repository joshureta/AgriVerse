import ProtectedRoute from './components/ProtectedRoute.jsx'
import MarketplaceLoading from './components/MarketplaceLoading.jsx'
import WorkspaceLoading from './components/WorkspaceLoading.jsx'
import AuthConfirm from './pages/AuthConfirm.jsx'
import AdminDashboard from './pages/Admin/Dashboard.jsx'
import EditUser from './pages/Admin/EditUser.jsx'
import InventoryManagement from './pages/Admin/InventoryManagement.jsx'
import TaskScheduleManagement from './pages/Admin/TaskScheduleManagement.jsx'
import RecordsManagement from './pages/Admin/RecordsManagement.jsx'
import UserManagement from './pages/Admin/UserManagement.jsx'
import AdminMessages from './pages/Admin/AdminMessages.jsx'
import CropHealthMonitoring from './pages/Admin/CropHealthMonitoring.jsx'
import EnvironmentalMonitoring from './pages/Admin/EnvironmentalMonitoring.jsx'
import Settings from './pages/Admin/Settings.jsx'
import BuyerLanding from './pages/Buyer/BuyerLanding.jsx'
import AboutUs from './pages/Buyer/AboutUs.jsx'
import ShoppingCart from './pages/Buyer/ShoppingCart.jsx'
import BuyerOrders from './pages/Buyer/BuyerOrders.jsx'
import BuyerCheckout from './pages/Buyer/BuyerCheckout.jsx'
import PaymentConfirmation from './pages/Buyer/PaymentConfirmation.jsx'
import DeliveryProgress from './pages/Buyer/DeliveryProgress.jsx'
import ReturnRequest from './pages/Buyer/ReturnRequest.jsx'
import ReturnDetails from './pages/Buyer/ReturnDetails.jsx'
import BuyerProfile from './pages/Buyer/BuyerProfile.jsx'
import BuyerMessages from './pages/Buyer/BuyerMessages.jsx'
import BuyerNotifications from './pages/Buyer/BuyerNotifications.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import SellerDashboard from './pages/FarmWorker/SellerDashboard.jsx'
import SellerOrderManagement from './pages/FarmWorker/SellerOrderManagement.jsx'
import DriverOrders from './pages/FarmWorker/DriverOrders.jsx'

function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  const marketplaceLoading = <MarketplaceLoading path={path} search={window.location.search} />
  const adminLoading = <WorkspaceLoading path={path} />
  const sellerLoading = <WorkspaceLoading path={path} seller />

  if (path === '/farm-worker/orders' || path === '/seller/orders') {
    return (
      <ProtectedRoute allowedRoles={['farm_worker']} allowedWorkerCategories={['seller']} loadingFallback={sellerLoading}>
        <SellerOrderManagement />
      </ProtectedRoute>
    )
  }

  if (path === '/farm-worker/inventory' || path === '/seller/inventory') {
    return (
      <ProtectedRoute allowedRoles={['farm_worker']} allowedWorkerCategories={['seller']} loadingFallback={sellerLoading}>
        <InventoryManagement workspace="seller" initialView="stock" />
      </ProtectedRoute>
    )
  }

  if (
    path === '/farm-worker/dashboard' ||
    path === '/seller' ||
    path === '/seller/dashboard'
  ) {
    return (
      <ProtectedRoute
        allowedRoles={['farm_worker']}
        allowedWorkerCategories={['seller']}
        loadingFallback={sellerLoading}
      >
        <SellerDashboard />
      </ProtectedRoute>
    )
  }

  if (path === '/buyer/profile') {
    return (
      <ProtectedRoute allowedRoles={['buyer']} loadingFallback={marketplaceLoading}>
        <BuyerProfile />
      </ProtectedRoute>
    )
  }

  if (path === '/driver' || path === '/driver/orders' || path === '/farm-worker/deliveries') {
    return (
      <ProtectedRoute allowedRoles={['farm_worker']} allowedWorkerCategories={['driver']}>
        <DriverOrders />
      </ProtectedRoute>
    )
  }

  if (path === '/buyer/messages') {
    return (
      <ProtectedRoute allowedRoles={['buyer']} loadingFallback={marketplaceLoading}>
        <BuyerMessages />
      </ProtectedRoute>
    )
  }

  if (path === '/buyer/notifications') {
    return (
      <ProtectedRoute allowedRoles={['buyer']} loadingFallback={marketplaceLoading}>
        <BuyerNotifications />
      </ProtectedRoute>
    )
  }

  if (path === '/buyer/delivery-progress') {
    return (
      <ProtectedRoute allowedRoles={['buyer']} loadingFallback={marketplaceLoading}>
        <DeliveryProgress />
      </ProtectedRoute>
    )
  }

  if (path === '/buyer/return-request') {
    return <ProtectedRoute allowedRoles={['buyer']} loadingFallback={marketplaceLoading}><ReturnRequest /></ProtectedRoute>
  }

  if (path === '/buyer/return-details') {
    return <ProtectedRoute allowedRoles={['buyer']} loadingFallback={marketplaceLoading}><ReturnDetails /></ProtectedRoute>
  }


  if (path === '/buyer/checkout') {
    return (
      <ProtectedRoute allowedRoles={['buyer']} loadingFallback={marketplaceLoading}>
        <BuyerCheckout />
      </ProtectedRoute>
    )
  }

  if (path === '/buyer/payment-confirmation') {
    return (
      <ProtectedRoute allowedRoles={['buyer']} loadingFallback={marketplaceLoading}>
        <PaymentConfirmation />
      </ProtectedRoute>
    )
  }

  if (path === '/admin/tasks') {
    return (
      <ProtectedRoute allowedRoles={['admin']} loadingFallback={adminLoading}>
        <TaskScheduleManagement />
      </ProtectedRoute>
    )
  }

  if (path === '/admin/records') {
    return (
      <ProtectedRoute allowedRoles={['admin']} loadingFallback={adminLoading}>
        <RecordsManagement />
      </ProtectedRoute>
    )
  }

  if (path === '/admin/monitoring/crop-health') {
    return (
      <ProtectedRoute allowedRoles={['admin']} loadingFallback={adminLoading}>
        <CropHealthMonitoring />
      </ProtectedRoute>
    )
  }

  if (path === '/admin/monitoring/environmental') {
    return (
      <ProtectedRoute allowedRoles={['admin']} loadingFallback={adminLoading}>
        <EnvironmentalMonitoring />
      </ProtectedRoute>
    )
  }

  if (path === '/admin/settings') {
    return (
      <ProtectedRoute allowedRoles={['admin']} loadingFallback={adminLoading}>
        <Settings />
      </ProtectedRoute>
    )
  }

  if (path === '/admin/users/edit') {
    return (
      <ProtectedRoute allowedRoles={['admin']} loadingFallback={adminLoading}>
        <EditUser />
      </ProtectedRoute>
    )
  }

  if (path === '/admin/users') {
    return (
      <ProtectedRoute allowedRoles={['admin']} loadingFallback={adminLoading}>
        <UserManagement />
      </ProtectedRoute>
    )
  }

  if (path === '/admin/messages') {
    return (
      <ProtectedRoute allowedRoles={['admin']} loadingFallback={adminLoading}>
        <AdminMessages />
      </ProtectedRoute>
    )
  }

  if (path === '/admin') {
    return (
      <ProtectedRoute allowedRoles={['admin']} loadingFallback={adminLoading}>
        <AdminDashboard />
      </ProtectedRoute>
    )
  }

  if (path === '/admin/inventory') {
    return (
      <ProtectedRoute allowedRoles={['admin']} loadingFallback={adminLoading}>
        <InventoryManagement />
      </ProtectedRoute>
    )
  }

  if (
    path === '/buyer/order' ||
    path === '/buyer/orders' ||
    path === '/buyer/place-order' ||
    path === '/buyer/direct-place-order'
  ) {
    return (
      <ProtectedRoute allowedRoles={['buyer']} loadingFallback={marketplaceLoading}>
        <BuyerOrders />
      </ProtectedRoute>
    )
  }

  if (path === '/buyer/cart' || path === '/buyer/shopping-cart') {
    return (
      <ProtectedRoute allowedRoles={['buyer']} loadingFallback={marketplaceLoading}>
        <ShoppingCart />
      </ProtectedRoute>
    )
  }

  if (path === '/buyer/about') {
    return (
      <ProtectedRoute allowedRoles={['buyer']} loadingFallback={marketplaceLoading}>
        <AboutUs />
      </ProtectedRoute>
    )
  }

  if (path === '/buyer') {
    return (
      <ProtectedRoute allowedRoles={['buyer']} loadingFallback={marketplaceLoading}>
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
