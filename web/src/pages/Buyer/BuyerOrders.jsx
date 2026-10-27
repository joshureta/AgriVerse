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
  ThumbsUp,
  X,
} from 'lucide-react'
import { BuyerFooter, BuyerHeader, BuyerJourneyNav } from '../../components/BuyerChrome.jsx'
import pineappleImage from '../../assets/buyer/pineapple-product-clean.png'
import { loadBuyerReviews, loadPineappleProducts, readBuyerCart, writeBuyerCart } from '../../services/buyerMarketplace.js'
import '../../styles/Buyer/buyerLanding.css'
import '../../styles/Buyer/shoppingCart.css'

export default function BuyerOrders() {
  const [products, setProducts] = useState([])
  const [quantities, setQuantities] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stockNotice, setStockNotice] = useState('')
  const [cartNotice, setCartNotice] = useState('')
  const [customerReviews, setCustomerReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [reviewsError, setReviewsError] = useState('')
  const [reviewsRetry, setReviewsRetry] = useState(0)
  const [reviewIndex, setReviewIndex] = useState(0)
  const [reviewSort, setReviewSort] = useState('recent')
  const [reviewFilter, setReviewFilter] = useState('all')
  const [showAllReviews, setShowAllReviews] = useState(false)
  const [helpfulReviews, setHelpfulReviews] = useState([])
  const filteredReviews = useMemo(() => {
    const matching = reviewFilter === 'all'
      ? [...customerReviews]
      : customerReviews.filter((review) => review.rating === Number(reviewFilter))

    const reviewTime = (review) => {
      const parsedDate = Date.parse(review.date)
      return Number.isNaN(parsedDate) ? 0 : parsedDate
    }
    const helpfulCount = (review) => review.helpful + (helpfulReviews.includes(review.id) ? 1 : 0)

    return matching.sort((a, b) => {
      if (reviewSort === 'oldest') return reviewTime(a) - reviewTime(b) || a.id - b.id
      if (reviewSort === 'highest') return b.rating - a.rating || reviewTime(b) - reviewTime(a)
      if (reviewSort === 'lowest') return a.rating - b.rating || reviewTime(b) - reviewTime(a)
      if (reviewSort === 'helpful') return helpfulCount(b) - helpfulCount(a) || reviewTime(b) - reviewTime(a)
      return reviewTime(b) - reviewTime(a) || b.id - a.id
    })
  }, [customerReviews, helpfulReviews, reviewFilter, reviewSort])
  const reviewPages = useMemo(
    () => Array.from(
      { length: Math.ceil(filteredReviews.length / 3) },
      (_, index) => filteredReviews.slice(index * 3, index * 3 + 3),
    ),
    [filteredReviews],
  )
  const reviewAverage = useMemo(
    () => customerReviews.length ? customerReviews.reduce((total, review) => total + review.rating, 0) / customerReviews.length : 0,
    [customerReviews],
  )
  const ratingCounts = useMemo(
    () => Object.fromEntries([5, 4, 3, 2, 1].map((rating) => [rating, customerReviews.filter((review) => review.rating === rating).length])),
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
    let cancelled = false
    setReviewsLoading(true)
    setReviewsError('')
    loadBuyerReviews()
      .then((loaded) => {
        if (cancelled) return
        setCustomerReviews(loaded.map((review) => ({ ...review, date: new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(review.date)), title: 'Verified purchase', helpful: 0, verified: true })))
        setReviewIndex(0)
      })
      .catch((requestError) => {
        if (cancelled) return
        setCustomerReviews([])
        setReviewsError(requestError.message || 'Unable to load customer reviews.')
      })
      .finally(() => { if (!cancelled) setReviewsLoading(false) })
    return () => { cancelled = true }
  }, [reviewsRetry])

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') fetchProducts({ background: true })
    }, 25000)
    return () => window.clearInterval(timer)
  }, [fetchProducts])

  useEffect(() => {
    if (!cartNotice) return undefined
    const timer = window.setTimeout(() => setCartNotice(''), 5000)
    return () => window.clearTimeout(timer)
  }, [cartNotice])

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
    setCartNotice(`${selectedQuantity} ${selectedQuantity === 1 ? 'item is' : 'items are'} ready in your cart.`)
  }

  function showPreviousReview() {
    setReviewIndex((current) => (current - 1 + reviewPages.length) % reviewPages.length)
  }

  function showNextReview() {
    setReviewIndex((current) => (current + 1) % reviewPages.length)
  }

  function changeReviewFilter(value) {
    setReviewFilter(value)
    setReviewIndex(0)
  }

  function changeReviewSort(value) {
    setReviewSort(value)
    setReviewIndex(0)
  }

  function toggleHelpful(reviewId) {
    setHelpfulReviews((current) => current.includes(reviewId)
      ? current.filter((id) => id !== reviewId)
      : [...current, reviewId])
  }

  function renderReviewCard(review) {
    const markedHelpful = helpfulReviews.includes(review.id)
    return (
      <article className={`marketplace-review-card${review.isOwn ? ' is-own-review' : ''}`} key={review.id}>
        <div className="review-card-topline">
          <div className="review-stars" aria-label={`${review.rating} out of 5 stars`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} fill={index < review.rating ? 'currentColor' : 'none'} />)}</div>
          <span>{review.productSize}</span>
        </div>
        <h3>{review.title}</h3>
        <p>“{review.text}”</p>
        <div className="review-card-footer">
          <div className="review-author"><CircleUserRound aria-hidden="true" /><span><strong>{review.name}</strong><small>{review.date}</small></span><em>{review.isOwn ? 'Your Review' : 'Verified Buyer'}</em></div>
          <button className={markedHelpful ? 'is-helpful' : ''} type="button" onClick={() => toggleHelpful(review.id)} aria-pressed={markedHelpful}><ThumbsUp aria-hidden="true" /> Helpful ({review.helpful + (markedHelpful ? 1 : 0)})</button>
        </div>
      </article>
    )
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
            </div>
          </section>

          <section className="marketplace-reviews" aria-labelledby="marketplace-reviews-title">
            <div className="marketplace-reviews-heading">
              <div>
                <span>FROM VERIFIED ORDERS</span>
                <h2 id="marketplace-reviews-title">Customer Reviews</h2>
                <p>See what customers say about our farm-fresh pineapples.</p>
              </div>
            </div>

            {reviewsLoading ? (
              <div className="marketplace-review-empty" role="status">Loading customer reviews...</div>
            ) : reviewsError ? (
              <div className="marketplace-review-empty" role="alert">
                <p>{reviewsError}</p>
                <button className="marketplace-review-view-all" type="button" onClick={() => setReviewsRetry((current) => current + 1)}>Try again</button>
              </div>
            ) : customerReviews.length === 0 ? (
              <div className="marketplace-review-empty">No customer reviews yet.</div>
            ) : (
              <>
            <div className="marketplace-review-overview">
              <div className="review-average">
                <strong>{reviewAverage.toFixed(1)}</strong>
                <div className="review-stars" aria-label={`${reviewAverage.toFixed(1)} out of 5 stars`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} fill={index < Math.round(reviewAverage) ? 'currentColor' : 'none'} />)}</div>
                <span>Based on {customerReviews.length} customer reviews</span>
              </div>
              <div className="review-distribution" aria-label="Rating distribution">
                {[5, 4, 3, 2, 1].map((rating) => (
                  <button type="button" className={reviewFilter === String(rating) ? 'is-active' : ''} key={rating} onClick={() => changeReviewFilter(reviewFilter === String(rating) ? 'all' : String(rating))}>
                    <span>{rating} star</span>
                    <i><b style={{ width: `${(ratingCounts[rating] / Math.max(customerReviews.length, 1)) * 100}%` }} /></i>
                    <em>{ratingCounts[rating]}</em>
                  </button>
                ))}
              </div>
            </div>

            <div className="marketplace-review-toolbar">
              <strong>{reviewFilter === 'all' ? 'All reviews' : `${reviewFilter}-star reviews`} <span>({filteredReviews.length})</span></strong>
              <label>Sort by
                <select value={reviewSort} onChange={(event) => changeReviewSort(event.target.value)}>
                  <option value="recent">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="highest">Highest rated</option>
                  <option value="lowest">Lowest rated</option>
                  <option value="helpful">Most helpful</option>
                </select>
              </label>
            </div>

            {filteredReviews.length === 0 ? (
              <div className="marketplace-review-empty">No reviews match this rating yet.</div>
            ) : showAllReviews ? (
              <div className="marketplace-review-all-grid">{filteredReviews.map(renderReviewCard)}</div>
            ) : (
              <>
                <div className="marketplace-review-carousel">
                  <button className="marketplace-review-arrow is-previous" type="button" onClick={showPreviousReview} aria-label="Previous customer reviews"><ChevronLeft /></button>
                  <div className="marketplace-review-viewport" tabIndex="0" onKeyDown={(event) => { if (event.key === 'ArrowLeft') showPreviousReview(); if (event.key === 'ArrowRight') showNextReview() }}>
                    <div className="marketplace-review-track" style={{ transform: `translateX(-${reviewIndex * 100}%)` }}>
                      {reviewPages.map((pageReviews, pageIndex) => (
                        <div className="marketplace-review-slide" key={pageReviews[0].id} aria-hidden={pageIndex !== reviewIndex}>{pageReviews.map(renderReviewCard)}</div>
                      ))}
                    </div>
                  </div>
                  <button className="marketplace-review-arrow is-next" type="button" onClick={showNextReview} aria-label="Next customer reviews"><ChevronRight /></button>
                </div>
                <div className="marketplace-review-dots" aria-label={`Review group ${reviewIndex + 1} of ${reviewPages.length}`}>
                  {reviewPages.map((pageReviews, index) => <button className={index === reviewIndex ? 'is-active' : ''} type="button" key={pageReviews[0].id} onClick={() => setReviewIndex(index)} aria-label={`Show review group ${index + 1}`} aria-current={index === reviewIndex ? 'true' : undefined} />)}
                </div>
              </>
            )}
            <button className="marketplace-review-view-all" type="button" onClick={() => setShowAllReviews((current) => !current)}>{showAllReviews ? 'Show review gallery' : `View all ${filteredReviews.length} reviews`}</button>
              </>
            )}
          </section>
        </div>

      </section>
      <BuyerFooter />

      {cartNotice && (
        <aside className="buyer-cart-toast" role="status" aria-live="polite">
          <span className="buyer-cart-toast-icon"><CheckCircle2 aria-hidden="true" /></span>
          <div>
            <strong>Added to cart</strong>
            <p>{cartNotice}</p>
          </div>
          <a href="/buyer/cart">Check it now</a>
          <button type="button" onClick={() => setCartNotice('')} aria-label="Dismiss cart notification"><X /></button>
        </aside>
      )}

    </main>
  )
}
