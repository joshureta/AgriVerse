import jtoledoLogo from '../assets/Jtoledologo.png'
import marketplaceHero from '../assets/buyer/pineapple-farmer-marketplace-hero.png'
import storyBackground from '../assets/buyer/about-story-background-1200x500.png'
import '../styles/Buyer/buyerLanding.css'
import '../styles/Buyer/marketplaceLoading.css'

const trustItems = [1, 2, 3, 4]
const productItems = [1, 2, 3]
const detailRows = [1, 2, 3, 4]

function loadingVariant(path, search) {
  if (path === '/buyer') return 'home'
  if (path === '/buyer/about') return 'about'
  if (['/buyer/order', '/buyer/orders', '/buyer/place-order', '/buyer/direct-place-order'].includes(path)) return 'catalog'
  if (['/buyer/cart', '/buyer/shopping-cart'].includes(path)) return 'cart'
  if (path === '/buyer/checkout') return 'checkout'
  if (path === '/buyer/payment-confirmation') return 'payment'
  if (path === '/buyer/delivery-progress') return new URLSearchParams(search).has('track') ? 'order-detail' : 'orders'
  if (path === '/buyer/return-request') return 'return-request'
  if (path === '/buyer/return-details') return 'return-details'
  if (path === '/buyer/profile') return 'profile'
  if (path === '/buyer/messages') return 'messages'
  if (path === '/buyer/notifications') return 'notifications'
  return 'home'
}

function ProductPreview() {
  return (
    <div className="marketplace-product-grid">
      {productItems.map((item) => (
        <div className="marketplace-product-card marketplace-loading-product" key={item}>
          <span className="marketplace-loading-product-image" />
          <span className="marketplace-loading-product-copy">
            <span className="marketplace-loading-bar" />
            <span className="marketplace-loading-bar" />
            <span className="marketplace-loading-bar" />
          </span>
        </div>
      ))}
    </div>
  )
}

function Bar({ className = '' }) {
  return <span className={`marketplace-loading-bar ${className}`} />
}

function DetailRows({ count = 4 }) {
  return detailRows.slice(0, count).map((item) => (
    <div className="marketplace-loading-row" key={item}>
      <span className="marketplace-loading-circle" />
      <span className="marketplace-loading-row-copy">
        <Bar />
        <Bar />
      </span>
      <Bar className="is-end" />
    </div>
  ))
}

function PageHeading({ centered = false }) {
  return <div className={`marketplace-loading-page-heading${centered ? ' is-centered' : ''}`}><Bar /><Bar /></div>
}

function JourneyPreview() {
  return <div className="marketplace-loading-journey"><Bar /><Bar /><Bar /></div>
}

function SummaryPreview() {
  return <div className="marketplace-loading-panel marketplace-loading-summary"><Bar /><Bar /><Bar /><Bar /></div>
}

