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
import { sensorSupabase } from '../../lib/sensorSupabase.js'
import '../../styles/admin-dashboard.css'
import '../../styles/monitoring.css'

const fields = ['Field A', 'Field B', 'Field C', 'Field D']
const READINGS_PER_PAGE = 4
const MAX_READING_HISTORY = 100
const SENSOR_PAIR_WINDOW_MS = 15000
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

function formatSensorReading(reading) {
  const measuredAt = new Date(reading.created_at)
  return {
    ...reading,
    id: `climate-${reading.id}`,
    measuredAt: measuredAt.getTime(),
    time: Number.isNaN(measuredAt.getTime())
      ? 'Unknown'
      : measuredAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    temperature: `${Number(reading.temperature_c).toFixed(1)}°C`,
    humidity: `${Number(reading.humidity_percent).toFixed(1)}%`,
    moisture: reading.soil_moisture == null
      ? '—'
      : `${Number(reading.soil_moisture).toFixed(1)}%`,
  }
}

function formatSoilReading(reading) {
  const measuredAt = new Date(reading.created_at)
  return {
    ...reading,
    id: `soil-${reading.id}`,
    measuredAt: measuredAt.getTime(),
    time: Number.isNaN(measuredAt.getTime())
      ? 'Unknown'
      : measuredAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    temperature: '—',
    humidity: '—',
    moisture: `${Number(reading.moisture_percent).toFixed(1)}%`,
  }
}

