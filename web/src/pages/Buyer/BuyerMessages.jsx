import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCheck, Clock, Send, Sparkles, Sprout } from 'lucide-react'
import { BuyerFooter, BuyerHeader } from '../../components/BuyerChrome.jsx'
import { loadBuyerMessages, sendBuyerMessage } from '../../services/buyerMessages.js'
import '../../styles/Buyer/buyerLanding.css'
import '../../styles/Buyer/messages.css'

function formatTime(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

function formatDateSeparator(value) {
  if (!value) return ''
  const date = new Date(value)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  }
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  }
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

const QUICK_SUGGESTIONS = [
  '📦 What is the status of my order?',
  '🍍 How fresh are the pineapples upon delivery?',
  '🚚 When will my order arrive?',
  '💳 What payment options do you support?',
]

export default function BuyerMessages() {
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const historyRef = useRef(null)

  const fetchMessages = useCallback(async (isBackground = false) => {
    try {
      const { messages: loaded } = await loadBuyerMessages()
      setMessages(loaded)
      setError('')
    } catch (err) {
      if (!isBackground) setError(err.message)
    } finally {
      if (!isBackground) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    fetchMessages()

    // Periodically poll for new replies every 7 seconds
    const interval = setInterval(() => {
      fetchMessages(true)
    }, 7000)

    return () => clearInterval(interval)
  }, [fetchMessages])

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight
    }
  }, [messages])

  async function handleSend(textToSend) {
    const body = (textToSend || draft).trim()
    if (!body || sending) return
    setSending(true)
    setError('')
    try {
      const { message } = await sendBuyerMessage(body)
      setMessages((current) => [...current, message])
      setDraft('')
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

  return (
    <main className="buyer-page buyer-messages-page">
      <BuyerHeader />

      <div className="buyer-messages-container">
        <section className="buyer-messages-shell" aria-labelledby="chat-title">
          {/* Header */}
          <header className="buyer-messenger-header">
            <div className="buyer-messenger-brand-row">
              <div className="buyer-support-avatar-wrapper">
                <div className="buyer-support-avatar">
                  <Sprout className="support-icon" aria-hidden="true" />
                </div>
                <span className="buyer-support-status-dot" title="Online" />
              </div>

              <div className="buyer-messenger-contact">
                <div className="buyer-contact-title-row">
                  <h1 id="chat-title">JToledo Farm</h1>
                </div>
              </div>
            </div>
          </header>


          {/* Chat History Panel */}
          <div className="buyer-chat-panel">
            <div
              className="buyer-chat-history"
              ref={historyRef}
              aria-label="Conversation with JToledo Farm"
              aria-live="polite"
            >
              {loading && (
                <div className="buyer-chat-loading-state">
                  <div className="buyer-loading-spinner" />
                  <p>Connecting to JToledo Farm…</p>
                </div>
              )}

              {!loading && messages.length === 0 && (
                <div className="buyer-chat-empty-state">
                  <div className="empty-state-icon">
                    <Sparkles size={28} />
                  </div>
                  <h3>Welcome to JToledo Farm</h3>
                  <p>
                    Have questions about your order, delivery schedule, or pineapple freshness?
                    Our farm support team is here to assist you.
                  </p>

                  <div className="buyer-quick-suggestions">
                    <span className="quick-suggestions-label">Frequently Asked:</span>
                    <div className="suggestions-list">
                      {QUICK_SUGGESTIONS.map((suggestion, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="suggestion-chip"
                          onClick={() => handleSend(suggestion.replace(/^[^\w]+/, ''))}
                          disabled={sending}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {!loading &&
                messages.map((message, index) => {
                  const isBuyer = message.sender_role === 'buyer'
                  const prevMessage = index > 0 ? messages[index - 1] : null
                  const showDate =
                    !prevMessage ||
                    new Date(message.created_at).toDateString() !==
                      new Date(prevMessage.created_at).toDateString()

                  return (
                    <div key={message.id} className="buyer-chat-item-group">
                      {showDate && (
                        <div className="buyer-chat-date-divider">
                          <span>{formatDateSeparator(message.created_at)}</span>
                        </div>
                      )}

                      <article
                        className={`buyer-chat-message ${
                          isBuyer ? 'buyer-chat-message--buyer' : 'buyer-chat-message--farm'
                        }`}
                      >
                        {!isBuyer && (
                          <div className="buyer-message-avatar" aria-hidden="true">
                            <Sprout size={16} />
                          </div>
                        )}

                        <div className="buyer-message-content">
                          {!isBuyer && (
                            <span className="buyer-message-sender-name">JToledo Farm</span>
                          )}
                          <div className="buyer-bubble">
                            <p>{message.body}</p>
                          </div>
                          <div className="buyer-message-meta">
                            <time dateTime={message.created_at}>
                              <Clock size={11} className="time-icon" aria-hidden="true" />
                              {formatTime(message.created_at)}
                            </time>
                            {isBuyer && (
                              <CheckCheck size={13} className="delivered-icon" aria-hidden="true" />
                            )}
                          </div>
                        </div>
                      </article>
                    </div>
                  )
                })}
            </div>

            {error && (
              <div className="buyer-chat-error-banner">
                <span>{error}</span>
                <button type="button" onClick={() => fetchMessages(false)}>
                  Retry
                </button>
              </div>
            )}

            {/* Composer */}
            <form className="buyer-chat-composer" onSubmit={onSubmit}>
              <label className="sr-only" htmlFor="buyer-chat-message">
                Write a message to JToledo Farm
              </label>
              <div className="buyer-input-wrapper">
                <input
                  id="buyer-chat-message"
                  type="text"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message to JToledo Farm..."
                  disabled={sending}
                  autoComplete="off"
                />
              </div>

              <button
                className="buyer-chat-send"
                type="submit"
                aria-label="Send message"
                disabled={sending || !draft.trim()}
              >
                <Send size={18} aria-hidden="true" />
              </button>
            </form>
          </div>
        </section>
      </div>

      <BuyerFooter />
    </main>
  )
}


