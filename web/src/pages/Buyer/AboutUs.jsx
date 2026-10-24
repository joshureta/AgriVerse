import { BuyerFooter, BuyerHeader } from '../../components/BuyerChrome.jsx'
import storyBackground from '../../assets/buyer/about-story-background-1200x500.png'
import landPreparationImage from '../../assets/buyer/about-process/land-preparation-hd.webp'
import plantingImage from '../../assets/buyer/about-process/planting-hd.webp'
import fertilizationImage from '../../assets/buyer/about-process/fertilization-hd.webp'
import fieldMaintenanceImage from '../../assets/buyer/about-process/field-maintenance-hd.webp'
import cropMonitoringImage from '../../assets/buyer/about-process/crop-monitoring-hd.webp'
import pestManagementImage from '../../assets/buyer/about-process/pest-management-hd.webp'
import floweringImage from '../../assets/buyer/about-process/flowering-hd.webp'
import fruitCareImage from '../../assets/buyer/about-process/fruit-care-hd.webp'
import harvestDistributionImage from '../../assets/buyer/about-process/harvest-distribution-hd.webp'
import '../../styles/Buyer/buyerLanding.css'
import '../../styles/Buyer/aboutUs.css'

const growingSteps = [
  {
    title: 'Land preparation',
    image: landPreparationImage,
    description: 'Pineapple production begins with preparing the field. Workers plow and cultivate the soil using a Kubota tractor, then ready the planting areas for the new crop. This stage takes approximately two months and gives the team time to organize the field before planting begins.',
  },
  {
    title: 'Planting',
    image: plantingImage,
    description: 'Once the field is ready, workers plant pineapple suckers in the prepared rows. They follow the planned spacing so the crop can grow evenly across the plantation. Planting is generally completed within a week, after which the team begins its regular care and monitoring activities.',
  },
  {
    title: 'Fertilization',
    image: fertilizationImage,
    description: 'Workers apply fertilizer throughout the growth cycle, generally every three months. They place it around the base of each plant to support leaf development and overall growth. While working through the rows, they also observe the plants and soil to identify areas that may need closer attention.',
  },
  {
    title: 'Field maintenance',
    image: fieldMaintenanceImage,
    description: 'The team regularly removes weeds that compete with pineapple plants for nutrients. Workers also maintain the soil, clean the growing areas, and keep the field accessible for inspections. These routine tasks help them care for the crop consistently as it develops.',
  },
  {
    title: 'Crop monitoring',
    image: cropMonitoringImage,
    description: 'Workers inspect the field each week, checking leaf color, plant size, soil moisture, and general plant condition. Changes such as yellowing leaves or uneven growth are recorded for further assessment. Drone images help the team observe plant distribution and spot areas that may be difficult to assess from the ground alone.',
  },
  {
    title: 'Pest management',
    image: pestManagementImage,
    description: 'During inspections, workers look for signs of pests and damage to the plants. When they find a problem, they assess the affected area and apply suitable control measures. If a plant is severely affected and cannot be treated, it may be removed to help prevent the problem from spreading to nearby crops.',
  },
  {
    title: 'Flowering',
    image: floweringImage,
    description: 'Flowering typically begins around the tenth month, depending on plant maturity and growing conditions. Workers watch for flower emergence and observe whether plants across the field are developing at a similar pace. They continue checking plant health during this stage because flowering marks the start of fruit formation.',
  },
  {
    title: 'Fruit care',
    image: fruitCareImage,
    description: 'As pineapples develop, workers inspect the fruit and surrounding leaves for damage or signs of pests. They remove damaged leaves when needed and take protective measures during periods of excessive heat or heavy rainfall. Continued care at this stage helps the team maintain fruit quality until harvest.',
  },
  {
    title: 'Harvest and distribution',
    image: harvestDistributionImage,
    description: 'Pineapples are generally ready for harvest four to five months after flowering, depending on the variety and conditions in the field. Workers carefully harvest and inspect the fruit, then sort it into small, medium, and large sizes. Orders are prepared according to buyer needs and delivered to local buyers and trading areas, including Divisoria and Q-Mart.',
  },
]

export default function AboutUs() {
  return (
    <main className="buyer-page">
      <BuyerHeader active="about" />
      <section
        className="buyer-about-banner"
        aria-labelledby="about-story-title"
        style={{ backgroundImage: `url(${storyBackground})` }}
      >
        <h1 id="about-story-title">Our Story</h1>
      </section>

      <article className="buyer-about-content">
        <section className="buyer-about-story" aria-labelledby="story-heading">
          <div className="buyer-about-story-heading">
            <span>JToledo Trading</span>
            <h2 id="story-heading">Rooted in Tagaytay.<br />Growing for generations.</h2>
          </div>
          <div className="buyer-about-story-copy">
            <p>
              JToledo Trading is a privately owned pineapple farm in Tagaytay, managed by its owner, Joseph Toledo. Over more than twenty-five years, the business has grown from a small farming venture into an approximately ten-hectare operation.
            </p>
            <p>
              Its twelve workers carry out the daily work of planting, caring for, harvesting, and preparing pineapples for buyers. Alongside its farm operations, JToledo Trading maintains a retail presence in Cubao and supplies produce to trading areas in Metro Manila.
            </p>
          </div>
        </section>

        <section className="buyer-about-process" aria-labelledby="growing-title">
          <div className="buyer-about-process-intro">
            <h2 id="growing-title">How We Grow Our Pineapples</h2>
          </div>
          {growingSteps.map(({ title, description, image }) => (
            <section className="buyer-about-process-row" key={title}>
              <img className="buyer-about-process-art" src={image} alt="" loading="lazy" />
              <div className="buyer-about-process-copy">
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </section>
          ))}
        </section>
      </article>
      <BuyerFooter />
    </main>
  )
}
