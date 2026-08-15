import { ArrowRight, CheckCircle2, MapPin } from 'lucide-react'
import { BuyerFooter, BuyerHeader } from '../../components/BuyerChrome.jsx'
import marketplaceHero from '../../assets/buyer/buyer-marketplace-hero.png'
import trustIcons from '../../assets/buyer/buyer-trust-icons.png'
import pineappleProduct from '../../assets/buyer/pineapple-product-clean.png'
import pineappleFarm from '../../assets/buyer/pineapple-farm-story.png'
import deliveryCoverageMap from '../../assets/buyer/delivery-coverage-map-white-v2.png'
import restaurantIcon from '../../assets/buyer/business-restaurant-green.png'
import groceryIcon from '../../assets/buyer/business-grocery-green.png'
import retailerIcon from '../../assets/buyer/business-retailer-green.png'
import exportPartnerIcon from '../../assets/buyer/business-export-partner-green.png'
import testimonialFarm from '../../assets/buyer/pineapple-testimonial-farm.png'
import '../../styles/Buyer/buyerLanding.css'

const trustHighlights = [
  {
    title: 'Fresh & Quality',
    description: 'We deliver only the freshest and highest quality produce.',
  },
  {
    title: 'Fast Delivery',
    description: 'Reliable and timely delivery straight to your business.',
  },
  {
    title: 'Trusted Partner',
    description: 'Building long-term relationships with our valued customers.',
  },
  {
    title: 'Secure Service',
    description: 'Secure transactions and dependable customer support.',
  },
]

const pineappleSizes = [
  {
    name: 'Small',
    weight: '400g - 500g',
    description: 'Perfect for juice and snacks.',
    imageClass: 'is-small',
  },
  {
    name: 'Medium',
    weight: '700g - 900g',
    description: 'Ideal balance of sweetness and size.',
    imageClass: 'is-medium',
  },
  {
    name: 'Large',
    weight: '1kg - 1.3kg',
    description: 'Great for sharing, events, and premium use.',
    imageClass: 'is-large',
  },
]

const deliveryLocations = [
  { name: 'Tagaytay City', note: 'Main Farm & Distribution Hub' },
  { name: 'Metro Manila', note: 'Daily Deliveries' },
  { name: 'Batangas', note: 'Serving All Towns' },
  { name: 'Cavite', note: 'Regular Delivery Schedule' },
  { name: 'Laguna', note: 'Delivering Freshness' },
  { name: 'Other Provinces', note: 'Via Cargo & Logistics Partners' },
]

const deliveryPromises = [
  'On-time Delivery',
  'Safe Handling',
  'Bulk Orders Welcome',
  'Direct from Farm',
]

const businessPartners = [
  { label: 'Restaurants', icon: restaurantIcon },
  { label: 'Grocery Stores', icon: groceryIcon },
  { label: 'Retailers', icon: retailerIcon },
  { label: 'Export Partners', icon: exportPartnerIcon },
]

