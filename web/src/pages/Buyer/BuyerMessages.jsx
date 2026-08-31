import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { BuyerFooter, BuyerHeader } from '../../components/BuyerChrome.jsx'
import { loadBuyerMessages, sendBuyerMessage } from '../../services/buyerMessages.js'
import chatBackground from '../../assets/buyer/buyer-order-background.png'
import '../../styles/Buyer/buyerLanding.css'
import '../../styles/Buyer/messages.css'

function formatTime(value) {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

export default function BuyerMessages() {
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const historyRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    loadBuyerMessages()
      .then(({ messages: loaded }) => {
        if (!cancelled) setMessages(loaded)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight
    }
  }, [messages])

  async function sendMessage(event) {
    event.preventDefault()
    const body = draft.trim()
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

  return (
    <main className="buyer-page buyer-messages-page">
      <BuyerHeader />

      <section className="buyer-messages-shell" style={{ '--chat-background': `url(${chatBackground})` }} aria-labelledby="chat-title">
        <header className="buyer-messenger-header">
          <div className="buyer-messenger-contact">
            <h1 id="chat-title">AgriVerse Support</h1>
          </div>
        </header>

        <div className="buyer-chat-panel">
          <div className="buyer-chat-history" ref={historyRef} aria-label="Conversation with AgriVerse Support" aria-live="polite">
            {loading && <p className="buyer-chat-status">Loading conversation…</p>}
            {!loading && messages.length === 0 && (
              <p className="buyer-chat-status">Send a message to start a conversation with AgriVerse Support.</p>
            )}
            {messages.map((message) => (
              <article className={`buyer-chat-message buyer-chat-message--${message.sender_role === 'buyer' ? 'buyer' : 'farm'}`} key={message.id}>
                <div>
                  {message.sender_role === 'admin' && <strong>AgriVerse Support</strong>}
                  <p>{message.body}</p>
                  <time>{formatTime(message.created_at)}</time>
                </div>
              </article>
            ))}
          </div>

          {error && <p className="buyer-chat-error">{error}</p>}

          <form className="buyer-chat-composer" onSubmit={sendMessage}>
            <label className="sr-only" htmlFor="buyer-chat-message">Write a message</label>
            <input
              id="buyer-chat-message"
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Write a message..."
              disabled={sending}
            />
            <button className="buyer-chat-send" type="submit" aria-label="Send message" disabled={sending || !draft.trim()}>
              <Send aria-hidden="true" />
            </button>
          </form>
        </div>
      </section>

      <BuyerFooter />
    </main>
  )
}
