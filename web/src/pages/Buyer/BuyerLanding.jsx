import { BuyerFooter, BuyerHeader } from '../../components/BuyerChrome.jsx'
import buyerHomeBackground from '../../assets/buyer/buyer-home-background.png'
import orderPanel from '../../assets/buyer/pineapple-order.png'
import chatPanel from '../../assets/buyer/chat-farmer.png'
import '../../styles/Buyer/buyerLanding.css'

export default function BuyerLanding() {
  return (
    <main className="buyer-page">
      <BuyerHeader active="home" />
      <section className="buyer-home" id="home" aria-labelledby="buyer-welcome-title" style={{ backgroundImage: `url(${buyerHomeBackground})` }}>
        <h1 className="buyer-welcome" id="buyer-welcome-title">Welcome <strong>Buyer!</strong></h1>
        <nav className="buyer-home-actions" aria-label="Buyer actions">
          <a className="buyer-image-action buyer-order-action" id="orders" href="/buyer/order">
            <img src={orderPanel} alt="Order fresh pineapples — Order now" />
          </a>
          <a className="buyer-image-action buyer-chat-action" id="messages" href="#messages">
            <img src={chatPanel} alt="Chat with the farm — Directly message the farm" />
          </a>
        </nav>
      </section>
      <BuyerFooter />
    </main>
  )
}
