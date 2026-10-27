import { useEffect, useState } from 'react'
import { ArrowRight, CheckCircle2, MapPin, Star } from 'lucide-react'
import { BuyerFooter, BuyerHeader } from '../../components/BuyerChrome.jsx'
import { loadFeaturedBuyerReviews } from '../../services/buyerMarketplace.js'
import marketplaceHero from '../../assets/buyer/pineapple-farmer-marketplace-hero.png'
import trustIcons from '../../assets/buyer/buyer-trust-icons.png'
import pineappleProduct from '../../assets/buyer/pineapple-product-clean.png'
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
    imageClass: 'is-small',
  },
  {
    name: 'Medium',
    weight: '700g - 900g',
    imageClass: 'is-medium',
  },
  {
    name: 'Large',
    weight: '1kg - 1.3kg',
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
  const [featuredReviews, setFeaturedReviews] = useState([])
  const [activeReviewIndex, setActiveReviewIndex] = useState(0)
  const [reviewLoading, setReviewLoading] = useState(true)
  const [reviewError, setReviewError] = useState(false)
  const [reviewRetry, setReviewRetry] = useState(0)

  useEffect(() => {
    let cancelled = false
    setReviewLoading(true)
    setReviewError(false)
    loadFeaturedBuyerReviews()
      .then((reviews) => {
        if (!cancelled) {
          setFeaturedReviews(reviews.filter((review) => review?.text?.trim()))
          setActiveReviewIndex(0)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFeaturedReviews([])
          setReviewError(true)
        }
      })
      .finally(() => { if (!cancelled) setReviewLoading(false) })
    return () => { cancelled = true }
  }, [reviewRetry])

  const featuredReview = featuredReviews[activeReviewIndex]

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
          <h2 id="pineapple-sizes-title">Our Pineapples</h2>
          <p>Three size choices.</p>
        </header>

        <div className="marketplace-product-grid">
          {pineappleSizes.map((pineapple) => (
            <a className="marketplace-product-card" href="/buyer/order" key={pineapple.name}>
              <img className={pineapple.imageClass} src={pineappleProduct} alt={`${pineapple.name} JToledo pineapple`} />
              <div className="marketplace-product-copy">
                <h3>{pineapple.name}</h3>
                <span>{pineapple.weight}</span>
              </div>
            </a>
          ))}
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
          {reviewLoading ? (
            <article className="marketplace-testimonial-status" role="status">Loading customer feedback...</article>
          ) : reviewError ? (
            <article className="marketplace-testimonial-status" role="alert">
              <p>Customer feedback is unavailable right now.</p>
              <button type="button" onClick={() => setReviewRetry((current) => current + 1)}>Try again</button>
            </article>
          ) : featuredReview ? (
            <article>
              <span className="marketplace-review-mark" aria-hidden="true">“</span>
              <div className="marketplace-testimonial-rating" role="img" aria-label={`${featuredReview.rating} out of 5 stars`}>
                {Array.from({ length: 5 }, (_, index) => <Star key={index} fill={index < featuredReview.rating ? 'currentColor' : 'none'} aria-hidden="true" />)}
              </div>
              <blockquote>{featuredReview.text}</blockquote>
              <footer>
                <strong>{featuredReview.name}</strong>
                <span>Verified buyer · {featuredReview.productSize}</span>
              </footer>
            </article>
          ) : (
            <article className="marketplace-testimonial-status">No written customer reviews yet.</article>
          )}
          {featuredReviews.length > 1 && !reviewLoading && !reviewError && (
            <div className="marketplace-testimonial-dots" role="group" aria-label="Choose a customer review">
              {featuredReviews.map((review, index) => (
                <button
                  className={index === activeReviewIndex ? 'is-active' : ''}
                  type="button"
                  key={review.id}
                  onClick={() => setActiveReviewIndex(index)}
                  aria-label={`Show customer review ${index + 1} of ${featuredReviews.length}`}
                  aria-current={index === activeReviewIndex ? 'true' : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <BuyerFooter />
    </main>
  )
}
