import { BadgeCheck, Leaf, Sprout } from 'lucide-react'
import { BuyerFooter, BuyerHeader } from '../../components/BuyerChrome.jsx'
import marketplaceHero from '../../assets/buyer/buyer-marketplace-hero.png'
import trustIcons from '../../assets/buyer/buyer-trust-icons.png'
import pineappleProduct from '../../assets/buyer/pineapple-product-clean.png'
import pineappleFarm from '../../assets/buyer/pineapple-farm-story.png'
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

const farmPromises = [
  { icon: Sprout, label: 'Sustainable Farming' },
  { icon: Leaf, label: 'Carefully Harvested' },
  { icon: BadgeCheck, label: 'Top Quality Guaranteed' },
  { icon: Sprout, label: '100% Pineapple' },
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
          <div className="marketplace-farm-promises">
            {farmPromises.map(({ icon: Icon, label }) => (
              <div key={label}>
                <Icon aria-hidden="true" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <BuyerFooter />
    </main>
  )
}
