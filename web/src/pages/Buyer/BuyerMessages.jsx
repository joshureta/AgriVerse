import { useState } from 'react'
import { Send } from 'lucide-react'
import { BuyerFooter, BuyerHeader } from '../../components/BuyerChrome.jsx'
import chatFarmLogo from '../../assets/buyer/chat-farm-logo.png'
import chatBackground from '../../assets/buyer/buyer-order-background.png'
import '../../styles/Buyer/buyerLanding.css'
import '../../styles/Buyer/messages.css'

const initialMessages = [
  { id: 'farm-welcome', sender: 'farm', body: 'Hello! How can we help you today?', time: '3 minutes ago' },
  { id: 'buyer-question', sender: 'buyer', body: 'Hello! Are these pineapples fresh from harvest?', time: '2 minutes ago' },
]

export default function BuyerMessages() {
  const [messages, setMessages] = useState(initialMessages)
  const [draft, setDraft] = useState('')

  function sendMessage(event) {
    event.preventDefault()
    const body = draft.trim()
    if (!body) return
    setMessages((current) => [...current, { id: `buyer-${Date.now()}`, sender: 'buyer', body, time: 'Just now' }])
    setDraft('')
  }

  return (
    <main className="buyer-page buyer-messages-page">
      <BuyerHeader />

      <section className="buyer-messages-shell" style={{ '--chat-background': `url(${chatBackground})` }} aria-labelledby="chat-title">
        <header className="buyer-messenger-header">
          <img src={chatFarmLogo} alt="JToledo Trading" />
          <div className="buyer-messenger-contact">
            <h1 id="chat-title">JToledo Trading</h1>
          </div>
        </header>

        <div className="buyer-chat-panel">
          <div className="buyer-chat-history" aria-label="Conversation with JToledo Trading" aria-live="polite">
            {messages.map((message) => (
              <article className={`buyer-chat-message buyer-chat-message--${message.sender}`} key={message.id}>
                {message.sender === 'farm' && <img src={chatFarmLogo} alt="" aria-hidden="true" />}
                <div>
                  {message.sender === 'farm' && <strong>JToledo Trading</strong>}
                  <p>{message.body}</p>
                  <time>{message.time}</time>
                </div>
              </article>
            ))}
          </div>

          <form className="buyer-chat-composer" onSubmit={sendMessage}>
            <label className="sr-only" htmlFor="buyer-chat-message">Write a message</label>
            <input id="buyer-chat-message" type="text" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a message..." />
            <button className="buyer-chat-send" type="submit" aria-label="Send message"><Send aria-hidden="true" /></button>
          </form>
        </div>
      </section>

      <BuyerFooter />
    </main>
  )
}
