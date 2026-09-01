import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CheckCheck, ChevronDown, Clock, MessageSquare, Search, Send } from 'lucide-react'
import { AdminSidebar, AdminTopbar } from '../../components/AdminNavigation.jsx'
import { loadAdminConversation, loadAdminConversations, sendAdminMessage } from '../../services/adminMessages.js'
import '../../styles/admin-dashboard.css'
import '../../styles/admin-messages.css'

function formatTime(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

function formatListTime(value) {
  if (!value) return ''
  const date = new Date(value)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) {
    return formatTime(value)
  }
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date)
}

export default function AdminMessages() {
  const [conversations, setConversations] = useState([])
  const [conversationsLoading, setConversationsLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [messages, setMessages] = useState([])
  const [threadLoading, setThreadLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [showJumpToLatest, setShowJumpToLatest] = useState(false)
  const historyRef = useRef(null)
  const shouldScrollToLatestRef = useRef(true)

  function updateJumpToLatest() {
    const history = historyRef.current
    if (!history) return
    setShowJumpToLatest(history.scrollHeight - history.scrollTop - history.clientHeight > 48)
  }

  function scrollToLatest(behavior = 'smooth') {
    const history = historyRef.current
    if (!history) return
    history.scrollTo({ top: history.scrollHeight, behavior })
    setShowJumpToLatest(false)
  }

  const fetchConversations = useCallback(async (isBackground = false) => {
    try {
      const data = await loadAdminConversations()
      setConversations(data)
      return data
    } catch (err) {
      if (!isBackground) setError(err.message)
      return []
    } finally {
      if (!isBackground) setConversationsLoading(false)
    }
  }, [])

  const fetchCurrentThread = useCallback(async (id, isBackground = false) => {
    if (!id) return
    if (!isBackground) setThreadLoading(true)
    try {
      const { messages: loaded } = await loadAdminConversation(id)
      setMessages(loaded)
    } catch (err) {
      if (!isBackground) setError(err.message)
    } finally {
      if (!isBackground) setThreadLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConversations().then((data) => {
      if (data.length > 0) setSelectedId((curr) => curr || data[0].id)
    })
  }, [fetchConversations])

  // Poll for conversation list and active thread updates every 7s
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations(true)
      if (selectedId) {
        fetchCurrentThread(selectedId, true)
      }
    }, 7000)

    return () => clearInterval(interval)
  }, [fetchConversations, fetchCurrentThread, selectedId])

  useEffect(() => {
    if (selectedId) {
      shouldScrollToLatestRef.current = true
      fetchCurrentThread(selectedId, false)
    }
  }, [selectedId, fetchCurrentThread])

  useEffect(() => {
    if (shouldScrollToLatestRef.current) {
      scrollToLatest('auto')
      shouldScrollToLatestRef.current = false
    } else {
      updateJumpToLatest()
    }
  }, [messages])

  async function handleSend() {
    const body = draft.trim()
    if (!body || sending || !selectedId) return
    setSending(true)
    setError('')
    try {
      const message = await sendAdminMessage(selectedId, body)
      shouldScrollToLatestRef.current = true
      setMessages((current) => [...current, message])
      setDraft('')
      fetchConversations(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  function onSubmit(event) {
    event.preventDefault()
    handleSend()
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations
    const q = searchQuery.toLowerCase()
    return conversations.filter(
      (c) =>
        c.buyer?.full_name?.toLowerCase().includes(q) ||
        c.last_message?.body?.toLowerCase().includes(q)
    )
  }, [conversations, searchQuery])

  const selectedConversation = conversations.find((c) => c.id === selectedId)

  return (
    <main className="admin-dashboard admin-messages-page">
      <AdminSidebar active="messages" />
      <section className="admin-workspace">
        <AdminTopbar />

        <div className="admin-messages-content">
          {error && <div className="admin-messages-error">{error}</div>}

          <div className="admin-messages-shell">
            {/* Sidebar list */}
            <aside className="admin-messages-list" aria-label="Buyer Conversations">
              <div className="admin-messages-search-bar">
                <div className="admin-search-input-wrapper">
                  <Search size={16} className="search-icon" aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Search buyers or messages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="admin-messages-scroll-list">
                {conversationsLoading && (
                  <p className="admin-messages-empty">Loading conversations…</p>
                )}

                {!conversationsLoading && filteredConversations.length === 0 && (
                  <div className="admin-messages-empty-list">
                    <MessageSquare size={28} />
                    <p>{searchQuery ? 'No matching buyers found' : 'No buyer messages yet.'}</p>
                  </div>
                )}

                {filteredConversations.map((conversation) => {
                  const isActive = conversation.id === selectedId
                  const initial = (conversation.buyer?.full_name || 'B').charAt(0).toUpperCase()

                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      className={`admin-messages-list-item${isActive ? ' is-active' : ''}`}
                      onClick={() => setSelectedId(conversation.id)}
                    >
                      <div className="admin-messages-list-avatar" aria-hidden="true">
                        {initial}
                      </div>

                      <div className="admin-messages-list-info">
                        <div className="admin-item-top">
                          <strong className="admin-item-name">
                            {conversation.buyer?.full_name || 'Buyer'}
                          </strong>
                          <time className="admin-item-time">
                            {formatListTime(conversation.last_message_at)}
                          </time>
                        </div>

                        <div className="admin-item-bottom">
                          <span className="admin-messages-list-preview">
                            {conversation.last_message?.body || 'No messages yet'}
                          </span>
                          {conversation.unread_count > 0 && (
                            <span className="admin-messages-unread">
                              {conversation.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </aside>

            {/* Active Thread */}
            <div className="admin-messages-thread">
              {!selectedConversation && !conversationsLoading && (
                <div className="admin-messages-thread-placeholder">
                  <div className="placeholder-icon">
                    <MessageSquare size={36} />
                  </div>
                  <h3>Customer Messages</h3>
                  <p>Select a buyer from the list on the left to review or reply to messages.</p>
                </div>
              )}

              {selectedConversation && (
                <>
                  <header className="admin-messages-thread-header">
                    <div className="admin-thread-user-info">
                      <div className="admin-thread-avatar">
                        {(selectedConversation.buyer?.full_name || 'B').charAt(0).toUpperCase()}
                      </div>
                      <div className="admin-thread-details">
                        <h2>{selectedConversation.buyer?.full_name || 'Buyer'}</h2>
                      </div>
                    </div>
                  </header>

                  <div
                    className="admin-messages-history"
                    ref={historyRef}
                    onScroll={updateJumpToLatest}
                    aria-live="polite"
                  >
                    {threadLoading && (
                      <p className="admin-messages-empty">Loading messages…</p>
                    )}

                    {!threadLoading &&
                      messages.map((message) => {
                        const isAdmin = message.sender_role === 'admin'

                        return (
                          <article
                            className={`admin-messages-bubble admin-messages-bubble--${
                              isAdmin ? 'admin' : 'buyer'
                            }`}
                            key={message.id}
                          >
                            <div className="admin-bubble-body">
                              <p>{message.body}</p>
                            </div>
                            <div className="admin-bubble-meta">
                              <time dateTime={message.created_at}>
                                <Clock size={10} aria-hidden="true" />
                                {formatTime(message.created_at)}
                              </time>
                              {isAdmin && (
                                <CheckCheck size={12} className="admin-check" aria-hidden="true" />
                              )}
                            </div>
                          </article>
                        )
                    })}
                  </div>

                  {showJumpToLatest && (
                    <button
                      type="button"
                      className="chat-jump-to-latest admin-chat-jump-to-latest"
                      onClick={() => scrollToLatest()}
                      aria-label="Scroll to latest message"
                    >
                      <ChevronDown size={18} aria-hidden="true" />
                      <span>Latest</span>
                    </button>
                  )}

                  <form className="admin-messages-composer" onSubmit={onSubmit}>
                    <label className="sr-only" htmlFor="admin-message-input">
                      Write a reply to {selectedConversation.buyer?.full_name || 'Buyer'}
                    </label>
                    <div className="admin-composer-input-wrapper">
                      <input
                        id="admin-message-input"
                        type="text"
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={`Reply to ${selectedConversation.buyer?.full_name || 'Buyer'}...`}
                        disabled={sending}
                        autoComplete="off"
                      />
                    </div>
                    <button
                      type="submit"
                      className="admin-send-btn"
                      aria-label="Send reply"
                      disabled={sending || !draft.trim()}
                    >
                      <Send size={18} aria-hidden="true" />
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

