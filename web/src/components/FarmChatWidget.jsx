import { useEffect, useRef, useState } from 'react'
import { MessageSquareText, Minus, Send, X } from 'lucide-react'
import { loadBuyerMessages, loadBuyerUnreadCount, sendBuyerMessage, setBuyerTyping } from '../services/buyerMessages.js'
import farmProfileIcon from '../assets/buyer/jtoledo-farm-profile.png'
import '../styles/Buyer/farmChatWidget.css'

function dayLabel(value) {
  const date = new Date(value)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) return 'Today'
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

function timeLabel(value) {
  return new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

export default function FarmChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [supportOnline, setSupportOnline] = useState(false)
  const [supportTyping, setSupportTyping] = useState(false)
  const launcherRef = useRef(null)
  const inputRef = useRef(null)
  const historyRef = useRef(null)
  const nearLatestRef = useRef(true)

  useEffect(() => {
    if (open) return undefined
    let cancelled = false
    async function fetchUnread() {
      try {
        const count = await loadBuyerUnreadCount()
        if (!cancelled) setUnreadCount(count)
      } catch {
        // The chat remains usable when the unread count cannot be loaded.
      }
    }
    fetchUnread()
    const interval = window.setInterval(fetchUnread, 20000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    let cancelled = false
    let inFlight = false
    setLoading(true)
    setUnreadCount(0)

    async function fetchConversation(background = false) {
      if (inFlight) return
      inFlight = true
      try {
        const result = await loadBuyerMessages()
        if (cancelled) return
        setMessages(result.messages)
        setSupportOnline(Boolean(result.presence?.online))
        setSupportTyping(Boolean(result.presence?.is_typing))
        setError('')
      } catch (caught) {
        if (!cancelled && !background) setError(caught.message || 'Chat is unavailable. Please try again.')
      } finally {
        inFlight = false
        if (!cancelled) setLoading(false)
      }
    }

    fetchConversation()
    const interval = window.setInterval(() => fetchConversation(true), 3000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [open])

  useEffect(() => {
    if (!open || !historyRef.current || !nearLatestRef.current) return
    const history = historyRef.current
    history.scrollTop = history.scrollHeight
  }, [messages, open])

  useEffect(() => {
    if (!open || !draft.trim() || sending) return undefined
    setBuyerTyping(true).catch(() => {})
    const interval = window.setInterval(() => setBuyerTyping(true).catch(() => {}), 2500)
    return () => {
      window.clearInterval(interval)
      setBuyerTyping(false).catch(() => {})
    }
  }, [open, draft, sending])

  useEffect(() => {
    if (!open) return undefined
    function onEscape(event) {
      if (event.key === 'Escape') closeChat()
    }
    document.addEventListener('keydown', onEscape)
    return () => document.removeEventListener('keydown', onEscape)
  }, [open])

  function openChat() {
    nearLatestRef.current = true
    setOpen(true)
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }

  function closeChat() {
    setOpen(false)
    window.setTimeout(() => launcherRef.current?.focus(), 0)
  }

  async function handleSend(event) {
    event.preventDefault()
    const body = draft.trim()
    if (!body || sending) return
    setSending(true)
    setError('')
    try {
      const { message, presence } = await sendBuyerMessage(body)
      nearLatestRef.current = true
      setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message])
      setSupportOnline(Boolean(presence?.online))
      setDraft('')
    } catch (caught) {
      setError(caught.message || 'Your message could not be sent.')
    } finally {
      setSending(false)
    }
  }

  function trackScroll() {
    const history = historyRef.current
    if (!history) return
    nearLatestRef.current = history.scrollHeight - history.scrollTop - history.clientHeight <= 72
  }

  return (
    <div className="farm-chat-widget">
      {!open && (
        <button className="farm-chat-launcher" type="button" ref={launcherRef} onClick={openChat} aria-controls="farm-chat-panel" aria-expanded="false">
          <MessageSquareText aria-hidden="true" />
          <span>Chat with the Farm</span>
          {unreadCount > 0 && <span className="farm-chat-unread" aria-label={`${unreadCount} unread messages`}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
        </button>
      )}

      {open && (
        <section className="farm-chat-panel" id="farm-chat-panel" role="dialog" aria-modal="false" aria-labelledby="farm-chat-title">
          <header className="farm-chat-header">
            <div className="farm-chat-title-group">
              <img src={farmProfileIcon} alt="" />
              <div>
                <h2 id="farm-chat-title">Chat with the Farm</h2>
                <p><span className={supportOnline ? 'is-online' : ''} />JToledo Trading · {supportOnline ? 'Online' : 'Offline'}</p>
              </div>
            </div>
            <div className="farm-chat-header-actions">
              <button type="button" onClick={closeChat} aria-label="Minimize chat"><Minus aria-hidden="true" /></button>
              <button type="button" onClick={closeChat} aria-label="Close chat"><X aria-hidden="true" /></button>
            </div>
          </header>

          <div className="farm-chat-history" ref={historyRef} onScroll={trackScroll} aria-label="Conversation with JToledo Trading" aria-live="polite">
            {loading && messages.length === 0 && <p className="farm-chat-state" role="status">Loading conversation…</p>}
            {!loading && messages.length === 0 && !error && (
              <div className="farm-chat-welcome">
                <img src={farmProfileIcon} alt="" />
                <p>Welcome! Have a question about an order, delivery, or our pineapples? Send a message to the farm team.</p>
              </div>
            )}
            {messages.map((message, index) => {
              const previous = messages[index - 1]
              const showDay = !previous || new Date(previous.created_at).toDateString() !== new Date(message.created_at).toDateString()
              const isBuyer = message.sender_role === 'buyer'
              return (
                <div className="farm-chat-message-group" key={message.id}>
                  {showDay && <div className="farm-chat-day"><span>{dayLabel(message.created_at)}</span></div>}
                  <div className={`farm-chat-message${isBuyer ? ' is-buyer' : ''}`}>
                    {!isBuyer && <img src={farmProfileIcon} alt="" />}
                    <div>
                      <p>{message.body}</p>
                      <time dateTime={message.created_at}>{timeLabel(message.created_at)}</time>
                    </div>
                  </div>
                </div>
              )
            })}
            {supportTyping && <p className="farm-chat-typing" role="status">JToledo Trading is typing…</p>}
          </div>

          {error && <div className="farm-chat-error" role="alert">{error}</div>}
          <form className="farm-chat-composer" onSubmit={handleSend}>
            <label className="sr-only" htmlFor="farm-chat-input">Message to the farm</label>
            <input id="farm-chat-input" ref={inputRef} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Type your message…" maxLength={2000} disabled={sending} autoComplete="off" />
            <button type="submit" aria-label="Send message" disabled={sending || !draft.trim()}><Send aria-hidden="true" /></button>
          </form>
        </section>
      )}
    </div>
  )
}
