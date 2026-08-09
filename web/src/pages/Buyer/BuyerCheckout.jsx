import { useMemo, useState } from 'react'
import {
  Banknote,
  Check,
  CreditCard,
  PackageCheck,
  QrCode,
  Truck,
  WalletCards,
} from 'lucide-react'
import { BuyerFooter, BuyerHeader } from '../../components/BuyerChrome.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import pineappleImage from '../../assets/buyer/pineapple-product-clean.png'
import '../../styles/Buyer/buyerLanding.css'
import '../../styles/Buyer/checkout.css'

const orderItems = [
  { id: 'small', name: 'Pineapple', size: 'Small', quantity: 13, total: 1500 },
  { id: 'medium', name: 'Pineapple', size: 'Medium', quantity: 6, total: 2500 },
]

function ChoiceCard({ checked, children, className = '', onSelect }) {
  return (
    <button
      className={`checkout-choice ${checked ? 'is-selected' : ''} ${className}`}
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
    >
      {children}
      <span className="checkout-radio" aria-hidden="true" />
    </button>
  )
}

export default function BuyerCheckout() {
  const { profile } = useAuth()
  const [deliveryMethod, setDeliveryMethod] = useState('delivery')
  const [paymentMethod, setPaymentMethod] = useState('bank')
  const [notes, setNotes] = useState('')
  const [placed, setPlaced] = useState(false)

  const address = useMemo(() => {
    const locality = [profile?.barangay, profile?.city_municipality].filter(Boolean).join(', ')
    const region = [profile?.province, profile?.region, profile?.country].filter(Boolean).join(', ')
    return {
      locality: locality || '123 Market Street, Manila City',
      region: region || 'Metro Manila, Philippines',
    }
  }, [profile])

  function placeOrder(event) {
    event.preventDefault()
    setPlaced(true)
  }

  return (
    <main className="buyer-page checkout-page">
      <BuyerHeader active="orders" cartCount={1} />

      <div className="checkout-shell">
        <header className="checkout-heading">
          <h1>Delivery Information</h1>
          <p>Fill up the form, choose a payment method, and place your order.</p>
        </header>

        <section className="checkout-card checkout-address" aria-labelledby="delivery-address-title">
          <div className="checkout-address-head">
            <h2 id="delivery-address-title">{profile?.full_name || 'Juan Dela Cruz'}</h2>
            <a href="/buyer/profile">Edit</a>
          </div>
          <div className="checkout-address-rule" />
          <address>
            {address.locality}<br />
            {address.region}<br />
            {profile?.mobile_number || '+639823273621'}
          </address>
        </section>

        <section className="checkout-card checkout-summary" aria-labelledby="checkout-summary-title">
          <h2 id="checkout-summary-title">Order Summary</h2>
          <div className="checkout-items">
            {orderItems.map((item) => (
              <article className="checkout-item" key={item.id}>
                <img src={pineappleImage} alt={`${item.size} pineapple`} />
                <div>
                  <h3>{item.name}</h3>
                  <p>{item.size}</p>
                  <small>Qty:{item.quantity}</small>
                </div>
                <strong>PHP {item.total.toLocaleString()}</strong>
              </article>
            ))}
          </div>
          <div className="checkout-total"><span>Order Total</span><strong>PHP 3500</strong></div>
        </section>

        <form className="checkout-card checkout-options" onSubmit={placeOrder}>
          <section className="checkout-column" aria-labelledby="delivery-method-title">
            <h2 id="delivery-method-title">Select Delivery Method</h2>
            <div className="checkout-choice-list" role="radiogroup" aria-labelledby="delivery-method-title">
              <ChoiceCard checked={deliveryMethod === 'delivery'} onSelect={() => setDeliveryMethod('delivery')}>
                <Truck aria-hidden="true" />
                <span><strong>Standard Delivery</strong><small>Delivery service straight to your address.</small></span>
              </ChoiceCard>
              <ChoiceCard checked={deliveryMethod === 'pickup'} onSelect={() => setDeliveryMethod('pickup')}>
                <PackageCheck aria-hidden="true" />
                <span><strong>On-site Pickup</strong><small>Pick up your order directly at the store at your convenience.</small></span>
              </ChoiceCard>
            </div>

            <label className="checkout-notes-label" htmlFor="checkout-notes">Add additional Information</label>
            <textarea id="checkout-notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </section>

          <section className="checkout-column" aria-labelledby="payment-method-title">
            <h2 id="payment-method-title">Select Payment Method</h2>
            <div className="checkout-choice-list" role="radiogroup" aria-labelledby="payment-method-title">
              <ChoiceCard checked={paymentMethod === 'cash'} onSelect={() => setPaymentMethod('cash')}>
                <Banknote aria-hidden="true" />
                <span><strong>Cash On Delivery</strong><small>Pay with cash when your pineapple arrive at your facility</small></span>
              </ChoiceCard>
              <ChoiceCard checked={paymentMethod === 'bank'} className="checkout-bank" onSelect={() => setPaymentMethod('bank')}>
                <CreditCard aria-hidden="true" />
                <span><strong>Bank Transfer</strong><small>Transfer directly to our Bank Account</small></span>
                <div className="checkout-bank-details">
                  <dl>
                    <div><dt>Account Name</dt><dd>Joseph Toledo</dd></div>
                    <div><dt>Bank Name</dt><dd>BDO</dd></div>
                    <div><dt>Account Number</dt><dd>J090037738346</dd></div>
                  </dl>
                  <div className="checkout-qr"><strong>Scan to Pay</strong><QrCode aria-hidden="true" /></div>
                </div>
              </ChoiceCard>
              <ChoiceCard checked={paymentMethod === 'gcash'} onSelect={() => setPaymentMethod('gcash')}>
                <WalletCards aria-hidden="true" />
                <span><strong>Gcash</strong><small>Pay securely with GCASH mobile wallet</small></span>
              </ChoiceCard>
            </div>
          </section>

          <button className="checkout-submit" type="submit">Place Order</button>
          {placed && (
            <div className="checkout-success" role="status">
              <span><Check aria-hidden="true" /> Your order has been placed successfully.</span>
              <a href="/buyer/delivery-progress">Track Delivery</a>
            </div>
          )}
        </form>

        <p className="checkout-terms">By placing your order, you agree to our <a href="#terms">Terms &amp; Condition</a></p>
      </div>

      <BuyerFooter />
    </main>
  )
}
