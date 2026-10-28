import { useEffect, useMemo, useState } from 'react'
import {
  CircleAlert,
  Check,
  WalletCards,
  X,
} from 'lucide-react'
import { BuyerFooter, BuyerHeader, BuyerJourneyNav } from '../../components/BuyerChrome.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { clearCheckoutRequestKey, getCheckoutRequestKey } from '../../services/checkoutAttempt.js'
import pineappleImage from '../../assets/buyer/pineapple-product-clean.png'
import cashIcon from '../../assets/buyer/checkout/cash.png'
import deliveryIcon from '../../assets/buyer/checkout/delivery.png'
import pickupIcon from '../../assets/buyer/checkout/pickup.png'
import {
  createGcashCheckout,
  loadPineappleProducts,
  buyerCartQuantity,
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

function CheckoutIcon({ name }) {
  const icons = { cash: cashIcon, delivery: deliveryIcon, pickup: pickupIcon }
  return <img className="checkout-generated-icon" src={icons[name]} alt="" aria-hidden="true" />
}

const emptyAddress = {
  full_name: '', mobile_number: '', country: '', region: '', province: '', city_municipality: '', barangay: '',
}

function addressIsComplete(address) {
  return ['full_name', 'mobile_number', 'country', 'region', 'city_municipality', 'barangay']
    .every((field) => String(address[field] || '').trim())
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
  const [orderConnectionUncertain, setOrderConnectionUncertain] = useState(false)
  const [notice, setNotice] = useState('')
  const [placedOrder, setPlacedOrder] = useState(null)
  const [orderToastVisible, setOrderToastVisible] = useState(false)
  const [addressModalOpen, setAddressModalOpen] = useState(false)
  const [orderAddress, setOrderAddress] = useState(null)
  const [alternateAddress, setAlternateAddress] = useState(emptyAddress)
  const [retryingPayment, setRetryingPayment] = useState(false)

  async function retryOnlinePayment() {
    if (!placedOrder || retryingPayment) return
    setRetryingPayment(true)
    setError('')
    try {
      const checkoutUrl = await createGcashCheckout(placedOrder.id)
      window.location.href = checkoutUrl
    } catch (requestError) {
      setError(requestError.message)
      setRetryingPayment(false)
    }
  }

  useEffect(() => {
    if (!error || orderConnectionUncertain) return undefined
    const dismissTimer = window.setTimeout(() => setError(''), 4000)
    return () => window.clearTimeout(dismissTimer)
  }, [error, orderConnectionUncertain])

  useEffect(() => {
    if (!error && orderConnectionUncertain) setOrderConnectionUncertain(false)
  }, [error, orderConnectionUncertain])

  useEffect(() => {
    if (!placedOrder || placedOrder.payment_method === 'gcash') return undefined
    const redirectTimer = window.setTimeout(() => {
      window.location.replace(`/buyer/delivery-progress?track=${encodeURIComponent(placedOrder.id)}`)
    }, 2000)
    return () => window.clearTimeout(redirectTimer)
  }, [placedOrder])

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

  const savedAddress = useMemo(() => ({
    full_name: profile?.full_name || '',
    mobile_number: profile?.mobile_number || '',
    country: profile?.country || '',
    region: profile?.region || '',
    province: profile?.province || '',
    city_municipality: profile?.city_municipality || '',
    barangay: profile?.barangay || '',
  }), [profile])

  const deliveryAddress = orderAddress || savedAddress

  const address = useMemo(() => {
    const locality = [deliveryAddress.barangay, deliveryAddress.city_municipality].filter(Boolean).join(', ')
    const region = [deliveryAddress.province, deliveryAddress.region, deliveryAddress.country].filter(Boolean).join(', ')
    return { locality, region }
  }, [deliveryAddress])

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const shippingFee = deliveryMethod === 'delivery' && items.length > 0 ? 100 : 0
  const total = subtotal + shippingFee
  let orderButtonLabel = 'Place Order'
  if (placing) orderButtonLabel = 'Placing order…'
  else if (placedOrder) orderButtonLabel = 'Order placed'
  else if (deliveryMethod === 'delivery' && !addressIsComplete(deliveryAddress)) orderButtonLabel = 'Add delivery address'

  function closeAddressModal() {
    setAddressModalOpen(false)
    setError('')
  }

  function openAddressEditor() {
    setAlternateAddress({ ...emptyAddress, ...deliveryAddress, country: deliveryAddress.country || 'Philippines' })
    setAddressModalOpen(true)
    setError('')
  }

  function saveAddressForOrder() {
    if (!addressIsComplete(alternateAddress)) return
    setOrderAddress(Object.fromEntries(
      Object.keys(emptyAddress).map((field) => [field, String(alternateAddress[field] || '').trim()]),
    ))
    closeAddressModal()
  }
  async function completeOrder(confirmedAddress = null) {
    if (items.length === 0 || placedOrder || placing) return
    setPlacing(true)
    setOrderConnectionUncertain(false)
    setError('')
    try {
      const orderDetails = {
        delivery_method: deliveryMethod,
        payment_method: paymentMethod,
        customer_note: notes,
        delivery_address: deliveryMethod === 'delivery' ? confirmedAddress : null,
        items: items.map((item) => ({ product_id: item.id, quantity: item.quantity })),
      }
      const order = await placeBuyerOrder({
        ...orderDetails,
        idempotency_key: getCheckoutRequestKey(orderDetails),
      })
      setPlacedOrder({ ...order, payment_method: paymentMethod })
      try {
        writeBuyerCart([])
        clearCheckoutRequestKey()
      } catch {
        setNotice('Your order was placed, but the cart could not be cleared on this device.')
      }

      if (paymentMethod === 'gcash') {
        try {
          const checkoutUrl = await createGcashCheckout(order.id)
          window.location.href = checkoutUrl
          return
        } catch (paymentError) {
          setOrderToastVisible(true)
          setError(`Order placed, but GCash checkout could not be started: ${paymentError.message}. You can retry payment below.`)
          return
        }
      }

      setOrderToastVisible(true)
    } catch (requestError) {
      setOrderConnectionUncertain(requestError.code === 'CHECKOUT_CONNECTION_UNCERTAIN')
      setError(requestError.message)
    } finally {
      setPlacing(false)
    }
  }

  async function submitOrder(event) {
    event.preventDefault()
    if (items.length === 0 || placedOrder) return
    if (deliveryMethod === 'delivery' && !addressIsComplete(deliveryAddress)) {
      openAddressEditor()
      return
    }
    await completeOrder(deliveryMethod === 'delivery' ? deliveryAddress : null)
  }
  return (
    <main className="buyer-page checkout-page">
      <BuyerHeader active="orders" cartCount={placedOrder ? 0 : buyerCartQuantity(items)} />
      <BuyerJourneyNav current="checkout" />

      <div className="checkout-shell">
        <header className="checkout-heading">
          <h1>Delivery Information</h1>
          <p>Review your order, select delivery and payment options, then place your order.</p>
        </header>

        {notice && <p className="checkout-notice" role="status">{notice}</p>}
        {error && (
          <aside className={`checkout-error-toast${orderConnectionUncertain ? ' is-persistent' : ''}`} role="alert" aria-live="assertive">
            <span className="checkout-error-toast-icon"><CircleAlert aria-hidden="true" /></span>
            <div>
              <strong>{orderConnectionUncertain ? 'Order status uncertain' : 'Unable to continue'}</strong>
              <p>{error}</p>
              {orderConnectionUncertain && <a href="/buyer/delivery-progress">View orders</a>}
            </div>
          </aside>
        )}
        <section className="checkout-card checkout-address" aria-labelledby="delivery-address-title">
          <div className="checkout-address-head">
            <h2 id="delivery-address-title">Delivery Information</h2>
            <button type="button" onClick={openAddressEditor}>{addressIsComplete(deliveryAddress) ? 'Edit information' : 'Add information'}</button>
          </div>
          <div className="checkout-address-rule" />
          {addressIsComplete(deliveryAddress) ? <address>
            <strong>{deliveryAddress.full_name}</strong><br />
            {address.locality}<br />
            {address.region}<br />
            {deliveryAddress.mobile_number}
          </address> : <p className="checkout-address-empty">No delivery information has been added.</p>}
        </section>

        {addressModalOpen && <div className="checkout-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeAddressModal() }}>
          <section className="checkout-address-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-address-modal-title">
            <header><div><span>Delivery information</span><h2 id="checkout-address-modal-title">Delivery Address</h2><p>Enter the address to use for this order.</p></div><button type="button" onClick={closeAddressModal} aria-label="Close address form"><X /></button></header>
            <div className="checkout-address-fields checkout-new-address-fields">
              {[
                ['full_name', 'Full Name', 'Enter recipient name'],
                ['mobile_number', 'Phone Number', 'Enter mobile number'],
                ['region', 'Region', 'Enter region'],
                ['province', 'Province', 'Enter province (optional)'],
                ['city_municipality', 'City / Municipality', 'Enter city or municipality'],
                ['barangay', 'Barangay', 'Enter barangay'],
              ].map(([name, label, placeholder]) => <label key={name}><span>{label}{name !== 'province' && <em>*</em>}</span><input name={name} value={alternateAddress[name]} placeholder={placeholder} maxLength={150} onChange={(event) => setAlternateAddress((current) => ({ ...current, [name]: event.target.value }))} required={name !== 'province'} /></label>)}
              <label><span>Country<em>*</em></span><input name="country" value={alternateAddress.country} maxLength={150} onChange={(event) => setAlternateAddress((current) => ({ ...current, country: event.target.value }))} required /></label>
            </div>
            <footer><button type="button" className="is-cancel" onClick={closeAddressModal}>Cancel</button><button type="button" className="is-save" disabled={!addressIsComplete(alternateAddress)} onClick={saveAddressForOrder}>Use This Address</button></footer>
          </section>
        </div>}
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
                <CheckoutIcon name="delivery" />
                <span><strong>Standard Delivery</strong><small>Delivery service straight to your registered address.</small></span>
              </ChoiceCard>
              <ChoiceCard checked={deliveryMethod === 'pickup'} onSelect={() => setDeliveryMethod('pickup')}>
                <CheckoutIcon name="pickup" />
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
                <CheckoutIcon name="cash" />
                <span><strong>Cash on Delivery</strong><small>Pay with cash when your pineapples arrive.</small></span>
              </ChoiceCard>
              <ChoiceCard checked={paymentMethod === 'gcash'} onSelect={() => setPaymentMethod('gcash')}>
                <WalletCards aria-hidden="true" />
                <span><strong>GCash</strong><small>Pay securely using your GCash mobile wallet.</small></span>
              </ChoiceCard>
            </div>
          </section>

          <button className="checkout-submit" type="submit" disabled={loading || placing || items.length === 0 || Boolean(placedOrder)}>
            {orderButtonLabel}
          </button>
          {placedOrder && orderToastVisible && (
            <aside className={`checkout-order-toast ${placedOrder.payment_method === 'gcash' ? '' : 'is-success'}`} role="status" aria-live="polite">
              <span className="checkout-order-toast-icon"><Check aria-hidden="true" /></span>
              <div>
                {placedOrder.payment_method === 'gcash' ? (
                  <>
                    <strong>GCash payment not started</strong>
                    <p>Order <b>{placedOrder.order_number}</b> was placed. Continue to payment.</p>
                    <button type="button" className="checkout-retry-payment" onClick={retryOnlinePayment} disabled={retryingPayment}>
                      {retryingPayment ? 'Opening…' : 'Continue to Payment'}
                    </button>
                  </>
                ) : (
                  <>
                    <strong>Order placed successfully</strong>
                    <p>Order <b>{placedOrder.order_number}</b> was placed successfully.</p>
                  </>
                )}
              </div>
              <a href={`/buyer/delivery-progress?track=${encodeURIComponent(placedOrder.id)}`}>View Order Details</a>
              {placedOrder.payment_method === 'gcash' && <button type="button" onClick={() => setOrderToastVisible(false)} aria-label="Dismiss order notification"><X aria-hidden="true" /></button>}
            </aside>
          )}
        </form>

        <p className="checkout-terms">By placing your order, you agree to our <a href="#terms">Terms &amp; Conditions</a>.</p>
      </div>

      <BuyerFooter />
    </main>
  )
}
