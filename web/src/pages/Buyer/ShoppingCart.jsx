import { useState } from 'react'
import { Minus, Plus, ShoppingCart as CartIcon } from 'lucide-react'
import { BuyerFooter, BuyerHeader } from '../../components/BuyerChrome.jsx'
import pineappleImage from '../../assets/buyer/pineapple-product-clean.png'
import '../../styles/Buyer/buyerLanding.css'
import '../../styles/Buyer/shoppingCart.css'

export default function ShoppingCart() {
  const [quantity, setQuantity] = useState(50)
  const subtotal = quantity * 50
  const shipping = quantity > 0 ? 100 : 0
  const total = subtotal + shipping

  return (
    <main className="buyer-page marketplace-page">
      <BuyerHeader active="cart" cartCount={quantity > 0 ? 1 : 0} />
      <section className="shopping-cart-page">
        <header className="shopping-cart-title">
          <h1>Order Fresh Pineapple</h1>
          <p>Fill in your order to proceed with your purchase</p>
        </header>

        <div className="shopping-cart-content">
          <h2><CartIcon aria-hidden="true" /> Shopping Cart</h2>
          {quantity > 0 ? (
            <article className="shopping-cart-item">
              <img src={pineappleImage} alt="Small pineapple" />
              <div className="shopping-cart-item-name"><h3>Small Pineapple</h3><p>400g – 500g</p></div>
              <strong className="shopping-cart-unit-price">PHP 50.00</strong>
              <div className="shopping-cart-quantity">
                <button type="button" onClick={() => setQuantity((value) => Math.max(0, value - 1))} aria-label="Reduce quantity"><Minus /></button>
                <output>{quantity}</output>
                <button type="button" onClick={() => setQuantity((value) => value + 1)} aria-label="Add quantity"><Plus /></button>
              </div>
              <button className="shopping-cart-remove" type="button" onClick={() => setQuantity(0)}>Remove</button>
              <span className="shopping-cart-line-total">Total: <strong>PHP {subtotal.toLocaleString()}</strong></span>
            </article>
          ) : <p className="shopping-cart-empty">Your shopping cart is empty.</p>}

          <section className="shopping-cart-summary" aria-label="Cart totals">
            <div><span>Subtotal</span><strong>PHP {subtotal.toLocaleString()}.00</strong></div>
            <div><span>Shipping Fee</span><strong>PHP {shipping.toLocaleString()}.00</strong></div>
            <div className="shopping-cart-grand-total">
              <span>Total</span>
              <strong>PHP {total.toLocaleString()}</strong>
              <div className="shopping-cart-actions">
                <a className="shopping-cart-add-more" href="/buyer/order"><CartIcon aria-hidden="true" /> Add More</a>
                <a className="shopping-cart-checkout" href="/buyer/checkout">Check Out</a>
              </div>
            </div>
          </section>
        </div>
      </section>
      <BuyerFooter />
    </main>
  )
}
