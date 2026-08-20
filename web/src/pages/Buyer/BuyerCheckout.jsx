import { useEffect, useMemo, useState } from 'react'
import {
  CircleAlert,
  Check,
  Pencil,
  Plus,
  QrCode,
  Trash2,
  WalletCards,
  X,
} from 'lucide-react'
import { BuyerFooter, BuyerHeader, BuyerJourneyNav } from '../../components/BuyerChrome.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import pineappleImage from '../../assets/buyer/pineapple-product-clean.png'
import bankIcon from '../../assets/buyer/checkout/bank.png'
import cashIcon from '../../assets/buyer/checkout/cash.png'
import deliveryIcon from '../../assets/buyer/checkout/delivery.png'
import pickupIcon from '../../assets/buyer/checkout/pickup.png'
import {
  createBuyerDeliveryAddress,
  deleteBuyerDeliveryAddress,
  loadPineappleProducts,
  loadBuyerDeliveryAddresses,
  buyerCartQuantity,
  placeBuyerOrder,
  readBuyerCart,
  saveDefaultBuyerDeliveryAddress,
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
  const icons = { bank: bankIcon, cash: cashIcon, delivery: deliveryIcon, pickup: pickupIcon }
  return <img className="checkout-generated-icon" src={icons[name]} alt="" aria-hidden="true" />
}

const emptyAddress = {
  full_name: '', mobile_number: '', country: '', region: '', province: '', city_municipality: '', barangay: '',
}

function addressIsComplete(address) {
  return ['full_name', 'mobile_number', 'country', 'region', 'city_municipality', 'barangay']
    .every((field) => String(address[field] || '').trim())
}

function deliveryAddressToSlot(row) {
  return {
    id: row.id,
    label: row.label || 'New address',
    address: Object.fromEntries(Object.keys(emptyAddress).map((field) => [field, row[field] || ''])),
  }
}

