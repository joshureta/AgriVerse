import { useEffect, useState } from 'react'
import { Bell, BellOff, Check, CheckCheck, PackageCheck, Truck } from 'lucide-react'
import { BuyerFooter, BuyerHeader } from '../../components/BuyerChrome.jsx'
import { BUYER_NOTIFICATION_READ_EVENT, isBuyerNotificationRead, readBuyerNotificationIds, saveBuyerNotificationIds } from '../../lib/buyerNotificationReadState.js'
import { loadBuyerNotifications } from '../../services/buyerMarketplace.js'
import '../../styles/Buyer/buyerLanding.css'
import '../../styles/Buyer/notifications.css'

const PAGE_SIZE = 100
const dateFormatter = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' })

function notificationIcon(notification) {
  const title = String(notification.title || '').toLowerCase()
  if (title.includes('deliver') || title.includes('pickup')) return <Truck aria-hidden="true" />
  if (title.includes('confirm') || title.includes('complete') || title.includes('approved')) return <Check aria-hidden="true" />
  return <PackageCheck aria-hidden="true" />
}

function notificationTime(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : dateFormatter.format(date)
}

async function loadAllNotifications() {
  const all = []
  const seen = new Set()
  let offset = 0

  while (true) {
    const result = await loadBuyerNotifications({ offset, limit: PAGE_SIZE })
    const batch = result.notifications || []
    let added = 0

    for (const notification of batch) {
      if (seen.has(notification.id)) continue
      seen.add(notification.id)
      all.push(notification)
      added += 1
    }

    offset += batch.length
    if (batch.length < PAGE_SIZE || added === 0 || all.length >= result.total_count) break
  }

  return all
}

export default function BuyerNotifications() {
  const [notifications, setNotifications] = useState([])
  const [readIds, setReadIds] = useState(readBuyerNotificationIds)
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let active = true

    async function refresh() {
      setLoading(true)
      setError('')
      try {
        const result = await loadAllNotifications()
        if (active) setNotifications(result)
      } catch (loadError) {
        if (active) setError(loadError.message || 'Unable to load notifications')
      } finally {
        if (active) setLoading(false)
      }
    }

    refresh()
    return () => { active = false }
  }, [refreshKey])

  useEffect(() => {
    const syncReadIds = () => setReadIds(readBuyerNotificationIds())
    window.addEventListener(BUYER_NOTIFICATION_READ_EVENT, syncReadIds)
    window.addEventListener('storage', syncReadIds)
    return () => {
      window.removeEventListener(BUYER_NOTIFICATION_READ_EVENT, syncReadIds)
      window.removeEventListener('storage', syncReadIds)
    }
  }, [])

  const unreadCount = notifications.filter((notification) => !isBuyerNotificationRead(notification, readIds)).length
  const visibleNotifications = filter === 'unread'
    ? notifications.filter((notification) => !isBuyerNotificationRead(notification, readIds))
    : notifications

  function markRead(id) {
    setReadIds(saveBuyerNotificationIds([...readBuyerNotificationIds(), id]))
  }

  function markAllRead() {
    setReadIds(saveBuyerNotificationIds([...readBuyerNotificationIds(), ...notifications.map((notification) => notification.id)]))
  }

  return (
    <main className="buyer-page buyer-notifications-page">
      <BuyerHeader active="notifications" />
      <section className="buyer-notifications-content" aria-labelledby="notifications-heading">
        <div className="buyer-notifications-heading">
          <h1 id="notifications-heading">Notifications</h1>
        </div>

        <div className="buyer-notifications-toolbar">
          <div className="buyer-notifications-filters" role="group" aria-label="Filter notifications">
            <button type="button" className={filter === 'all' ? 'is-selected' : ''} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All <span>{notifications.length}</span></button>
            <button type="button" className={filter === 'unread' ? 'is-selected' : ''} aria-pressed={filter === 'unread'} onClick={() => setFilter('unread')}>Unread <span>{unreadCount}</span></button>
          </div>
          {unreadCount > 0 && <button className="buyer-notifications-mark-all" type="button" onClick={markAllRead}><CheckCheck aria-hidden="true" /> Mark all as read</button>}
        </div>

        {loading && <div className="buyer-notifications-state" role="status">Loading notifications…</div>}
        {!loading && error && <div className="buyer-notifications-state is-error" role="alert"><p>{error}</p><button type="button" onClick={() => setRefreshKey((key) => key + 1)}>Try again</button></div>}
        {!loading && !error && visibleNotifications.length === 0 && (
          <div className="buyer-notifications-state">
            {filter === 'unread' ? <CheckCheck aria-hidden="true" /> : <BellOff aria-hidden="true" />}
            <h2>{filter === 'unread' ? 'You’re all caught up' : 'No notifications yet'}</h2>
            <p>{filter === 'unread' ? 'You have no unread notifications.' : 'Updates about your orders will appear here.'}</p>
          </div>
        )}
        {!loading && !error && visibleNotifications.length > 0 && (
          <div className="buyer-notifications-list" aria-label={`${filter === 'unread' ? 'Unread' : 'All'} notifications`}>
            {visibleNotifications.map((notification) => {
              const isRead = isBuyerNotificationRead(notification, readIds)
              const href = notification.entity_id
                ? `/buyer/delivery-progress?track=${encodeURIComponent(notification.entity_id)}`
                : '/buyer/delivery-progress'

              return (
                <article className={`buyer-notifications-item${isRead ? '' : ' is-unread'}`} key={notification.id}>
                  <span className="buyer-notifications-icon" aria-hidden="true">{notificationIcon(notification)}</span>
                  <div className="buyer-notifications-copy">
                    <div className="buyer-notifications-item-top">
                      <h2>{notification.title || 'Order update'}</h2>
                      <time dateTime={notification.created_at}>{notificationTime(notification.created_at)}</time>
                    </div>
                    <p>{notification.body}</p>
                    <div className="buyer-notifications-item-actions">
                      {notification.entity_id && <a href={href} onClick={() => !isRead && markRead(notification.id)}>View order <span aria-hidden="true">→</span></a>}
                      {!isRead && <button type="button" onClick={() => markRead(notification.id)}>Mark as read</button>}
                    </div>
                  </div>
                  {!isRead && <span className="buyer-notifications-unread-dot" aria-label="Unread" />}
                </article>
              )
            })}
          </div>
        )}
        {!loading && !error && notifications.length > 0 && <p className="buyer-notifications-total"><Bell aria-hidden="true" /> Showing all {notifications.length} notifications</p>}
      </section>
      <BuyerFooter />
    </main>
  )
}
