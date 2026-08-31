import { useCallback, useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { AdminSidebar, AdminTopbar } from '../../components/AdminNavigation.jsx'
import { loadAdminConversation, loadAdminConversations, sendAdminMessage } from '../../services/adminMessages.js'
import '../../styles/admin-dashboard.css'
import '../../styles/admin-messages.css'

function formatTime(value) {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

function formatListTime(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value))
}

export default function AdminMessages() {
  const [conversations, setConversations] = useState([])
  const [conversationsLoading, setConversationsLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [messages, setMessages] = useState([])
  const [threadLoading, setThreadLoading] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const historyRef = useRef(null)

  const fetchConversations = useCallback(async () => {
    try {
      const data = await loadAdminConversations()
      setConversations(data)
      return data
    } catch (err) {
      setError(err.message)
      return []
    } finally {
      setConversationsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConversations().then((data) => {
      if (data.length > 0) setSelectedId(data[0].id)
    })
  }, [fetchConversations])

  useEffect(() => {
    if (!selectedId) return
    let cancelled = false
    setThreadLoading(true)
    loadAdminConversation(selectedId)
      .then(({ messages: loaded }) => {
        if (!cancelled) setMessages(loaded)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setThreadLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedId])

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight
    }
  }, [messages])

  async function sendMessage(event) {
    event.preventDefault()
    const body = draft.trim()
    if (!body || sending || !selectedId) return
    setSending(true)
    setError('')
    try {
      const message = await sendAdminMessage(selectedId, body)
      setMessages((current) => [...current, message])
      setDraft('')
      fetchConversations()
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  const selectedConversation = conversations.find((conversation) => conversation.id === selectedId)

  return (
    <main className="admin-dashboard admin-messages-page">
      <AdminSidebar active="messages" />
      <section className="admin-workspace">
        <AdminTopbar />
        <div className="admin-messages-content">
          <header className="admin-messages-heading">
            <h1>Buyer Messages</h1>
            <p>Conversations started by buyers with AgriVerse Support.</p>
          </header>

          {error && <p className="admin-messages-error">{error}</p>}

          <div className="admin-messages-shell">
            <aside className="admin-messages-list" aria-label="Conversations">
              {conversationsLoading && <p className="admin-messages-empty">Loading conversations…</p>}
              {!conversationsLoading && conversations.length === 0 && (
                <p className="admin-messages-empty">No buyer messages yet.</p>
              )}
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  className={`admin-messages-list-item${conversation.id === selectedId ? ' is-active' : ''}`}
                  onClick={() => setSelectedId(conversation.id)}
                >
                  <span className="admin-messages-list-avatar" aria-hidden="true">
                    {(conversation.buyer?.full_name || 'B').charAt(0).toUpperCase()}
                  </span>
                  <span className="admin-messages-list-info">
                    <strong>{conversation.buyer?.full_name || 'Buyer'}</strong>
                    <span className="admin-messages-list-preview">{conversation.last_message?.body || 'No messages yet'}</span>
                  </span>
                  <span className="admin-messages-list-meta">
                    <time>{formatListTime(conversation.last_message_at)}</time>
                    {conversation.unread_count > 0 && (
                      <span className="admin-messages-unread">{conversation.unread_count}</span>
                    )}
                  </span>
                </button>
              ))}
            </aside>

            <div className="admin-messages-thread">
              {!selectedConversation && !conversationsLoading && (
                <p className="admin-messages-empty">Select a conversation to view messages.</p>
              )}

              {selectedConversation && (
                <>
                  <header className="admin-messages-thread-header">
                    <strong>{selectedConversation.buyer?.full_name || 'Buyer'}</strong>
                  </header>

                  <div className="admin-messages-history" ref={historyRef} aria-live="polite">
                    {threadLoading && <p className="admin-messages-empty">Loading messages…</p>}
                    {!threadLoading && messages.map((message) => (
                      <article
                        className={`admin-messages-bubble admin-messages-bubble--${message.sender_role}`}
                        key={message.id}
                      >
                        <p>{message.body}</p>
                        <time>{formatTime(message.created_at)}</time>
                      </article>
                    ))}
                  </div>

                  <form className="admin-messages-composer" onSubmit={sendMessage}>
                    <label className="sr-only" htmlFor="admin-message-input">Write a reply</label>
                    <input
                      id="admin-message-input"
                      type="text"
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder="Write a reply..."
                      disabled={sending}
                    />
                    <button type="submit" aria-label="Send message" disabled={sending || !draft.trim()}>
                      <Send aria-hidden="true" />
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
