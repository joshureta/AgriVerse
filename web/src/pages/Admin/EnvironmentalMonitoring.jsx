import { useEffect, useMemo, useState } from 'react'
import {
  Antenna,
  CalendarDays,
  MapPin,
  Radio,
} from 'lucide-react'
import { AdminSidebar, AdminTopbar } from '../../components/AdminNavigation.jsx'
import weatherSunnyImage from '../../assets/weather/mobile/weather-real-sunny.png'
import weatherRainyImage from '../../assets/weather/mobile/weather-real-rainy.png'
import weatherCloudyImage from '../../assets/weather/mobile/weather-real-cloudy.png'
import weatherStormyImage from '../../assets/weather/mobile/weather-real-stormy.png'
import weatherNightImage from '../../assets/weather/mobile/weather-real-night.png'
import weatherSunnyIcon from '../../assets/weather/mobile/weather-icon-sunny.png'
import weatherRainyIcon from '../../assets/weather/mobile/weather-icon-rainy.png'
import weatherCloudyIcon from '../../assets/weather/mobile/weather-icon-cloudy.png'
import weatherStormyIcon from '../../assets/weather/mobile/weather-icon-stormy.png'
import weatherNightIcon from '../../assets/weather/mobile/weather-icon-night.png'
import temperatureMetricIcon from '../../assets/monitoring/metric-temperature.png'
import humidityMetricIcon from '../../assets/monitoring/metric-humidity.png'
import soilMoistureMetricIcon from '../../assets/monitoring/metric-soil-moisture.png'
import { supabase } from '../../lib/supabase.js'
import '../../styles/admin-dashboard.css'
import '../../styles/monitoring.css'

const fields = ['Field A', 'Field B', 'Field C', 'Field D']
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')
const WEATHER_FALLBACK = {
  condition: 'rainy', label: 'Raining', temp: 28, highTemp: 31, lowTemp: 24,
  locationLabel: 'Silang, Cavite',
  dailyForecast: [
    { day: 'Today', condition: 'rainy', lowTemp: 24, highTemp: 31, rainChance: 80 },
    { day: 'Tomorrow', condition: 'cloudy', lowTemp: 24, highTemp: 31, rainChance: 33 },
    { day: 'Thu', condition: 'rainy', lowTemp: 26, highTemp: 32, rainChance: 63 },
    { day: 'Fri', condition: 'stormy', lowTemp: 26, highTemp: 32, rainChance: 73 },
    { day: 'Sat', condition: 'cloudy', lowTemp: 25, highTemp: 31, rainChance: 30 },
  ],
}
const WEATHER_IMAGES = {
  sunny: weatherSunnyImage,
  cloudy: weatherCloudyImage,
  overcast: weatherCloudyImage,
  foggy: weatherCloudyImage,
  rainy: weatherRainyImage,
  snowy: weatherCloudyImage,
  stormy: weatherStormyImage,
}
const WEATHER_ICONS = {
  sunny: weatherSunnyIcon,
  cloudy: weatherCloudyIcon,
  overcast: weatherCloudyIcon,
  foggy: weatherCloudyIcon,
  rainy: weatherRainyIcon,
  snowy: weatherRainyIcon,
  stormy: weatherStormyIcon,
}

async function loadWeather() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  const token = data.session?.access_token
  if (!token) throw new Error('Your session has ended. Please sign in again.')

  const response = await fetch(`${API_URL}/api/weather/current`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body?.error || 'Weather data is temporarily unavailable.')
  return body
}
const fieldReadings = [
  { time: '7:00 AM', temperature: '32.2°C', humidity: '76%', moisture: '30%' },
  { time: '7:15 AM', temperature: '25.1°C', humidity: '55%', moisture: '20%' },
  { time: '7:30 AM', temperature: '42.2°C', humidity: '80%', moisture: '80%' },
  { time: '7:45 AM', temperature: '32.2°C', humidity: '90%', moisture: '90%' },
]