function InteriorPreview({ variant }) {
  if (variant === 'about') return (
    <section className="marketplace-loading-about" aria-hidden="true">
      <div className="marketplace-loading-about-banner" style={{ backgroundImage: `linear-gradient(rgba(247, 252, 244, .72), rgba(247, 252, 244, .72)), url(${storyBackground})` }}><Bar /></div>
      <div className="marketplace-loading-about-story">
        <div><Bar /><Bar /><Bar /></div>
        <div><Bar /><Bar /><Bar /><Bar /></div>
      </div>
      <div className="marketplace-loading-about-process"><Bar /><div className="marketplace-loading-about-process-row"><span /><div><Bar /><Bar /><Bar /></div></div></div>
    </section>
  )

  if (variant === 'messages') return (
    <section className="marketplace-loading-messages" aria-hidden="true">
      <div className="marketplace-loading-chat-header"><span className="marketplace-loading-circle" /><div><Bar /><Bar /></div></div>
      <div className="marketplace-loading-chat-body"><Bar /><Bar /><Bar /></div>
      <div className="marketplace-loading-chat-input"><Bar /></div>
    </section>
  )

  if (variant === 'payment') return (
    <section className="marketplace-loading-payment-screen" aria-hidden="true">
      <div className="marketplace-loading-panel marketplace-loading-payment"><span className="marketplace-loading-circle" /><Bar /><Bar /></div>
    </section>
  )

  return (
    <section className={`marketplace-loading-interior is-${variant}`} aria-hidden="true">
      {['catalog', 'cart', 'checkout'].includes(variant) && <JourneyPreview />}
      {['order-detail', 'return-request', 'return-details'].includes(variant) && <div className="marketplace-loading-breadcrumb"><Bar /><Bar /><Bar /></div>}
      {['catalog', 'cart', 'checkout', 'orders', 'order-detail', 'return-request', 'return-details', 'profile', 'notifications'].includes(variant) && <PageHeading centered={['cart', 'checkout', 'profile'].includes(variant)} />}

      {variant === 'catalog' && (
        <>
          <div className="marketplace-loading-catalog-title"><Bar /><Bar /></div>
          <div className="marketplace-loading-catalog-grid">{productItems.map((item) => <div className="marketplace-loading-panel marketplace-loading-catalog-product" key={item}><Bar className="is-badge" /><span className="marketplace-loading-product-image" /><Bar /><Bar /><Bar /><Bar className="is-quantity" /></div>)}</div>
          <div className="marketplace-loading-panel marketplace-loading-inline-cart"><Bar /><Bar /></div>
        </>
      )}

      {variant === 'cart' && (
        <div className="marketplace-loading-cart-content">
          <Bar className="is-section-title" />
          <div className="marketplace-loading-cart-items"><DetailRows count={3} /></div>
          <div className="marketplace-loading-panel marketplace-loading-cart-summary"><DetailRows count={2} /><div><Bar /><Bar /></div></div>
        </div>
      )}

      {variant === 'checkout' && (
        <div className="marketplace-loading-checkout-stack">
          <div className="marketplace-loading-panel marketplace-loading-checkout-address"><Bar /><Bar /><Bar /><Bar /></div>
          <div className="marketplace-loading-panel marketplace-loading-checkout-summary"><Bar /><DetailRows count={2} /><Bar /><Bar /></div>
          <div className="marketplace-loading-panel marketplace-loading-checkout-options"><div><Bar /><DetailRows count={2} /></div><div><Bar /><DetailRows count={2} /></div></div>
        </div>
      )}

      {variant === 'orders' && (
        <>
          <div className="marketplace-loading-order-tabs">{detailRows.map((item) => <Bar key={item} />)}</div>
          <div className="marketplace-loading-panel marketplace-loading-order-history"><div className="marketplace-loading-history-head"><Bar /><Bar /></div><DetailRows /></div>
        </>
      )}

      {variant === 'order-detail' && (
        <div className="marketplace-loading-detail-grid">
          <div><div className="marketplace-loading-panel marketplace-loading-stepper"><Bar /><div>{detailRows.map((item) => <span className="marketplace-loading-circle" key={item} />)}</div></div><div className="marketplace-loading-panel"><Bar className="is-section-title" /><DetailRows count={3} /></div></div>
          <SummaryPreview />
        </div>
      )}

      {variant === 'return-request' && (
        <div className="marketplace-loading-detail-grid">
          <div><div className="marketplace-loading-panel marketplace-loading-return-issues"><Bar className="is-section-title" /><div>{productItems.map((item) => <span className="marketplace-loading-issue-tile" key={item}><span className="marketplace-loading-circle" /><Bar /><Bar /></span>)}</div></div><div className="marketplace-loading-panel"><Bar className="is-section-title" /><DetailRows count={2} /></div></div>
          <SummaryPreview />
        </div>
      )}

      {variant === 'return-details' && (
        <div className="marketplace-loading-detail-grid">
          <div><div className="marketplace-loading-panel marketplace-loading-stepper"><Bar /><div>{detailRows.map((item) => <span className="marketplace-loading-circle" key={item} />)}</div></div><div className="marketplace-loading-panel"><Bar className="is-section-title" /><DetailRows count={2} /></div><div className="marketplace-loading-panel"><Bar className="is-section-title" /><Bar /><Bar /></div></div>
          <SummaryPreview />
        </div>
      )}

      {variant === 'profile' && (
        <div className="marketplace-loading-panel marketplace-loading-profile-card"><div className="marketplace-loading-profile-side"><span className="marketplace-loading-circle" /><Bar /><Bar /><Bar /></div><div className="marketplace-loading-profile-details"><Bar className="is-section-title" /><div>{detailRows.map((item) => <span key={item}><Bar /><Bar /></span>)}</div></div></div>
      )}

      {variant === 'notifications' && (
        <div className="marketplace-loading-notifications"><div className="marketplace-loading-notification-tabs"><Bar /><Bar /><Bar /></div><div className="marketplace-loading-notification-list"><DetailRows /></div></div>
      )}
    </section>
  )
}

