import { useCallback, useEffect, useMemo, useState } from 'react'
import { CircleUserRound, Minus, Plus, ShoppingCart, Star } from 'lucide-react'
import { BuyerFooter, BuyerHeader } from '../../components/BuyerChrome.jsx'
import pineappleImage from '../../assets/buyer/pineapple-product-clean.png'
import { supabase } from '../../lib/supabase.js'
import '../../styles/Buyer/buyerLanding.css'
import '../../styles/Buyer/shoppingCart.css'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')

const reviews = [
  { name: 'Juan D.', date: 'May 12, 2026', text: 'Sweet and juicy, worth the price!' },
  { name: 'Maria S.', date: 'May 9, 2026', text: 'Fast delivery and fresh pineapple.' },
  { name: 'Kevin L.', date: 'May 7, 2026', text: 'Good packaging, will order again!' },
]

async function readAccessToken(refresh = false) {
  const result = refresh
    ? await supabase.auth.refreshSession()
    : await supabase.auth.getSession()
  if (result.error) throw new Error(result.error.message)
  const token = result.data.session?.access_token
  if (!token) throw new Error('Your session has ended. Please sign in again.')
  return token
}

async function loadPineappleProducts(retry = true) {
  const token = await readAccessToken()
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 12000)

  try {
    const response = await fetch(`${API_URL}/api/buyer/products/pineapples`, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}` },
    })
    if (response.status === 401 && retry) {
      await readAccessToken(true)
      return loadPineappleProducts(false)
    }
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.error || `Unable to load pineapple inventory (${response.status})`)
    return body.products || []
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('The inventory server did not respond. Make sure the Express backend is running on port 5000.')
    }
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

export default function BuyerOrders() {
  const [products, setProducts] = useState([])
  const [quantities, setQuantities] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const loadedProducts = await loadPineappleProducts()
      setProducts(loadedProducts)
      setQuantities((current) => Object.fromEntries(
        loadedProducts.map((product) => [product.id, Math.min(current[product.id] || 0, product.stock_quantity)]),
      ))
    } catch (requestError) {
      setProducts([])
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  function updateQuantity(product, amount) {
    setQuantities((current) => ({
      ...current,
      [product.id]: Math.min(
        product.stock_quantity,
        Math.max(0, (current[product.id] || 0) + amount),
      ),
    }))
  }

  const selectedProducts = useMemo(() => products.filter((product) => (quantities[product.id] || 0) > 0), [products, quantities])
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
    window.localStorage.setItem('agriverseBuyerCart', JSON.stringify(cartItems))
    window.location.assign('/buyer/cart')
  }

  return (
    <main className="buyer-page marketplace-page">
      <BuyerHeader active="orders" cartCount={selectedProducts.length} />
      <section className="marketplace-order-layout">
        <div className="marketplace-order-main">
          <header className="marketplace-title">
            <h1>Order Fresh Pineapples</h1>
            <p>Live availability from the JToledo farm inventory</p>
          </header>

          <section className="pineapple-selection" aria-labelledby="pineapple-size-title">
            <div className="pineapple-selection-heading">
              <h2 id="pineapple-size-title">Choose Your Pineapple Size</h2>
              {!loading && !error && <button type="button" onClick={fetchProducts}>Refresh stock</button>}
            </div>

            {error && <div className="marketplace-inventory-message is-error" role="alert"><p>{error}</p><button type="button" onClick={fetchProducts}>Try again</button></div>}
            {loading && <div className="marketplace-inventory-message" role="status">Loading available pineapples…</div>}
            {!loading && !error && products.length === 0 && <div className="marketplace-inventory-message">No pineapple products are currently configured.</div>}

            {!loading && !error && products.length > 0 && <div className="pineapple-product-grid">
              {products.map((product) => {
                const quantity = quantities[product.id] || 0
                return (
                  <article className={`pineapple-product-card ${product.available ? '' : 'is-unavailable'}`} key={product.id}>
                    <img src={pineappleImage} alt={`${product.name} product`} />
                    <h3>{product.name}</h3>
                    <p>{product.weight}</p>
                    <strong>PHP {product.price.toFixed(2)}</strong>
                    <small className="marketplace-stock-label">
                      {product.available ? `${product.stock_quantity} ${product.unit_label || 'pcs'} available` : 'Out of stock'}
                    </small>
                    <div className="marketplace-quantity" aria-label={`${product.name} quantity`}>
                      <button type="button" disabled={quantity === 0} onClick={() => updateQuantity(product, -1)} aria-label={`Reduce ${product.name}`}><Minus /></button>
                      <output>{quantity}</output>
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
                  <div className="review-stars" aria-label="5 out of 5 stars">
                    {Array.from({ length: 5 }, (_, index) => <Star key={index} fill="currentColor" />)}
                  </div>
                  <p>{review.text}</p>
                  <div className="review-author">
                    <CircleUserRound aria-hidden="true" />
                    <span><strong>{review.name}</strong><small>{review.date}</small></span>
                    <em>Verified Buyer</em>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="order-summary" aria-labelledby="order-summary-title">
          <h2 id="order-summary-title">Order Summary</h2>
          <div className="order-summary-labels"><span>Product</span><span>Quantity</span><span>Total</span></div>
          {selectedProducts.length > 0 ? selectedProducts.map((product) => (
            <div className="summary-product" key={product.id}>
              <img src={pineappleImage} alt="" />
              <span><strong>{product.size_name}</strong><small>Pineapple<br />{product.weight}</small></span>
              <b>{quantities[product.id]}</b>
              <b>{(product.price * quantities[product.id]).toLocaleString()}</b>
            </div>
          )) : <p className="order-summary-empty">Select a quantity to begin your order.</p>}
          <div className="summary-total">Total: <strong>PHP {orderTotal.toLocaleString()}</strong></div>
          <button className="summary-cart-button" type="button" disabled={selectedProducts.length === 0} onClick={addToCart}><ShoppingCart aria-hidden="true" /> Add to Cart</button>
        </aside>
      </section>
      <BuyerFooter />
    </main>
  )
}
