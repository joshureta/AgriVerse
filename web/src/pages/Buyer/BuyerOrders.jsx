import { useState } from 'react'
import { CircleUserRound, Minus, Plus, ShoppingCart, Star } from 'lucide-react'
import { BuyerFooter, BuyerHeader } from '../../components/BuyerChrome.jsx'
import pineappleImage from '../../assets/buyer/pineapple-product-clean.png'
import '../../styles/Buyer/buyerLanding.css'
import '../../styles/Buyer/shoppingCart.css'

const products = [
  { id: 'small', name: 'Small Pineapple', weight: '400g – 500g', price: 50 },
  { id: 'medium', name: 'Medium Pineapple', weight: '600g – 900g', price: 65 },
  { id: 'large', name: 'Large Pineapple', weight: '1kg – 1.5kg', price: 80 },
]

const reviews = [
  { name: 'Juan D.', date: 'May 12, 2026', text: 'Sweet and juicy, worth the price!' },
  { name: 'Maria S.', date: 'May 9, 2026', text: 'Fast delivery and fresh pineapple.' },
  { name: 'Kevin L.', date: 'May 7, 2026', text: 'Good packaging, will order again!' },
]

export default function BuyerOrders() {
  const [quantities, setQuantities] = useState({ small: 50, medium: 50, large: 50 })

  function updateQuantity(id, amount) {
    setQuantities((current) => ({ ...current, [id]: Math.max(0, current[id] + amount) }))
  }

  const orderTotal = products.reduce((sum, product) => sum + product.price * quantities[product.id], 0)

  return (
    <main className="buyer-page marketplace-page">
      <BuyerHeader active="orders" cartCount={1} />
      <section className="marketplace-order-layout">
        <div className="marketplace-order-main">
          <header className="marketplace-title">
            <h1>Order Fresh Pineapples</h1>
            <p>Cultivating pineapples for over 25 years</p>
          </header>

          <section className="pineapple-selection" aria-labelledby="pineapple-size-title">
            <h2 id="pineapple-size-title">Choose Your Pineapple Size</h2>
            <div className="pineapple-product-grid">
              {products.map((product) => (
                <article className="pineapple-product-card" key={product.id}>
                  <img src={pineappleImage} alt={`${product.name} product`} />
                  <h3>{product.name}</h3>
                  <p>{product.weight}</p>
                  <strong>PHP {product.price.toFixed(2)}</strong>
                  <div className="marketplace-quantity" aria-label={`${product.name} quantity`}>
                    <button type="button" onClick={() => updateQuantity(product.id, -1)} aria-label={`Reduce ${product.name}`}><Minus /></button>
                    <output>{quantities[product.id]}</output>
                    <button type="button" onClick={() => updateQuantity(product.id, 1)} aria-label={`Add ${product.name}`}><Plus /></button>
                  </div>
                </article>
              ))}
            </div>
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
          {products.map((product) => (
            <div className="summary-product" key={product.id}>
              <img src={pineappleImage} alt="" />
              <span><strong>{product.name.replace(' Pineapple', '')}</strong><small>Pineapple<br />{product.weight}</small></span>
              <b>{quantities[product.id]}</b>
              <b>{(product.price * quantities[product.id]).toLocaleString()}</b>
            </div>
          ))}
          <div className="summary-total">Total: <strong>PHP {orderTotal.toLocaleString()}</strong></div>
          <a className="summary-cart-button" href="/buyer/cart"><ShoppingCart aria-hidden="true" /> Add to Cart</a>
        </aside>
      </section>
      <BuyerFooter />
    </main>
  )
}
