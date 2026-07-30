import '../../styles/buyer/buyerLanding.css'

export default function BuyerLanding() {
  return (
    <main className="buyer-page">
      <header className="buyer-header">
        <div className="buyer-header-top">
          <a className="buyer-brand" href="/buyer" aria-label="JToledo Trading home">
            <span className="buyer-brand-mark" aria-hidden="true">J</span>
            <span>
              <strong>JTOLEDO</strong>
              <small>TRADING</small>
            </span>
          </a>

          <div className="buyer-account-actions">
            <a className="buyer-cart" href="#orders" aria-label="Shopping cart">🛒</a>
            <div className="buyer-profile">
              <span className="buyer-profile-icon" aria-hidden="true">●</span>
              <span>Profile Name</span>
              <span aria-hidden="true">▾</span>
              <div className="buyer-profile-menu">
                <a href="#profile">My Profile</a>
                <a href="/login">Sign Out</a>
              </div>
            </div>
          </div>
        </div>

        <nav className="buyer-nav" aria-label="Main navigation">
          <a href="#about">About Us</a>
          <a className="active" href="/buyer">Home</a>
          <a href="#orders">Orders</a>
        </nav>
      </header>

      <section className="buyer-hero" aria-labelledby="buyer-welcome-title">
        <div className="buyer-hero-overlay">
          <h1 id="buyer-welcome-title">Welcome Buyer!</h1>

          <div className="buyer-actions">
            <article className="buyer-action-card buyer-order-card" id="orders">
              <div className="buyer-card-art" aria-hidden="true">🍍</div>
              <div className="buyer-card-content">
                <h2>Order Fresh Pineapples</h2>
                <a href="#shop">Order Now</a>
              </div>
            </article>

            <article className="buyer-action-card buyer-chat-card">
              <div className="buyer-card-art" aria-hidden="true">💬</div>
              <div className="buyer-card-content">
                <h2>Chat with Farm</h2>
                <p>Directly message with the farm</p>
                <a href="#messages">Message Now</a>
              </div>
            </article>
          </div>
        </div>
      </section>

      <footer className="buyer-footer">
        <div className="buyer-footer-grid">
          <section id="about">
            <h2>About Jtoledo Trading</h2>
            <p>
              JToledo Trading is a privately owned agricultural enterprise in
              Tagaytay specializing in pineapple farming and distribution,
              with over 25 years of farming operations managed by Joseph Toledo.
            </p>
          </section>

          <section>
            <h2>Navigation</h2>
            <a href="#about">About Us</a>
            <a href="#contact">Contact Us</a>
          </section>

          <section id="contact">
            <h2>Contact</h2>
            <p>
              Mobile Number: 09089947150<br />
              Email: jperatoleedo7@gmail.com<br />
              107 Daling Malabag, Brgy. Maitim 2nd,<br />
              Silang, Cavite 4118, Philippines
            </p>
          </section>

          <section>
            <h2>Stay Connected</h2>
            <p>
              Stay connected with our latest news and price alerts to never
              miss a great deal.
            </p>
            <form className="buyer-newsletter">
              <label className="sr-only" htmlFor="buyer-newsletter-email">
                Email address
              </label>
              <input
                id="buyer-newsletter-email"
                type="email"
                placeholder="Email Address"
              />
              <button type="submit" aria-label="Subscribe">➤</button>
            </form>
          </section>
        </div>

        <div className="buyer-footer-bottom">
          <span>© 2026 All rights reserved.</span>
          <div>
            <a href="#terms">Terms &amp; Conditions</a>
            <a href="#privacy">Private Policy</a>
          </div>
        </div>
      </footer>
    </main>
  )
}
