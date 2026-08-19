import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Info,
  Minus,
  Plus,
  ShoppingCart,
  Star,
  X,
} from 'lucide-react'
import { BuyerFooter, BuyerHeader, BuyerJourneyNav } from '../../components/BuyerChrome.jsx'
import pineappleImage from '../../assets/buyer/pineapple-product-clean.png'
import { useAuth } from '../../hooks/useAuth.js'
import { loadPineappleProducts, readBuyerCart, writeBuyerCart } from '../../services/buyerMarketplace.js'
import '../../styles/Buyer/buyerLanding.css'
import '../../styles/Buyer/shoppingCart.css'

const reviews = [
  { id: 1, name: 'Juan D.', date: 'May 12, 2026', text: 'Ordered two medium pineapples. Both were ripe, juicy, and sweeter than the ones I usually get at the grocery.', rating: 5 },
  { id: 2, name: 'Maria S.', date: 'May 9, 2026', text: 'Delivered the next morning and packed carefully. The pineapple was ready to eat when it arrived.', rating: 5 },
  { id: 3, name: 'Kevin L.', date: 'May 7, 2026', text: 'The box had a small dent, but the fruit inside was fine. Good flavor and a fair price for the large size.', rating: 4 },
  { id: 4, name: 'Angela R.', date: 'May 5, 2026', text: 'Used the large pineapple for fruit salad. It was fragrant, sweet, and had very little sourness.', rating: 5 },
  { id: 5, name: 'Paolo M.', date: 'May 2, 2026', text: 'Ordering was straightforward and the stock count was accurate. Pickup only took a few minutes.', rating: 5 },
  { id: 6, name: 'Leah C.', date: 'April 29, 2026', text: 'Sweet and fresh, although the small pineapple was a little smaller than I expected. Still good for one person.', rating: 4 },
  { id: 7, name: 'Carlo B.', date: 'April 26, 2026', text: 'Arrived within the delivery window with no bruises. We chilled it overnight and it tasted great the next day.', rating: 5 },
  { id: 8, name: 'Grace T.', date: 'April 23, 2026', text: 'Bought three for a family gathering. All three had consistent ripeness and none had soft or damaged spots.', rating: 5 },
  { id: 9, name: 'Miguel A.', date: 'April 20, 2026', text: 'The fruit was good, but delivery came one day later than the estimate. Customer support replied quickly.', rating: 3 },
  { id: 10, name: 'Nina P.', date: 'April 17, 2026', text: 'The large size had plenty of flesh and only a small core. Sweet enough to eat without adding sugar.', rating: 5 },
  { id: 11, name: 'Ramon G.', date: 'April 14, 2026', text: 'Cleanly packed and still firm on arrival. I left it on the counter for a day and the flavor improved.', rating: 4 },
  { id: 12, name: 'Ella V.', date: 'April 11, 2026', text: 'This was my second order. The quality was just as good as the first, and the pineapple smelled very fresh.', rating: 5 },
  { id: 13, name: 'Marco F.', date: 'April 8, 2026', text: 'Mine arrived slightly underripe, but it became sweet after two days. No bruising and the leaves were healthy.', rating: 4 },
  { id: 14, name: 'Joyce N.', date: 'April 5, 2026', text: 'Good balance of sweetness and acidity. The medium size was enough for dessert for four people.', rating: 5 },
  { id: 15, name: 'Luis E.', date: 'April 2, 2026', text: 'Pickup instructions were clear and the staff had my order ready. The pineapple was firm and evenly colored.', rating: 5 },
  { id: 16, name: 'Bea H.', date: 'March 30, 2026', text: 'Fresh and tasty, but I would prefer an option to request a riper fruit for same-day serving.', rating: 4 },
  { id: 17, name: 'Daniel K.', date: 'March 27, 2026', text: 'The small pineapple was perfect for smoothies. It had a strong natural flavor and was not watery.', rating: 5 },
  { id: 18, name: 'Sofia J.', date: 'March 24, 2026', text: 'First time ordering directly from the farm. The fruit arrived fresh, and I liked knowing where it came from.', rating: 5 },
]

