import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { fetchSensorRows } from '../services/sensors.js'
import { latestCurrentReading, latestMoistureReading } from '../lib/sensorStatus.js'

const REFRESH_MS = 10000

function mergeLatestReadings(current, incoming) {
  const byId = new Map(current.map((reading) => [reading.id, reading]))
  incoming.forEach((reading) => byId.set(reading.id, reading))
  return [...byId.values()]
    .sort((left, right) => right.measuredAt - left.measuredAt)
    .slice(0, 20)
}

function withMeasuredAt(reading) {
  return { ...reading, measuredAt: Date.parse(reading.created_at) }
}

function relativeReadingTime(value, now) {
  if (!value) return 'No recent readings'
  const minutes = Math.max(0, Math.floor((now - value) / 60000))
  if (minutes < 1) return 'Updated just now'
  if (minutes < 60) return `Updated ${minutes} min ago`
  return `Last reading ${new Date(value).toLocaleString()}`
}

function metricValue(reading, field, unit) {
  return reading ? `${Number(reading[field]).toFixed(1)}${unit}` : '—'
}

export default function FieldConditions() {
  const [climateReadings, setClimateReadings] = useState([])
  const [soilReadings, setSoilReadings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let active = true

    async function refresh() {
      const results = await Promise.allSettled([
        fetchSensorRows('sensor_readings', { limit: 20 }),
        fetchSensorRows('soil_readings', { limit: 20 }),
      ])
      if (!active) return

      const [climate, soil] = results
      if (climate.status === 'fulfilled') {
        setClimateReadings((current) => mergeLatestReadings(current, climate.value.map(withMeasuredAt)))
      }
      if (soil.status === 'fulfilled') {
        setSoilReadings((current) => mergeLatestReadings(current, soil.value.map(withMeasuredAt)))
      }
      setError(climate.status === 'rejected' || soil.status === 'rejected' ? 'Some sensor readings could not be loaded.' : '')
      setNow(Date.now())
      setLoading(false)
    }

    refresh()
    const interval = window.setInterval(refresh, REFRESH_MS)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [])

  const temperature = latestCurrentReading(climateReadings, 'temperature_c', now)
  const soilTemperature = latestCurrentReading(climateReadings, 'soil_temperature_c', now)
  const humidity = latestCurrentReading(climateReadings, 'humidity_percent', now)
  const moisture = latestMoistureReading(climateReadings, soilReadings, now)
  const activeCount = [temperature, soilTemperature, humidity, moisture].filter(Boolean).length
  const lastReadingAt = Math.max(0, ...climateReadings.map((reading) => reading.measuredAt || 0), ...soilReadings.map((reading) => reading.measuredAt || 0))
  const lowMoisture = moisture && Number(moisture.moisture_percent) < 25
  const highTemperature = temperature && Number(temperature.temperature_c) >= 33
  const fungalRisk = temperature && humidity && Number(temperature.temperature_c) >= 24 && Number(humidity.humidity_percent) >= 80
  const alert = loading ? 'Checking sensor readings…'
      : activeCount < 4 ? (error || 'Some sensors are offline. Check the device connection.')
        : lowMoisture ? 'Low soil moisture — check irrigation.'
          : highTemperature ? 'High air temperature — check crop hydration.'
            : fungalRisk ? 'High humidity may increase fungal risk.'
              : 'No active threshold alerts.'
  const status = !loading && activeCount === 0 ? 'Offline'
    : loading ? 'Checking' : activeCount < 4 || lowMoisture || highTemperature || fungalRisk ? 'Needs attention' : 'Normal'
  const StatusIcon = status === 'Normal' ? CheckCircle2 : AlertTriangle

  return (
    <section className="admin-panel field-conditions-panel" aria-label="Field conditions">
      <div className="field-conditions-header">
        <div>
          <h2>Field Conditions</h2>
          <p>Farm sensors · {relativeReadingTime(lastReadingAt, now)}</p>
        </div>
        <span className={`field-conditions-status is-${status.toLowerCase().replace(' ', '-')}`}>{status}</span>
      </div>
      <div className="field-conditions-metrics">
        <div className="field-conditions-metric">
          <span>Air temperature</span>
          <strong>{metricValue(temperature, 'temperature_c', '°C')}</strong>
        </div>
        <div className="field-conditions-metric">
          <span>Humidity</span>
          <strong>{metricValue(humidity, 'humidity_percent', '%')}</strong>
        </div>
        <div className="field-conditions-metric">
          <span>Soil temperature</span>
          <strong>{metricValue(soilTemperature, 'soil_temperature_c', '°C')}</strong>
        </div>
        <div className={`field-conditions-metric${lowMoisture ? ' is-warning' : ''}`}>
          <span>Soil moisture</span>
          <strong>{metricValue(moisture, 'moisture_percent', '%')}</strong>
        </div>
      </div>
      <div className="field-conditions-footer">
        <p className={status === 'Normal' ? 'is-normal' : 'is-alert'}>
          <StatusIcon aria-hidden="true" />{alert}
        </p>
        <a href="/admin/monitoring/environmental">Open monitoring</a>
      </div>
    </section>
  )
}