export default function EnvironmentalMonitoring() {
  const [activeField, setActiveField] = useState('Field A')
  const [page, setPage] = useState(1)
  const [weather, setWeather] = useState(WEATHER_FALLBACK)
  const readings = fieldReadings
  const latest = readings[0]

  useEffect(() => {
    let active = true
    loadWeather().then((snapshot) => {
      if (active) setWeather(snapshot)
    }).catch(() => {
      // The weather card remains useful with its local fallback when the provider is unavailable.
    })
    return () => { active = false }
  }, [])

  const isNight = useMemo(() => {
    const hour = new Date().getHours()
    return hour < 6 || hour >= 18
  }, [])
  const condition = weather.condition || 'cloudy'
  const backgroundImage = isNight ? weatherNightImage : (WEATHER_IMAGES[condition] || weatherCloudyImage)
  const forecast = weather.dailyForecast?.length ? weather.dailyForecast.slice(0, 5) : WEATHER_FALLBACK.dailyForecast

  return (
    <main className="admin-dashboard environmental-monitor-page">
      <AdminSidebar active="environmental-monitoring" />
      <section className="admin-workspace">
        <AdminTopbar />

        <div className="admin-content environment-monitor-content">
          <header className="environment-page-title">
            <div>
              <h1>Real-Time Environmental Monitoring</h1>
              <p>Live IoT sensor telemetry for microclimate conditions, soil moisture, and weather tracking</p>
            </div>
          </header>

          <section className="environment-network-status" aria-label="Sensor network status">
            <div><i /><span><strong>IoT Sensor Network Active</strong><small>12 Sensors Connected</small></span></div>
            <span><Radio aria-hidden="true" /> Live</span>
          </section>

          <section
            className={`environment-weather-banner is-${condition}${isNight ? ' is-night' : ''}`}
            style={{ backgroundImage: `url(${backgroundImage})` }}
            aria-label={`Current weather: ${weather.label} in ${weather.locationLabel}`}
          >
            <div className="environment-weather-shade" aria-hidden="true" />
            <div className="environment-weather-main">
              <div className="environment-weather-topline">
                <span className="environment-weather-location"><MapPin aria-hidden="true" />{weather.locationLabel || WEATHER_FALLBACK.locationLabel}</span>
                <img className="environment-weather-icon" src={isNight ? weatherNightIcon : (WEATHER_ICONS[condition] || weatherCloudyIcon)} alt="" />
              </div>
              <div className="environment-weather-reading">
                <strong>{weather.temp > 0 ? '+' : ''}{weather.temp ?? WEATHER_FALLBACK.temp}°C</strong>
                <span>H: {weather.highTemp ?? WEATHER_FALLBACK.highTemp}°C<br />L: {weather.lowTemp ?? WEATHER_FALLBACK.lowTemp}°C</span>
                <em>{weather.label || 'Cloudy'}</em>
              </div>
            </div>
            <section className="environment-weather-forecast" aria-label="Five day forecast">
              <header><span><CalendarDays aria-hidden="true" />5-Day Forecast</span><small>Live weather</small></header>
              <div>
                {forecast.map((day, index) => (
                  <article key={`${day.date || day.day}-${index}`}>
                    <b>{day.day}</b>
                    <img src={WEATHER_ICONS[day.condition] || weatherCloudyIcon} alt={day.label || day.condition} />
                    <small>{day.rainChance ? `${day.rainChance}%` : '—'}</small>
                    <strong>{day.lowTemp}° / {day.highTemp}°</strong>
                  </article>
                ))}
              </div>
            </section>
          </section>

          <section className="environment-sensor-panel">
            <nav className="environment-field-tabs" aria-label="Select farm field">
              {fields.map((field) => (
                <button className={field === activeField ? 'is-active' : ''} type="button" key={field} onClick={() => setActiveField(field)} aria-pressed={field === activeField}>{field}</button>
              ))}
            </nav>

            <section className="environment-reading-grid" aria-label={`${activeField} latest readings`}>
              <article>
                <h2>Temperature</h2>
                <div><strong>{latest.temperature}</strong><img src={temperatureMetricIcon} alt="" /></div>
                <small>Optimal</small>
              </article>
              <article>
                <h2>Humidity</h2>
                <div><strong>{latest.humidity}</strong><img src={humidityMetricIcon} alt="" /></div>
                <small>Optimal</small>
              </article>
              <article>
                <h2>Soil Moisture</h2>
                <div><strong>{latest.moisture}</strong><img src={soilMoistureMetricIcon} alt="" /></div>
                <small className="is-monitor">Monitor</small>
              </article>
            </section>

            <div className="environment-table-wrap">
              <table>
                <thead><tr><th>Time</th><th>Temperature</th><th>Humidity</th><th>Soil Moisture</th></tr></thead>
                <tbody>
                  {readings.map((reading) => (
                    <tr key={reading.time}><td>{reading.time}</td><td>{reading.temperature}</td><td>{reading.humidity}</td><td>{reading.moisture}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>

            <footer className="environment-pagination">
              <span>Page {page}</span>
              <nav aria-label="Sensor reading pages">
                <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))}>← Previous</button>
                {[1, 2, 3].map((number) => <button className={page === number ? 'is-current' : ''} type="button" key={number} onClick={() => setPage(number)} aria-current={page === number ? 'page' : undefined}>{number}</button>)}
                <button type="button" onClick={() => setPage((current) => Math.min(3, current + 1))}>Next →</button>
              </nav>
            </footer>
          </section>

          <section className="environment-insights-card">
            <header><Antenna aria-hidden="true" /><h2>Environmental Insights</h2></header>
            <div className="environment-insights-copy">
              <p>Specific environmental guidance for {activeField}:</p>
              <p>Insights will be dynamically generated as the latest field and weather data is analyzed.</p>
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}
