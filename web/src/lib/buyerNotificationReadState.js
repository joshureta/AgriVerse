export const BUYER_NOTIFICATION_READ_EVENT = 'buyer-notification-read-change'

const STORAGE_KEY = 'agriverse_buyer_read_notifications_v1'

export function readBuyerNotificationIds() {
  try {
    const ids = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(ids) ? ids.map(String) : []
  } catch {
    return []
  }
}

export function saveBuyerNotificationIds(ids) {
  const uniqueIds = [...new Set(ids.map(String))]
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(uniqueIds))
  window.dispatchEvent(new Event(BUYER_NOTIFICATION_READ_EVENT))
  return uniqueIds
}

export function isBuyerNotificationRead(notification, readIds) {
  return Boolean(notification.read_at || notification.readAt || readIds.includes(String(notification.id)))
}
