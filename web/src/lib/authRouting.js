export function getHomePathForRole(role) {
  if (role === 'admin') {
    return '/admin'
  }

  return '/buyer'
}
