import { useEffect, useMemo, useState } from 'react'
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
import {
  loadPineappleProducts,
  placeBuyerOrder,
  readBuyerCart,
  writeBuyerCart,
} from '../../services/buyerMarketplace.js'
import '../../styles/Buyer/buyerLanding.css'
import '../../styles/Buyer/checkout.css'

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
  const [items, setItems] = useState([])
  const [deliveryMethod, setDeliveryMethod] = useState('delivery')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [placedOrder, setPlacedOrder] = useState(null)

  useEffect(() => {
    let active = true
    async function prepareCheckout() {
      const savedItems = readBuyerCart()
      if (savedItems.length === 0) {
        if (active) setLoading(false)
        return
      }
      try {
        const products = await loadPineappleProducts()
        const productById = new Map(products.map((product) => [String(product.id), product]))
        const verifiedItems = savedItems.flatMap((savedItem) => {
          const product = productById.get(String(savedItem.id))
          if (!product || product.stock_quantity <= 0) return []
          const quantity = Math.min(Number(savedItem.quantity) || 0, product.stock_quantity)
          return quantity > 0 ? [{ ...product, quantity }] : []
        })
        if (!active) return
        setItems(verifiedItems)
        writeBuyerCart(verifiedItems)
        if (verifiedItems.length !== savedItems.length
          || verifiedItems.some((item, index) => item.quantity !== Number(savedItems[index]?.quantity))) {
          setNotice('Your order was updated to match the latest available stock.')
        }
      } catch (requestError) {
        if (active) setError(requestError.message)
      } finally {
        if (active) setLoading(false)
      }
    }
    prepareCheckout()
    return () => { active = false }
  }, [])

  const address = useMemo(() => {
    const locality = [profile?.barangay, profile?.city_municipality].filter(Boolean).join(', ')
    const region = [profile?.province, profile?.region, profile?.country].filter(Boolean).join(', ')
    return {
      locality: locality || 'Address not provided',
      region: region || 'Location not provided',
    }
  }, [profile])

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const shippingFee = deliveryMethod === 'delivery' && items.length > 0 ? 100 : 0
  const total = subtotal + shippingFee

  async function submitOrder(event) {
    event.preventDefault()
    if (items.length === 0 || placedOrder) return
    setPlacing(true)
    setError('')
    try {
      const order = await placeBuyerOrder({
        delivery_method: deliveryMethod,
        payment_method: paymentMethod,
        customer_note: notes,
        items: items.map((item) => ({ product_id: item.id, quantity: item.quantity })),
      })
      writeBuyerCart([])
      setPlacedOrder(order)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setPlacing(false)
    }
  }

  return (
    <main className="buyer-page checkout-page">
      <BuyerHeader active="orders" cartCount={placedOrder ? 0 : items.length} />

      <div className="checkout-shell">
        <header className="checkout-heading">
          <h1>Delivery Information</h1>
          <p>Review your order, select delivery and payment options, then place your order.</p>
        </header>

        {notice && <p className="checkout-notice" role="status">{notice}</p>}
        {error && <div className="checkout-error" role="alert">{error}</div>}

        <section className="checkout-card checkout-address" aria-labelledby="delivery-address-title">
          <div className="checkout-address-head">
            <h2 id="delivery-address-title">{profile?.full_name || 'Buyer'}</h2>
            <a href="/buyer/profile">Edit information</a>
          </div>
          <div className="checkout-address-rule" />
          <address>
            {address.locality}<br />
            {address.region}<br />
            {profile?.mobile_number || 'Mobile number not provided'}
          </address>
        </section>

        <section className="checkout-card checkout-summary" aria-labelledby="checkout-summary-title">
          <h2 id="checkout-summary-title">Order Summary</h2>
          {loading ? <p className="checkout-empty">Checking cart and inventory…</p>
            : items.length > 0 ? <div className="checkout-items">
              {items.map((item) => (
                <article className="checkout-item" key={item.id}>
                  <img src={pineappleImage} alt={item.name} />
                  <div>
                    <h3>{item.name}</h3>
                    <p>{item.weight}</p>
                    <small>Quantity: {item.quantity}</small>
                  </div>
                  <strong>PHP {(item.price * item.quantity).toLocaleString()}</strong>
                </article>
              ))}
            </div> : <div className="checkout-empty">Your cart is empty. <a href="/buyer/order">Return to the Order page</a>.</div>}
          <div className="checkout-price-breakdown">
            <div><span>Subtotal</span><strong>PHP {subtotal.toLocaleString()}</strong></div>
            <div><span>Shipping Fee</span><strong>PHP {shippingFee.toLocaleString()}</strong></div>
          </div>
          <div className="checkout-total"><span>Order Total</span><strong>PHP {total.toLocaleString()}</strong></div>
        </section>

        <form className="checkout-card checkout-options" onSubmit={submitOrder}>
          <section className="checkout-column" aria-labelledby="delivery-method-title">
            <h2 id="delivery-method-title">Delivery Method</h2>
            <div className="checkout-choice-list" role="radiogroup" aria-labelledby="delivery-method-title">
              <ChoiceCard checked={deliveryMethod === 'delivery'} onSelect={() => setDeliveryMethod('delivery')}>
                <Truck aria-hidden="true" />
                <span><strong>Standard Delivery</strong><small>Delivery service straight to your registered address.</small></span>
              </ChoiceCard>
              <ChoiceCard checked={deliveryMethod === 'pickup'} onSelect={() => setDeliveryMethod('pickup')}>
                <PackageCheck aria-hidden="true" />
                <span><strong>On-site Pickup</strong><small>Collect your order directly from JToledo Trading.</small></span>
              </ChoiceCard>
            </div>

            <label className="checkout-notes-label" htmlFor="checkout-notes">Additional information</label>
            <textarea id="checkout-notes" value={notes} maxLength="1000" onChange={(event) => setNotes(event.target.value)} placeholder="Delivery instructions or order notes (optional)" />
          </section>

          <section className="checkout-column" aria-labelledby="payment-method-title">
            <h2 id="payment-method-title">Payment Method</h2>
            <div className="checkout-choice-list" role="radiogroup" aria-labelledby="payment-method-title">
              <ChoiceCard checked={paymentMethod === 'cash'} onSelect={() => setPaymentMethod('cash')}>
                <Banknote aria-hidden="true" />
                <span><strong>Cash on Delivery</strong><small>Pay with cash when your pineapples arrive.</small></span>
              </ChoiceCard>
              <ChoiceCard checked={paymentMethod === 'bank'} className="checkout-bank" onSelect={() => setPaymentMethod('bank')}>
                <CreditCard aria-hidden="true" />
                <span><strong>Bank Transfer</strong><small>Transfer directly to the JToledo bank account.</small></span>
                {paymentMethod === 'bank' && <div className="checkout-bank-details">
                  <dl>
                    <div><dt>Account Name</dt><dd>Joseph Toledo</dd></div>
                    <div><dt>Bank Name</dt><dd>BDO</dd></div>
                    <div><dt>Account Number</dt><dd>J090037738346</dd></div>
                  </dl>
                  <div className="checkout-qr"><strong>Scan to Pay</strong><QrCode aria-hidden="true" /></div>
                </div>}
              </ChoiceCard>
              <ChoiceCard checked={paymentMethod === 'gcash'} onSelect={() => setPaymentMethod('gcash')}>
                <WalletCards aria-hidden="true" />
                <span><strong>GCash</strong><small>Pay securely using your GCash mobile wallet.</small></span>
              </ChoiceCard>
            </div>
          </section>

          <button className="checkout-submit" type="submit" disabled={loading || placing || items.length === 0 || Boolean(placedOrder)}>
            {placing ? 'Placing order…' : placedOrder ? 'Order placed' : 'Place Order'}
          </button>
          {placedOrder && (
            <div className="checkout-success" role="status">
              <span><Check aria-hidden="true" /> Order <strong>{placedOrder.order_number}</strong> was placed successfully.</span>
              <a href="/buyer/delivery-progress">Track Delivery</a>
            </div>
          )}
        </form>

        <p className="checkout-terms">By placing your order, you agree to our <a href="#terms">Terms &amp; Conditions</a>.</p>
      </div>

      <BuyerFooter />
    </main>
  )
}