export default function MarketplaceLoading({ path = '/buyer', search = '' }) {
  const variant = loadingVariant(path, search)
  const active = variant === 'about' ? 'about' : variant === 'home' ? 'home' : ['catalog', 'orders', 'order-detail', 'return-request', 'return-details', 'checkout', 'payment'].includes(variant) ? 'orders' : ''

  return (
    <main className="buyer-page buyer-marketplace-page marketplace-loading" aria-busy="true" aria-label="Loading marketplace">
      <header className="buyer-site-header marketplace-loading-header">
        <div className="buyer-header-main">
          <span className="buyer-brand">
            <img src={jtoledoLogo} alt="JToledo Trading" />
          </span>
          <nav className="buyer-main-nav" aria-label="Marketplace preview">
            <span className={active === 'about' ? 'is-active' : ''}>About Us</span>
            <span className={active === 'home' ? 'is-active' : ''}>Home</span>
            <span className={active === 'orders' ? 'is-active' : ''}>Order</span>
          </nav>
          <div className="marketplace-loading-header-tools" aria-hidden="true">
            <span className="marketplace-loading-icon" />
            <span className="marketplace-loading-icon" />
            <span className="marketplace-loading-icon" />
            <span className="marketplace-loading-profile" />
          </div>
        </div>
      </header>

      {variant === 'home' ? (
        <>
          <section
            className="marketplace-hero marketplace-loading-hero"
            style={{ backgroundImage: `url(${marketplaceHero})` }}
            aria-label="Marketplace content preview"
          >
            <div className="marketplace-loading-hero-copy" aria-hidden="true">
              <span className="marketplace-loading-bar is-eyebrow" />
              <span className="marketplace-loading-bar is-title" />
              <span className="marketplace-loading-bar is-subtitle" />
              <span className="marketplace-loading-bar is-description" />
              <span className="marketplace-loading-bar is-description-short" />
              <span className="marketplace-loading-bar is-button" />
            </div>
          </section>

          <section className="marketplace-trust-panel marketplace-loading-trust" aria-hidden="true">
            {trustItems.map((item) => (
              <div className="marketplace-trust-item" key={item}>
                <span className="marketplace-loading-circle" />
                <span className="marketplace-loading-trust-copy">
                  <span className="marketplace-loading-bar" />
                  <span className="marketplace-loading-bar" />
                </span>
              </div>
            ))}
          </section>

          <section className="marketplace-products marketplace-loading-products" aria-hidden="true">
            <div className="marketplace-loading-section-heading">
              <span className="marketplace-loading-bar" />
              <span className="marketplace-loading-bar" />
            </div>
            <ProductPreview />
          </section>
        </>
      ) : (
        <InteriorPreview variant={variant} />
      )}
    </main>
  )
}
