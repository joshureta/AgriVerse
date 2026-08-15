export function getHomePathForRole(role, workerCategory) {
  if (role === 'admin') {
    return '/admin'
  }

  if (role === 'farm_worker' && workerCategory === 'seller') {
    return '/farm-worker/dashboard'
  }

  if (role === 'farm_worker') {
    return '/worker/tasks'
  }

  return '/buyer'
}