function combineSensorReadings(climateReadings, soilReadings) {
  const unusedSoilIds = new Set(soilReadings.map((reading) => reading.id))
  const combined = climateReadings.map((climate) => {
    let nearestSoil = null
    let nearestDifference = Number.POSITIVE_INFINITY

    soilReadings.forEach((soil) => {
      if (!unusedSoilIds.has(soil.id) || soil.device_id !== climate.device_id) return
      const difference = Math.abs(soil.measuredAt - climate.measuredAt)
      if (difference <= SENSOR_PAIR_WINDOW_MS && difference < nearestDifference) {
        nearestSoil = soil
        nearestDifference = difference
      }
    })

    if (!nearestSoil) return climate
    unusedSoilIds.delete(nearestSoil.id)

    const measuredAt = Math.max(climate.measuredAt, nearestSoil.measuredAt)
    return {
      ...climate,
      id: `${climate.id}-${nearestSoil.id}`,
      measuredAt,
      time: new Date(measuredAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      moisture: nearestSoil.moisture,
      moisture_percent: nearestSoil.moisture_percent,
      moisture_raw: nearestSoil.moisture_raw,
    }
  })

  soilReadings.forEach((soil) => {
    if (unusedSoilIds.has(soil.id)) combined.push(soil)
  })

  return combined
    .sort((left, right) => (right.measuredAt || 0) - (left.measuredAt || 0))
    .slice(0, MAX_READING_HISTORY)
}

async function loadSensorReadings() {
  const { data, error } = await sensorSupabase
    .from('sensor_readings')
    .select('id, device_id, temperature_c, humidity_percent, soil_moisture, created_at')
    .order('created_at', { ascending: false })
    .limit(MAX_READING_HISTORY)

  if (error) throw error
  return (data || []).map(formatSensorReading)
}

async function loadSoilReadings() {
  const { data, error } = await sensorSupabase
    .from('soil_readings')
    .select('id, device_id, moisture_raw, moisture_percent, created_at')
    .order('created_at', { ascending: false })
    .limit(MAX_READING_HISTORY)

  if (error) throw error
  return (data || []).map(formatSoilReading)
}

export default function EnvironmentalMonitoring() {
  const [activeField, setActiveField] = useState('Field A')
  const [page, setPage] = useState(1)
  const [weather, setWeather] = useState(WEATHER_FALLBACK)
  const [readings, setReadings] = useState([])
  const [soilReadings, setSoilReadings] = useState([])
  const [sensorError, setSensorError] = useState('')
  const [soilError, setSoilError] = useState('')
  const latest = readings[0]
  const latestSoil = readings.find((reading) => reading.soil_moisture != null) || soilReadings[0]
  const combinedReadings = useMemo(
    () => combineSensorReadings(readings, soilReadings),
    [readings, soilReadings],
  )

  const pageCount = Math.max(1, Math.ceil(combinedReadings.length / READINGS_PER_PAGE))
  const visibleReadings = combinedReadings.slice(
    (page - 1) * READINGS_PER_PAGE,
    page * READINGS_PER_PAGE,
  )
  const connectedSensors = new Set(combinedReadings.map((reading) => reading.device_id)).size
  const soilStatus = !latestSoil
    ? 'Waiting for sensor'
    : (latestSoil.soil_moisture ?? latestSoil.moisture_percent) < 30
      ? 'Dry'
      : (latestSoil.soil_moisture ?? latestSoil.moisture_percent) < 70
        ? 'Moist'
        : 'Wet'

  useEffect(() => {
    let active = true
    loadWeather().then((snapshot) => {
      if (active) setWeather(snapshot)
    }).catch(() => {
      // The weather card remains useful with its local fallback when the provider is unavailable.
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!sensorSupabase) {
      setSensorError('Sensor monitoring is not configured. Add VITE_SENSOR_SUPABASE_URL and VITE_SENSOR_SUPABASE_PUBLISHABLE_KEY to web/.env.local.')
      return
    }

    let active = true

    const refreshReadings = () => {
      loadSensorReadings().then((nextReadings) => {
        if (!active) return
        setReadings(nextReadings)
        setSensorError('')
      }).catch((error) => {
        if (!active) return
        setSensorError(error.message || 'Unable to load sensor readings.')
      })

      // The DHT22 has no soil probe. A missing soil table must not hide its readings.
      loadSoilReadings().then((nextSoilReadings) => {
        if (!active) return
        setSoilReadings(nextSoilReadings)
        setSoilError('')
      }).catch((error) => {
        if (!active) return
        setSoilError(error.message || 'Unable to load soil readings.')
      })
    }

    refreshReadings()
    const refreshTimer = window.setInterval(refreshReadings, 30000)
    const climateChannel = sensorSupabase
      .channel('environmental-sensor-readings')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sensor_readings' },
        ({ new: reading }) => {
          if (!active) return
          setReadings((current) => [
            formatSensorReading(reading),
            ...current.filter((item) => item.id !== `climate-${reading.id}`),
          ].slice(0, MAX_READING_HISTORY))
          setSensorError('')
          setPage(1)
        },
      )
      .subscribe()
    const soilChannel = sensorSupabase
      .channel('environmental-soil-readings')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'soil_readings' },
        ({ new: reading }) => {
          if (!active) return
          setSoilReadings((current) => [
            formatSoilReading(reading),
            ...current.filter((item) => item.id !== `soil-${reading.id}`),
          ].slice(0, MAX_READING_HISTORY))
          setSensorError('')
          setPage(1)
        },
      )
      .subscribe()

    return () => {
      active = false
      window.clearInterval(refreshTimer)
      sensorSupabase.removeChannel(climateChannel)
      sensorSupabase.removeChannel(soilChannel)
    }
  }, [])

  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])

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
            <div><i /><span><strong>{sensorError ? 'Sensor Network Unavailable' : 'IoT Sensor Network Active'}</strong><small>{connectedSensors} Sensor{connectedSensors === 1 ? '' : 's'} Connected</small></span></div>
            <span><Radio aria-hidden="true" /> {combinedReadings.length ? 'Live' : 'Waiting for data'}</span>
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
                <div><strong>{latest?.temperature || '—'}</strong><img src={temperatureMetricIcon} alt="" /></div>
                <small>{latest ? 'Latest reading' : 'Waiting for sensor'}</small>
              </article>
              <article>
                <h2>Humidity</h2>
                <div><strong>{latest?.humidity || '—'}</strong><img src={humidityMetricIcon} alt="" /></div>
                <small>{latest ? 'Latest reading' : 'Waiting for sensor'}</small>
              </article>
              <article>
                <h2>Soil Moisture</h2>
                <div><strong>{latestSoil?.moisture || '—'}</strong><img src={soilMoistureMetricIcon} alt="" /></div>
                <small className={soilStatus === 'Dry' ? 'is-monitor' : ''} title={!latestSoil ? soilError || undefined : undefined}>{latestSoil ? soilStatus : soilError ? 'Soil sensor unavailable' : soilStatus}</small>
              </article>
            </section>

            <div className="environment-table-wrap">
              <table>
                <thead><tr><th>Time</th><th>Temperature</th><th>Humidity</th><th>Soil Moisture</th></tr></thead>
                <tbody>
                  {visibleReadings.map((reading) => (
                    <tr key={reading.id}><td>{reading.time}</td><td>{reading.temperature}</td><td>{reading.humidity}</td><td>{reading.moisture}</td></tr>
                  ))}
                  {!visibleReadings.length && (
                    <tr><td colSpan="4">{sensorError || 'Waiting for the first ESP32 reading…'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <footer className="environment-pagination">
              <span>Page {page}</span>
              <nav aria-label="Sensor reading pages">
                <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))}>← Previous</button>
                {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => <button className={page === number ? 'is-current' : ''} type="button" key={number} onClick={() => setPage(number)} aria-current={page === number ? 'page' : undefined}>{number}</button>)}
                <button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next →</button>
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