export default function BuyerCheckout() {
  const { profile } = useAuth()
  const [items, setItems] = useState([])
  const [deliveryMethod, setDeliveryMethod] = useState('delivery')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [addressesLoaded, setAddressesLoaded] = useState(false)
  const [savingAddress, setSavingAddress] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [placedOrder, setPlacedOrder] = useState(null)
  const [orderToastVisible, setOrderToastVisible] = useState(false)
  const [addressModalOpen, setAddressModalOpen] = useState(false)
  const [addressModalView, setAddressModalView] = useState('confirm')
  const [customAddresses, setCustomAddresses] = useState([])
  const [pendingAddressId, setPendingAddressId] = useState('saved')
  const [confirmedAddressId, setConfirmedAddressId] = useState(null)
  const [addressConfirmed, setAddressConfirmed] = useState(false)
  const [alternateAddress, setAlternateAddress] = useState(emptyAddress)

  useEffect(() => {
    if (!error) return undefined
    const dismissTimer = window.setTimeout(() => setError(''), 4000)
    return () => window.clearTimeout(dismissTimer)
  }, [error])

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

  useEffect(() => {
    if (!profile) return undefined
    let active = true
    loadBuyerDeliveryAddresses()
      .then(({ addresses, defaultAddressId, addressConfirmedAt }) => {
        if (!active) return
        const slots = addresses.map(deliveryAddressToSlot)
        const customDefaultExists = defaultAddressId && slots.some((slot) => slot.id === defaultAddressId)
        const resolvedDefaultId = customDefaultExists
          ? defaultAddressId
          : addressConfirmedAt && addressIsComplete(savedAddress) ? 'saved' : null
        setCustomAddresses(slots)
        setConfirmedAddressId(resolvedDefaultId)
        setPendingAddressId(resolvedDefaultId || (addressIsComplete(savedAddress) ? 'saved' : slots[0]?.id || 'saved'))
        setAddressConfirmed(Boolean(resolvedDefaultId))
      })
      .catch((requestError) => {
        if (active) setError(requestError.message)
      })
      .finally(() => {
        if (active) setAddressesLoaded(true)
      })
    return () => { active = false }
  }, [profile, savedAddress])

  useEffect(() => {
    if (loading || !addressesLoaded || items.length === 0 || !profile) return
    const url = new URL(window.location.href)
    if (url.searchParams.get('confirmDelivery') !== '1') return

    url.searchParams.delete('confirmDelivery')
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
    if (addressConfirmed) return

    const savedProfileIsComplete = addressIsComplete(savedAddress)
    const firstCustomAddress = customAddresses[0]
    setPendingAddressId(savedProfileIsComplete ? 'saved' : firstCustomAddress?.id || 'saved')
    setAlternateAddress({ ...emptyAddress, ...savedAddress })
    setAddressModalView(savedProfileIsComplete || firstCustomAddress ? 'confirm' : 'edit')
    setAddressModalOpen(true)
  }, [addressConfirmed, addressesLoaded, customAddresses, items.length, loading, profile, savedAddress])

  const addressSlots = useMemo(() => {
    const slots = addressIsComplete(savedAddress) ? [{ id: 'saved', label: 'Saved address', address: savedAddress }] : []
    return [...slots, ...customAddresses]
  }, [customAddresses, savedAddress])
  const pendingSlot = addressSlots.find((slot) => slot.id === pendingAddressId) || null
  const confirmedSlot = addressSlots.find((slot) => slot.id === confirmedAddressId) || null
  const deliveryAddress = confirmedSlot?.address || emptyAddress
  const address = useMemo(() => {
    const locality = [deliveryAddress.barangay, deliveryAddress.city_municipality].filter(Boolean).join(', ')
    const region = [deliveryAddress.province, deliveryAddress.region, deliveryAddress.country].filter(Boolean).join(', ')
    return { locality, region }
  }, [deliveryAddress])

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const shippingFee = deliveryMethod === 'delivery' && items.length > 0 ? 100 : 0
  const total = subtotal + shippingFee

  function closeAddressModal() {
    setAddressModalOpen(false)
    setError('')
  }

  function openAddressConfirmation() {
    const firstAvailableId = confirmedAddressId || addressSlots[0]?.id
    if (firstAvailableId) {
      setPendingAddressId(firstAvailableId)
      setAddressModalView('confirm')
    } else {
      setAlternateAddress({ ...emptyAddress, ...savedAddress })
      setAddressModalView('edit')
    }
    setAddressModalOpen(true)
    setError('')
  }

  function editSelectedAddress(slot) {
    setAlternateAddress({ ...emptyAddress, ...slot.address })
    setAddressModalView('edit')
  }

  function addNewAddress() {
    setAlternateAddress({ ...emptyAddress })
    setAddressModalView('edit')
  }

  async function completeOrder(confirmedAddress = null) {
    if (items.length === 0 || placedOrder || placing) return
    setPlacing(true)
    setError('')
    try {
      const order = await placeBuyerOrder({
        delivery_method: deliveryMethod,
        payment_method: paymentMethod,
        customer_note: notes,
        delivery_address: deliveryMethod === 'delivery' ? confirmedAddress : null,
        items: items.map((item) => ({ product_id: item.id, quantity: item.quantity })),
      })
      writeBuyerCart([])
      setPlacedOrder(order)
      setOrderToastVisible(true)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setPlacing(false)
    }
  }

  async function submitOrder(event) {
    event.preventDefault()
    if (items.length === 0 || placedOrder) return
    if (deliveryMethod === 'delivery' && !addressConfirmed) {
      openAddressConfirmation()
      return
    }
    await completeOrder(deliveryMethod === 'delivery' ? deliveryAddress : null)
  }

  async function reviewDeliveryAddress() {
    if (!addressIsComplete(alternateAddress) || savingAddress) return
    setSavingAddress(true)
    setError('')
    try {
      const saved = await createBuyerDeliveryAddress({
        ...alternateAddress,
        label: `New address ${customAddresses.length + 1}`,
      })
      const slot = deliveryAddressToSlot(saved)
      setCustomAddresses((current) => [...current, slot])
      setPendingAddressId(slot.id)
      setAddressModalView('confirm')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSavingAddress(false)
    }
  }

  async function confirmDeliveryAddress() {
    if (!pendingSlot || !addressIsComplete(pendingSlot.address) || savingAddress) return
    setSavingAddress(true)
    setError('')
    try {
      await saveDefaultBuyerDeliveryAddress(pendingSlot.id)
      setConfirmedAddressId(pendingSlot.id)
      setAddressConfirmed(true)
      closeAddressModal()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSavingAddress(false)
    }
  }

  async function deleteAddressSlot(slot) {
    if (slot.id === 'saved' || !window.confirm(`Delete ${slot.label}?`)) return
    setError('')
    try {
      await deleteBuyerDeliveryAddress(slot.id)
      setCustomAddresses((current) => current.filter((addressSlot) => addressSlot.id !== slot.id))
      if (confirmedAddressId === slot.id) {
        setConfirmedAddressId(null)
        setAddressConfirmed(false)
      }
      if (pendingAddressId === slot.id) setPendingAddressId(addressIsComplete(savedAddress) ? 'saved' : null)
    } catch (requestError) {
      setError(requestError.message)
    }
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
          <aside className="checkout-error-toast" role="alert" aria-live="assertive">
            <span className="checkout-error-toast-icon"><CircleAlert aria-hidden="true" /></span>
            <div><strong>Unable to continue</strong><p>{error}</p></div>
          </aside>
        )}

        <section className="checkout-card checkout-address" aria-labelledby="delivery-address-title">
          <div className="checkout-address-head">
            <h2 id="delivery-address-title">Delivery Information</h2>
            <button type="button" onClick={openAddressConfirmation}>{addressIsComplete(deliveryAddress) ? 'Edit information' : 'Add information'}</button>
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
            <header><div><span>Delivery information</span><h2 id="checkout-address-modal-title">{addressModalView === 'confirm' ? 'Choose Delivery Address' : 'Add Delivery Address'}</h2><p>{addressModalView === 'confirm' ? 'Choose an address slot, then confirm your selection.' : 'Complete the fields below to create an address slot.'}</p></div><button type="button" onClick={closeAddressModal} aria-label="Close address form"><X /></button></header>
            {addressModalView === 'confirm' ? <>
              <div className="checkout-address-slots" role="radiogroup" aria-label="Delivery addresses">
                {addressSlots.map((slot) => <div key={slot.id} className={`checkout-address-confirmation ${pendingAddressId === slot.id ? 'is-pending' : ''} ${confirmedAddressId === slot.id ? 'is-confirmed' : ''}`} role="radio" aria-checked={pendingAddressId === slot.id} tabIndex={0} onClick={() => setPendingAddressId(slot.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setPendingAddressId(slot.id) } }}>
                  <div className="checkout-address-slot-head"><span>{confirmedAddressId === slot.id && <Check aria-hidden="true" />} {slot.label}</span><div className="checkout-address-slot-tools"><button type="button" onClick={(event) => { event.stopPropagation(); editSelectedAddress(slot) }} aria-label={`Edit ${slot.label}`} title="Edit information"><Pencil aria-hidden="true" /></button>{slot.id !== 'saved' && <button type="button" className="is-delete" onClick={(event) => { event.stopPropagation(); deleteAddressSlot(slot) }} aria-label={`Delete ${slot.label}`} title="Delete address"><Trash2 aria-hidden="true" /></button>}</div></div>
                  <h3>{slot.address.full_name}</h3>
                  <p>{slot.address.mobile_number}</p>
                  <address>{[slot.address.barangay, slot.address.city_municipality, slot.address.province, slot.address.region, slot.address.country].filter(Boolean).join(', ')}</address>
                </div>)}
              </div>
              <button type="button" className="checkout-add-address" onClick={addNewAddress}><Plus aria-hidden="true" /> Add New Address</button>
              <p className="checkout-address-question">Confirm the address you want to use for this order.</p>
            </> : <>
              <div className="checkout-address-fields checkout-new-address-fields">
                {[
                  ['full_name', 'Full Name', 'Enter recipient name'],
                  ['mobile_number', 'Phone Number', 'Enter mobile number'],
                  ['country', 'Country', 'Enter country'],
                  ['region', 'Region', 'Enter region'],
                  ['province', 'Province', 'Enter province (optional)'],
                  ['city_municipality', 'City / Municipality', 'Enter city or municipality'],
                  ['barangay', 'Barangay', 'Enter barangay'],
                ].map(([name, label, placeholder]) => <label key={name}><span>{label}{name !== 'province' && <em>*</em>}</span><input name={name} value={alternateAddress[name]} placeholder={placeholder} onChange={(event) => setAlternateAddress((current) => ({ ...current, [name]: event.target.value }))} required={name !== 'province'} /></label>)}
              </div>
              {addressSlots.length > 0 && <button type="button" className="checkout-use-saved" onClick={() => setAddressModalView('confirm')}>Back to address slots</button>}
            </>}
            <footer><button type="button" className="is-cancel" onClick={() => addressModalView === 'edit' && addressSlots.length > 0 ? setAddressModalView('confirm') : closeAddressModal()}>{addressModalView === 'edit' && addressSlots.length > 0 ? 'Back' : 'Cancel'}</button>{addressModalView === 'confirm' ? <button type="button" className="is-save" disabled={!pendingSlot || savingAddress} onClick={confirmDeliveryAddress}>{savingAddress ? 'Saving default…' : 'Confirm Address'}</button> : <button type="button" className="is-save" disabled={!addressIsComplete(alternateAddress) || savingAddress} onClick={reviewDeliveryAddress}>{savingAddress ? 'Saving address…' : 'Add Address'}</button>}</footer>
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
              <ChoiceCard checked={paymentMethod === 'bank'} className="checkout-bank" onSelect={() => setPaymentMethod('bank')}>
                <CheckoutIcon name="bank" />
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
          {placedOrder && orderToastVisible && (
            <aside className="checkout-order-toast" role="status" aria-live="polite">
              <span className="checkout-order-toast-icon"><Check aria-hidden="true" /></span>
              <div><strong>Order placed</strong><p>Order <b>{placedOrder.order_number}</b> was placed successfully.</p></div>
              <a href={`/buyer/delivery-progress?track=${encodeURIComponent(placedOrder.id)}`}>Track Delivery</a>
              <button type="button" onClick={() => setOrderToastVisible(false)} aria-label="Dismiss order notification"><X aria-hidden="true" /></button>
            </aside>
          )}
        </form>

        <p className="checkout-terms">By placing your order, you agree to our <a href="#terms">Terms &amp; Conditions</a>.</p>
      </div>

      <BuyerFooter />
    </main>
  )
}