export default function BuyerOrders() {
  const { profile } = useAuth()
  const [products, setProducts] = useState([])
  const [quantities, setQuantities] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stockNotice, setStockNotice] = useState('')
  const [cartNotice, setCartNotice] = useState('')
  const [customerReviews, setCustomerReviews] = useState(reviews)
  const [reviewIndex, setReviewIndex] = useState(0)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewHover, setReviewHover] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [reviewError, setReviewError] = useState('')
  const reviewPages = useMemo(
    () => Array.from(
      { length: Math.ceil(customerReviews.length / 3) },
      (_, index) => customerReviews.slice(index * 3, index * 3 + 3),
    ),
    [customerReviews],
  )

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

  useEffect(() => {
    if (!reviewOpen) return undefined
    function closeOnEscape(event) {
      if (event.key === 'Escape') setReviewOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [reviewOpen])

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

  function closeReviewModal() {
    setReviewOpen(false)
    setReviewError('')
    setReviewHover(0)
  }

  function submitReview(event) {
    event.preventDefault()
    if (reviewRating === 0) {
      setReviewError('Please choose a star rating.')
      return
    }
    if (!reviewText.trim()) {
      setReviewError('Please tell us about your experience.')
      return
    }

    const fullName = profile?.full_name?.trim() || 'You'
    const shortName = fullName === 'You' ? fullName : `${fullName.split(' ')[0]} ${fullName.split(' ').slice(-1)[0]?.charAt(0) || ''}.`
    setCustomerReviews((current) => [
      {
        id: Date.now(),
        name: shortName,
        date: new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date()),
        text: reviewText.trim(),
        rating: reviewRating,
        isOwn: true,
      },
      ...current,
    ])
    setReviewIndex(0)
    setReviewRating(0)
    setReviewText('')
    closeReviewModal()
  }

  function showPreviousReview() {
    setReviewIndex((current) => (current - 1 + reviewPages.length) % reviewPages.length)
  }

  function showNextReview() {
    setReviewIndex((current) => (current + 1) % reviewPages.length)
  }

  return (
    <main className="buyer-page marketplace-page">
      <BuyerHeader active="orders" cartCount={selectedQuantity} />
      <BuyerJourneyNav current="order" />
      <section className="marketplace-order-layout is-summary-free">
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

            <div className="marketplace-inline-cart">
              <div className="marketplace-inline-total">
                <span>{selectedQuantity > 0 ? `${selectedQuantity} ${selectedQuantity === 1 ? 'item' : 'items'} selected` : 'Choose a pineapple and quantity'}</span>
                <strong>Total: PHP {orderTotal.toLocaleString()}</strong>
              </div>
              <button className="summary-cart-button" type="button" disabled={selectedProducts.length === 0} onClick={addToCart}><ShoppingCart aria-hidden="true" /> Add to Cart</button>
              {cartNotice && <div className="summary-cart-success" role="status"><CheckCircle2 /><span>{cartNotice}</span><a href="/buyer/cart">View Cart</a></div>}
            </div>
          </section>

          <section className="marketplace-reviews" aria-labelledby="marketplace-reviews-title">
            <div className="marketplace-reviews-heading">
              <h2 id="marketplace-reviews-title">Customer Reviews</h2>
              <button type="button" onClick={() => setReviewOpen(true)}><Star aria-hidden="true" /> Write a Review</button>
            </div>
            <div className="marketplace-review-carousel">
              <button className="marketplace-review-arrow is-previous" type="button" onClick={showPreviousReview} aria-label="Previous customer review"><ChevronLeft /></button>
              <div
                className="marketplace-review-viewport"
                tabIndex="0"
                onKeyDown={(event) => {
                  if (event.key === 'ArrowLeft') showPreviousReview()
                  if (event.key === 'ArrowRight') showNextReview()
                }}
              >
                <div className="marketplace-review-track" style={{ transform: `translateX(-${reviewIndex * 100}%)` }}>
                  {reviewPages.map((pageReviews, pageIndex) => (
                    <div className="marketplace-review-slide" key={pageReviews[0].id} aria-hidden={pageIndex !== reviewIndex}>
                      {pageReviews.map((review) => (
                        <article className={`marketplace-review-card${review.isOwn ? ' is-own-review' : ''}`} key={review.id}>
                          <div className="review-stars" aria-label={`${review.rating} out of 5 stars`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} fill={index < review.rating ? 'currentColor' : 'none'} />)}</div>
                          <p>“{review.text}”</p>
                          <div className="review-author"><CircleUserRound aria-hidden="true" /><span><strong>{review.name}</strong><small>{review.date}</small></span><em>{review.isOwn ? 'Your Review' : 'Verified Buyer'}</em></div>
                        </article>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              <button className="marketplace-review-arrow is-next" type="button" onClick={showNextReview} aria-label="Next customer review"><ChevronRight /></button>
            </div>
            <div className="marketplace-review-dots" aria-label={`Review group ${reviewIndex + 1} of ${reviewPages.length}`}>
              {reviewPages.map((pageReviews, index) => (
                <button className={index === reviewIndex ? 'is-active' : ''} type="button" key={pageReviews[0].id} onClick={() => setReviewIndex(index)} aria-label={`Show review group ${index + 1}`} aria-current={index === reviewIndex ? 'true' : undefined} />
              ))}
            </div>
          </section>
        </div>

      </section>
      <BuyerFooter />

      {reviewOpen && (
        <div className="buyer-review-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeReviewModal() }}>
          <section className="buyer-review-modal" role="dialog" aria-modal="true" aria-labelledby="buyer-review-modal-title">
            <button className="buyer-review-modal-x" type="button" onClick={closeReviewModal} aria-label="Close review form"><X /></button>
            <div className="buyer-review-modal-mark"><Star fill="currentColor" aria-hidden="true" /></div>
            <h2 id="buyer-review-modal-title">Rate Your Experience</h2>
            <p>How was your pineapple order?</p>

            <form onSubmit={submitReview}>
              <fieldset>
                <legend>Choose your rating</legend>
                <div className="buyer-review-rating" onMouseLeave={() => setReviewHover(0)}>
                  {Array.from({ length: 5 }, (_, index) => {
                    const value = index + 1
                    const active = value <= (reviewHover || reviewRating)
                    return <button className={active ? 'is-active' : ''} type="button" key={value} onMouseEnter={() => setReviewHover(value)} onFocus={() => setReviewHover(value)} onBlur={() => setReviewHover(0)} onClick={() => { setReviewRating(value); setReviewError('') }} aria-label={`${value} ${value === 1 ? 'star' : 'stars'}`} aria-pressed={reviewRating === value}><Star fill={active ? 'currentColor' : 'none'} /></button>
                  })}
                </div>
                <output>{reviewRating ? `${reviewRating} out of 5 stars` : 'Select 1 to 5 stars'}</output>
              </fieldset>

              <label htmlFor="buyer-review-text">Tell us about your experience</label>
              <textarea id="buyer-review-text" value={reviewText} onChange={(event) => { setReviewText(event.target.value); setReviewError('') }} placeholder="What did you like about your order?" maxLength="300" rows="4" autoFocus />
              <small>{reviewText.length}/300</small>
              {reviewError && <p className="buyer-review-error" role="alert">{reviewError}</p>}

              <div className="buyer-review-modal-actions">
                <button type="button" onClick={closeReviewModal}>Cancel</button>
                <button className="is-submit" type="submit">Submit Review</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}
