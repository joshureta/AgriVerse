import { useState } from 'react'
import { CircleUserRound, Minus, Plus, ShoppingCart, Star } from 'lucide-react'
import { BuyerFooter, BuyerHeader } from '../../components/BuyerChrome.jsx'
import orderBackground from '../../assets/buyer/buyer-order-background.png'
import pineappleImage from '../../assets/buyer/two-pineapples.png'
import '../../styles/Buyer/buyerLanding.css'
import '../../styles/Buyer/buyerCommerce.css'

const products = [
  { id: 'small', name: 'Small Pineapple', weight: '400g – 800g', price: 45 },
  { id: 'medium', name: 'Medium Pineapple', weight: '900g – 1.4kg', price: 60 },
  { id: 'large', name: 'Large Pineapple', weight: '1.5kg – 2kg', price: 80 },
]

export default function BuyerOrders() {
  const [quantities, setQuantities] = useState({ small: 50, medium: 0, large: 0 })

  function updateQuantity(id, amount) {
    setQuantities((current) => ({ ...current, [id]: Math.max(0, current[id] + amount) }))
  }

  return (
    <main className="buyer-page buyer-commerce-page">
      <BuyerHeader active="orders" cartCount={quantities.small > 0 ? 1 : 0} />
      <section className="commerce-stage" style={{ backgroundImage: `url(${orderBackground})` }}>
        <div className="commerce-heading">
          <p>FRESH FROM THE FARM</p>
          <h1>Order Fresh Pineapple</h1>
          <span>Fill in your order to proceed with your purchase</span>
        </div>

        <section className="product-panel" aria-labelledby="product-quantity-title">
          <h2 id="product-quantity-title">Product Quantity</h2>
          <div className="product-list">
            {products.map((product) => {
              const total = product.price * quantities[product.id]
              return (
                <article className="product-card" key={product.id}>
                  <img src={pineappleImage} alt="Two fresh pineapples" />
                  <div className="product-copy">
                    <h3>{product.name}</h3>
                    <p>{product.weight}</p>
                    <button type="button" className="add-cart-button"><ShoppingCart aria-hidden="true" /> Add to cart</button>
                  </div>
                  <div className="product-price">PHP {product.price.toFixed(2)}</div>
                  <div className="quantity-control" aria-label={`${product.name} quantity`}>
                    <button type="button" onClick={() => updateQuantity(product.id, -1)} aria-label={`Reduce ${product.name}`}><Minus /></button>
                    <output>{quantities[product.id]}</output>
                    <button type="button" onClick={() => updateQuantity(product.id, 1)} aria-label={`Add ${product.name}`}><Plus /></button>
                  </div>
                  <strong className="product-total">Total: PHP {total.toLocaleString()}</strong>
                </article>
              )
            })}
          </div>
        </section>

        <section className="review-panel" aria-labelledby="customer-reviews-title">
          <h2 id="customer-reviews-title">Customer Reviews <span>(82)</span></h2>
          <div className="review-list">
            {['Sweet and juicy, worth the price!', 'Fast delivery and fresh pineapple', 'Good packaging, will order again'].map((review) => (
              <article className="review-row" key={review}>
                <CircleUserRound aria-hidden="true" />
                <p>{review}</p>
                <div aria-label="5 out of 5 stars">{Array.from({ length: 5 }, (_, index) => <Star key={index} fill="currentColor" />)}</div>
              </article>
            ))}
          </div>
          <button className="reviews-button" type="button">View All Reviews</button>
        </section>
      </section>
      <BuyerFooter />
    </main>
  )
}
