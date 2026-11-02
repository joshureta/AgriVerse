export const routeTitles = {
  '/': 'Register',
  '/register': 'Register',
  '/login': 'Sign In',
  '/forgot-password': 'Forgot Password',
  '/reset-password': 'Reset Password',
  '/auth/confirm': 'Email Verification',
  '/profile': 'My Profile',

  '/admin': 'Dashboard',
  '/admin/users': 'User Management',
  '/admin/users/edit': 'Edit User',
  '/admin/tasks': 'Task and Schedule',
  '/admin/inventory': 'Inventory',
  '/admin/records': 'Records',
  '/admin/monitoring/crop-health': 'Crop Health Monitoring',
  '/admin/monitoring/environmental': 'Environmental Monitoring',
  '/admin/messages': 'Messages',
  '/admin/settings': 'Settings',

  '/seller': 'Dashboard',
  '/seller/dashboard': 'Dashboard',
  '/farm-worker/dashboard': 'Dashboard',
  '/seller/orders': 'Order Management',
  '/farm-worker/orders': 'Order Management',
  '/seller/inventory': 'Inventory',
  '/farm-worker/inventory': 'Inventory',
  '/driver': 'My Deliveries',
  '/driver/orders': 'My Deliveries',
  '/farm-worker/deliveries': 'My Deliveries',

  '/buyer': 'Marketplace',
  '/buyer/about': 'About Us',
  '/buyer/order': 'Place Order',
  '/buyer/orders': 'Place Order',
  '/buyer/place-order': 'Place Order',
  '/buyer/direct-place-order': 'Place Order',
  '/buyer/cart': 'Shopping Cart',
  '/buyer/shopping-cart': 'Shopping Cart',
  '/buyer/checkout': 'Checkout',
  '/buyer/payment-confirmation': 'Payment Confirmation',
  '/buyer/delivery-progress': 'My Orders',
  '/buyer/return-request': 'Report an Issue',
  '/buyer/return-details': 'Return Details',
  '/buyer/profile': 'My Profile',
  '/buyer/messages': 'Messages',
  '/buyer/notifications': 'Notifications',
}

export function getRouteTitle(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/'
  return routeTitles[path] || 'Register'
}
