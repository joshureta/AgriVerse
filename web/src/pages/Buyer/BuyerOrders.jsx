import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  CircleUserRound,
  Info,
  Minus,
  Plus,
  ShoppingCart,
  Star,
  X,
} from 'lucide-react'
import { BuyerFooter, BuyerHeader } from '../../components/BuyerChrome.jsx'
import pineappleImage from '../../assets/buyer/pineapple-product-clean.png'
import { loadPineappleProducts, readBuyerCart, writeBuyerCart } from '../../services/buyerMarketplace.js'
import '../../styles/Buyer/buyerLanding.css'
import '../../styles/Buyer/shoppingCart.css'

const reviews = [
  { name: 'Juan D.', date: 'May 12, 2026', text: 'Sweet and juicy, worth the price!' },
  { name: 'Maria S.', date: 'May 9, 2026', text: 'Fast delivery and fresh pineapple.' },
  { name: 'Kevin L.', date: 'May 7, 2026', text: 'Good packaging, will order again!' },
]

export default function BuyerOrders() {
  const [products, setProducts] = useState([])
  const [quantities, setQuantities] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stockNotice, setStockNotice] = useState('')
  const [cartNotice, setCartNotice] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchProducts = useCallback(async ({ background = false } = {}) => {
    if (!background) {
      setLoading(true)
      setError('')
    }
    try {
      const loadedProducts = await loadPineappleProducts()
      setProducts(loadedProducts)
      setQuantities((current) => {
        const saved = new Map(readBuyerCart().map((item) => [String(item.id), Number(item.quantity) || 0]))
        const updated = Object.fromEntries(loadedProducts.map((product) => [
          product.id,
          Math.min(current[product.id] ?? saved.get(String(product.id)) ?? 0, product.stock_quantity),
        ]))
        if (background && loadedProducts.some((product) => (current[product.id] || 0) > (updated[product.id] || 0))) {
          setStockNotice('Availability changed, so a selected quantity was adjusted to the current stock.')
        }
        return updated
      })
      setLastUpdated(new Date())
    } catch (requestError) {
      if (!background) {
        setProducts([])
        setError(requestError.message)
      }
    } finally {
      if (!background) setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') fetchProducts({ background: true })
    }, 25000)
    return () => window.clearInterval(timer)
  }, [fetchProducts])

  function updateQuantity(product, amount) {
    setCartNotice('')
    setQuantities((current) => ({
      ...current,
      [product.id]: Math.min(product.stock_quantity, Math.max(0, (current[product.id] || 0) + amount)),
    }))
  }

  function setQuantity(product, value) {
    const quantity = Number.parseInt(value, 10)
    setCartNotice('')
    setQuantities((current) => ({
      ...current,
      [product.id]: Math.min(product.stock_quantity, Math.max(0, Number.isNaN(quantity) ? 0 : quantity)),
    }))
  }

  function removeSelection(productId) {
    setQuantities((current) => ({ ...current, [productId]: 0 }))
    setCartNotice('')
  }

  const selectedProducts = useMemo(
    () => products.filter((product) => (quantities[product.id] || 0) > 0),
    [products, quantities],
  )
  const selectedQuantity = selectedProducts.reduce((sum, product) => sum + quantities[product.id], 0)
  const orderTotal = selectedProducts.reduce(
    (sum, product) => sum + product.price * quantities[product.id],
    0,
  )

  function addToCart() {
    const cartItems = selectedProducts.map((product) => ({
      id: product.id,
      name: product.name,
      weight: product.weight,
      price: product.price,
      quantity: quantities[product.id],
      stock_quantity: product.stock_quantity,
      inventory_item_ids: product.inventory_item_ids,
    }))
    writeBuyerCart(cartItems)
    setCartNotice(`${selectedQuantity} ${selectedQuantity === 1 ? 'item' : 'items'} added to your cart.`)
  }

  return (
    <main className="buyer-page marketplace-page">
      <BuyerHeader active="orders" cartCount={selectedQuantity} />
      <section className="marketplace-order-layout">
        <div className="marketplace-order-main">
          <header className="marketplace-title">
            <h1>Order Fresh Pineapples</h1>
            <p className="marketplace-subtitle">Fresh from our farm, ready for your table.</p>
          </header>

          <section className="pineapple-selection" aria-labelledby="pineapple-size-title">
            <div className="pineapple-selection-heading">
              <h2 id="pineapple-size-title">Choose Your Pineapple Size</h2>
            </div>
            <p className="marketplace-order-tip"><Info aria-hidden="true" /> Choose a size and quantity. Stock is reserved only after checkout.</p>
            {stockNotice && <div className="marketplace-stock-notice" role="status"><span>{stockNotice}</span><button type="button" onClick={() => setStockNotice('')} aria-label="Dismiss stock notice"><X /></button></div>}

            {error && <div className="marketplace-inventory-message is-error" role="alert"><p>{error}</p><button type="button" onClick={() => fetchProducts()}>Try again</button></div>}
            {loading && <div className="marketplace-inventory-message" role="status">Loading available pineapples...</div>}
            {!loading && !error && products.length === 0 && <div className="marketplace-inventory-message">No pineapple products are currently configured.</div>}

            {!loading && !error && products.length > 0 && <div className="pineapple-product-grid">
              {products.map((product) => {
                const quantity = quantities[product.id] || 0
                return (
                  <article className={`pineapple-product-card ${quantity > 0 ? 'is-selected' : ''} ${product.available ? '' : 'is-unavailable'}`} key={product.id}>
                    <span className={`marketplace-stock-badge ${!product.available ? 'is-out' : product.stock_quantity <= 10 ? 'is-low' : ''}`}>
                      {!product.available ? 'Out of stock' : product.stock_quantity <= 10 ? `Only ${product.stock_quantity} left` : 'In stock'}
                    </span>
                    <img src={pineappleImage} alt={`${product.name} product`} />
                    <h3>{product.name}</h3>
                    <p>{product.weight}</p>
                    <strong>PHP {product.price.toFixed(2)}</strong>
                    <small className="marketplace-stock-label">
                      {product.available ? `${product.stock_quantity} ${product.unit_label || 'pcs'} available` : 'Currently unavailable'}
                    </small>
                    <div className="marketplace-quantity" aria-label={`${product.name} quantity`}>
                      <button type="button" disabled={quantity === 0} onClick={() => updateQuantity(product, -1)} aria-label={`Reduce ${product.name}`}><Minus /></button>
                      <input type="number" min="0" max={product.stock_quantity} value={quantity} disabled={!product.available} onChange={(event) => setQuantity(product, event.target.value)} aria-label={`${product.name} selected quantity`} />
                      <button type="button" disabled={!product.available || quantity >= product.stock_quantity} onClick={() => updateQuantity(product, 1)} aria-label={`Add ${product.name}`}><Plus /></button>
                    </div>
                  </article>
                )
              })}
            </div>}
          </section>

          <section className="marketplace-reviews" aria-labelledby="marketplace-reviews-title">
            <h2 id="marketplace-reviews-title">Customer Reviews</h2>
            <div className="marketplace-review-grid">
              {reviews.map((review) => (
                <article className="marketplace-review-card" key={review.name}>
                  <div className="review-stars" aria-label="5 out of 5 stars">{Array.from({ length: 5 }, (_, index) => <Star key={index} fill="currentColor" />)}</div>
                  <p>{review.text}</p>
                  <div className="review-author"><CircleUserRound aria-hidden="true" /><span><strong>{review.name}</strong><small>{review.date}</small></span><em>Verified Buyer</em></div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="order-summary" aria-labelledby="order-summary-title">
          <h2 id="order-summary-title">Order Summary</h2>
          {selectedProducts.length > 0 ? selectedProducts.map((product) => (
            <div className="summary-product" key={product.id}>
              <img src={pineappleImage} alt="" />
              <span><strong>{product.size_name} Pineapple</strong><small>{quantities[product.id]} x PHP {product.price.toFixed(2)}<br />{product.weight}</small></span>
              <b>PHP {(product.price * quantities[product.id]).toLocaleString()}</b>
              <button type="button" onClick={() => removeSelection(product.id)} aria-label={`Remove ${product.name}`}><X /></button>
            </div>
          )) : <p className="order-summary-empty">Select a pineapple size and quantity to begin your order.</p>}
          {selectedProducts.length > 0 && <div className="summary-subtotal"><span>Subtotal</span><strong>PHP {orderTotal.toLocaleString()}</strong></div>}
          <div className="summary-total"><span>Total</span><strong>PHP {orderTotal.toLocaleString()}</strong></div>
          <button className="summary-cart-button" type="button" disabled={selectedProducts.length === 0} onClick={addToCart}><ShoppingCart aria-hidden="true" /> Add to Cart</button>
          {cartNotice && <div className="summary-cart-success" role="status"><CheckCircle2 /><span>{cartNotice}</span><a href="/buyer/cart">View Cart</a></div>}
        </aside>
      </section>
      <BuyerFooter />
    </main>
  )
}
