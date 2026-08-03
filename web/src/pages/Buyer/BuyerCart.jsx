import { useState } from 'react'
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { BuyerFooter, BuyerHeader } from '../../components/BuyerChrome.jsx'
import orderBackground from '../../assets/buyer/buyer-order-background.png'
import pineappleImage from '../../assets/buyer/two-pineapples.png'
import '../../styles/Buyer/buyerLanding.css'
import '../../styles/Buyer/buyerCommerce.css'

export default function BuyerCart() {
  const [quantity, setQuantity] = useState(50)
  const subtotal = quantity * 45
  const shipping = quantity > 0 ? 100 : 0

  return (
    <main className="buyer-page buyer-commerce-page">
      <BuyerHeader active="cart" cartCount={quantity > 0 ? 1 : 0} />
      <section className="commerce-stage cart-stage" style={{ backgroundImage: `url(${orderBackground})` }}>
        <div className="commerce-heading">
          <p>YOUR FARM-FRESH ORDER</p>
          <h1>Order Fresh Pineapple</h1>
          <span>Review your cart before completing your purchase</span>
        </div>

        <section className="cart-panel" aria-labelledby="shopping-cart-title">
          <h2 id="shopping-cart-title"><ShoppingCart aria-hidden="true" /> Shopping Cart</h2>
          {quantity > 0 ? (
            <article className="cart-item">
              <img src={pineappleImage} alt="Two fresh pineapples" />
              <div className="cart-item-copy"><h3>Small Pineapple</h3><p>400g – 800g</p></div>
              <strong>PHP 45.00</strong>
              <div className="quantity-control">
                <button type="button" onClick={() => setQuantity((value) => Math.max(0, value - 1))} aria-label="Reduce quantity"><Minus /></button>
                <output>{quantity}</output>
                <button type="button" onClick={() => setQuantity((value) => value + 1)} aria-label="Add quantity"><Plus /></button>
              </div>
              <button className="remove-cart-item" type="button" onClick={() => setQuantity(0)}><Trash2 /> Remove</button>
              <span className="cart-line-total">Total: PHP {subtotal.toLocaleString()}</span>
            </article>
          ) : <p className="empty-cart">Your shopping cart is empty.</p>}
          <a className="add-more-button" href="/buyer/order"><ShoppingCart aria-hidden="true" /> Add More</a>
        </section>

        <section className="checkout-panel" aria-label="Order summary">
          <div><span>Subtotal</span><strong>PHP {subtotal.toLocaleString()}</strong></div>
          <div><span>Shipping Fee</span><strong>PHP {shipping.toLocaleString()}</strong></div>
          <div className="checkout-total"><span>Total</span><strong>PHP {(subtotal + shipping).toLocaleString()}</strong></div>
          <button type="button">Check Out</button>
          <small>Front-end checkout mockup only</small>
        </section>
      </section>
      <BuyerFooter />
    </main>
  )
}