export default function BuyerLanding() {
  return (
    <main className="buyer-page buyer-marketplace-page">
      <BuyerHeader active="home" />

      <section
        className="marketplace-hero"
        aria-labelledby="marketplace-title"
        style={{ backgroundImage: `url(${marketplaceHero})` }}
      >
        <div className="marketplace-hero-copy">
          <p className="marketplace-eyebrow">Welcome to</p>
          <h1 id="marketplace-title"><strong>JToledo</strong><span>Trading Marketplace</span></h1>
          <p className="marketplace-intro">
            Your trusted source for fresh, high-quality agricultural products. We bring
            farm-fresh goodness straight to your business.
          </p>
          <a className="marketplace-shop-button" href="/buyer/order">
            Shop now <span aria-hidden="true">›</span>
          </a>
        </div>
      </section>

      <section className="marketplace-trust-panel" aria-label="Why choose JToledo Trading">
        {trustHighlights.map((highlight, index) => (
          <article className="marketplace-trust-item" key={highlight.title}>
            <span
              className={`marketplace-trust-icon icon-${index + 1}`}
              style={{ backgroundImage: `url(${trustIcons})` }}
              aria-hidden="true"
            />
            <div>
              <h2>{highlight.title}</h2>
              <p>{highlight.description}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="marketplace-products" aria-labelledby="pineapple-sizes-title">
        <header className="marketplace-section-heading">
          <h2 id="pineapple-sizes-title"><span aria-hidden="true">–</span> Our Pineapples <span aria-hidden="true">–</span></h2>
          <p>Three size choices.</p>
        </header>

        <div className="marketplace-product-grid">
          {pineappleSizes.map((pineapple) => (
            <a className="marketplace-product-card" href="/buyer/order" key={pineapple.name}>
              <img className={pineapple.imageClass} src={pineappleProduct} alt={`${pineapple.name} JToledo pineapple`} />
              <div className="marketplace-product-copy">
                <h3>{pineapple.name}</h3>
                <span>{pineapple.weight}</span>
                <p>{pineapple.description}</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="marketplace-farm-story" aria-labelledby="farm-story-title">
        <img src={pineappleFarm} alt="Rows of pineapple plants growing on a Philippine farm" />
        <div className="marketplace-farm-copy">
          <h2 id="farm-story-title">From our farm to you</h2>
          <p>
            Grown with care through sustainable farming practices. We harvest every
            pineapple at peak ripeness to deliver the best taste and quality.
          </p>
        </div>
      </section>

      <section
        className="marketplace-delivery"
        aria-labelledby="delivery-coverage-title"
        style={{ backgroundImage: `url(${deliveryCoverageMap})` }}
      >
        <div className="marketplace-delivery-copy">
          <p className="marketplace-delivery-eyebrow">One farm. Fresh pineapples.</p>
          <h2 id="delivery-coverage-title">Multiple Destinations</h2>
          <p>We deliver fresh pineapples to various locations to serve you better.</p>
          <ul className="marketplace-delivery-locations">
            {deliveryLocations.map((location) => (
              <li key={location.name}>
                <MapPin aria-hidden="true" />
                <span><strong>{location.name}</strong><small>{location.note}</small></span>
              </li>
            ))}
          </ul>
        </div>

        <aside className="marketplace-delivery-aside" aria-label="Delivery information">
          <article>
            <h3>Reliable Delivery<br />Every Time</h3>
            <p>We ensure timely and safe delivery of our pineapples to your location.</p>
            <ul>
              {deliveryPromises.map((promise) => (
                <li key={promise}><CheckCircle2 aria-hidden="true" /> {promise}</li>
              ))}
            </ul>
          </article>
          <article className="marketplace-bulk-order">
            <h3>Need Bulk Order?</h3>
            <p>Contact us for special pricing and customized bulk orders.</p>
            <a href="#contact">Contact Us <ArrowRight aria-hidden="true" /></a>
          </article>
        </aside>
      </section>

      <section
        className="marketplace-social-proof"
        aria-labelledby="business-trust-title"
        style={{ backgroundImage: `url(${testimonialFarm})` }}
      >
        <div className="marketplace-business-trust">
          <h2 id="business-trust-title">Trusted by Businesses<br />Across Different Locations</h2>
          <p>We are proud to supply quality pineapples to resellers, retailers, and businesses nationwide.</p>
          <div className="marketplace-business-types">
            {businessPartners.map((partner) => (
              <div key={partner.label}>
                <span><img src={partner.icon} alt="" /></span>
                <strong>{partner.label}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="marketplace-testimonial">
          <h2>What Our Customers Say</h2>
          <article>
            <span className="marketplace-review-mark" aria-hidden="true">“</span>
            <blockquote>
              The pineapples from JToledo are consistently sweet and fresh. Our customers love the quality!
            </blockquote>
            <footer>
              <strong>Mark D.</strong>
              <span>Grocery Store Owner, Metro Manila</span>
            </footer>
          </article>
          <div className="marketplace-review-dots" aria-label="Review 1 of 3"><span className="is-active" /><span /><span /></div>
        </div>
      </section>

      <BuyerFooter />
    </main>
  )
}
