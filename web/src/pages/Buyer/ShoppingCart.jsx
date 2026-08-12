import { useCallback, useEffect, useMemo, useState } from 'react'
import { Minus, Plus, ShoppingCart as CartIcon } from 'lucide-react'
import { BuyerFooter, BuyerHeader } from '../../components/BuyerChrome.jsx'
import pineappleImage from '../../assets/buyer/pineapple-product-clean.png'
import { buyerCartQuantity, loadPineappleProducts, readBuyerCart, writeBuyerCart } from '../../services/buyerMarketplace.js'
import '../../styles/Buyer/buyerLanding.css'
import '../../styles/Buyer/shoppingCart.css'

const SHIPPING_FEE = 100

function reconcileCart(savedItems, products) {
  const productById = new Map(products.map((product) => [String(product.id), product]))
  return savedItems.flatMap((savedItem) => {
    const product = productById.get(String(savedItem.id))
    if (!product || product.stock_quantity <= 0) return []
    const quantity = Math.min(Math.max(Number(savedItem.quantity) || 0, 0), product.stock_quantity)
    if (quantity === 0) return []
    return [{
      id: product.id,
      name: product.name,
      size_name: product.size_name,
      weight: product.weight,
      price: product.price,
      quantity,
      stock_quantity: product.stock_quantity,
      unit_label: product.unit_label,
      inventory_item_ids: product.inventory_item_ids,
    }]
  })
}

export default function ShoppingCart() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const refreshCart = useCallback(async () => {
    setLoading(true)
    setError('')
    setNotice('')
    const savedItems = readBuyerCart()
    if (savedItems.length === 0) {
      setItems([])
      setLoading(false)
      return
    }

    try {
      const products = await loadPineappleProducts()
      const currentItems = reconcileCart(savedItems, products)
      const changed = currentItems.length !== savedItems.length
        || currentItems.some((item, index) => item.quantity !== Number(savedItems[index]?.quantity))
      setItems(currentItems)
      writeBuyerCart(currentItems)
      if (changed) setNotice('Your cart was updated to match the latest available inventory.')
    } catch (requestError) {
      setItems(savedItems)
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refreshCart() }, [refreshCart])

  function updateQuantity(id, amount) {
    setItems((current) => {
      const updated = current.map((item) => item.id === id
        ? { ...item, quantity: Math.min(item.stock_quantity, Math.max(0, item.quantity + amount)) }
        : item).filter((item) => item.quantity > 0)
      writeBuyerCart(updated)
      return updated
    })
  }

  function removeItem(id) {
    setItems((current) => {
      const updated = current.filter((item) => item.id !== id)
      writeBuyerCart(updated)
      return updated
    })
  }

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.quantity * item.price, 0), [items])
  const shipping = items.length > 0 ? SHIPPING_FEE : 0
  const total = subtotal + shipping

  return (
    <main className="buyer-page marketplace-page">
      <BuyerHeader active="cart" cartCount={buyerCartQuantity(items)} />
      <section className="shopping-cart-page">
        <header className="shopping-cart-title">
          <h1>Order Fresh Pineapple</h1>
          <p>Review your order before proceeding to checkout</p>
        </header>

        <div className="shopping-cart-content">
          <div className="shopping-cart-heading-row">
            <h2><CartIcon aria-hidden="true" /> Shopping Cart</h2>
            {!loading && items.length > 0 && <button type="button" onClick={refreshCart}>Refresh stock</button>}
          </div>

          {notice && <p className="shopping-cart-notice" role="status">{notice}</p>}
          {error && <div className="shopping-cart-error" role="alert"><span>{error}</span><button type="button" onClick={refreshCart}>Try again</button></div>}
          {loading ? <p className="shopping-cart-empty">Checking current inventory…</p>
            : items.length > 0 ? (
              <div className="shopping-cart-items">
                {items.map((item) => {
                  const lineTotal = item.quantity * item.price
                  return <article className="shopping-cart-item" key={item.id}>
                    <img src={pineappleImage} alt={item.name} />
                    <div className="shopping-cart-item-name">
                      <h3>{item.name}</h3><p>{item.weight}</p>
                      <small>{item.stock_quantity} {item.unit_label || 'pcs'} available</small>
                    </div>
                    <strong className="shopping-cart-unit-price">PHP {item.price.toFixed(2)}</strong>
                    <div className="shopping-cart-quantity">
                      <button type="button" disabled={item.quantity <= 1} onClick={() => updateQuantity(item.id, -1)} aria-label={`Reduce ${item.name} quantity`}><Minus /></button>
                      <output>{item.quantity}</output>
                      <button type="button" disabled={item.quantity >= item.stock_quantity} onClick={() => updateQuantity(item.id, 1)} aria-label={`Add ${item.name} quantity`}><Plus /></button>
                    </div>
                    <button className="shopping-cart-remove" type="button" onClick={() => removeItem(item.id)}>Remove</button>
                    <span className="shopping-cart-line-total">Total: <strong>PHP {lineTotal.toLocaleString()}</strong></span>
                  </article>
                })}
              </div>
            ) : <p className="shopping-cart-empty">Your shopping cart is empty. Add pineapples from the Order page.</p>}

          <section className="shopping-cart-summary" aria-label="Cart totals">
            <div><span>Subtotal</span><strong>PHP {subtotal.toLocaleString()}.00</strong></div>
            <div><span>Shipping Fee</span><strong>PHP {shipping.toLocaleString()}.00</strong></div>
            <div className="shopping-cart-grand-total">
              <span>Total</span>
              <strong>PHP {total.toLocaleString()}</strong>
              <div className="shopping-cart-actions">
                <a className="shopping-cart-add-more" href="/buyer/order"><CartIcon aria-hidden="true" /> Add More</a>
                {items.length > 0
                  ? <a className="shopping-cart-checkout" href="/buyer/checkout">Check Out</a>
                  : <span className="shopping-cart-checkout is-disabled" aria-disabled="true">Check Out</span>}
              </div>
            </div>
          </section>
        </div>
      </section>
      <BuyerFooter />
    </main>
  )
}
