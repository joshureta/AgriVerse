import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Antenna,
  CheckCircle2,
  CloudRain,
  Droplets,
  ThermometerSun,
  WifiOff,
  CalendarDays,
  MapPin,
  Radio,
  X,
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
import { countConnectedSensors, latestCurrentReading, latestMoistureReading, SENSOR_ONLINE_WINDOW_MS } from '../../lib/sensorStatus.js'
import { loadDailySensorRows, manilaDayBounds, readingsForField } from '../../lib/environmentalData.js'
import '../../styles/admin-dashboard.css'
import '../../styles/monitoring.css'

const fields = ['Field A', 'Field B', 'Field C', 'Field D']
const READINGS_PER_PAGE = 10
const SENSOR_PAIR_WINDOW_MS = 15000
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')
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
      : measuredAt.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' }),
    temperature: reading.temperature_c == null ? '—' : `${Number(reading.temperature_c).toFixed(1)}°C`,
    humidity: reading.humidity_percent == null ? '—' : `${Number(reading.humidity_percent).toFixed(1)}%`,
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
      : measuredAt.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' }),
    temperature: '—',
    humidity: '—',
    moisture: `${Number(reading.moisture_percent).toFixed(1)}%`,
  }
}

function combineSensorReadings(climateReadings, soilReadings) {
  const unusedSoilIds = new Set(soilReadings.map((reading) => reading.id))
  const soilBuckets = new Map()
  soilReadings.forEach((soil) => {
    const bucketKey = `${soil.device_id}:${soil.field_name || ''}:${Math.floor(soil.measuredAt / SENSOR_PAIR_WINDOW_MS)}`
    const bucket = soilBuckets.get(bucketKey) || []
    bucket.push(soil)
    soilBuckets.set(bucketKey, bucket)
  })
  const combined = climateReadings.map((climate) => {
    let nearestSoil = null
    let nearestDifference = Number.POSITIVE_INFINITY

    const centerBucket = Math.floor(climate.measuredAt / SENSOR_PAIR_WINDOW_MS)
    for (let offset = -1; offset <= 1; offset += 1) {
      for (const soil of soilBuckets.get(`${climate.device_id}:${climate.field_name || ''}:${centerBucket + offset}`) || []) {
        if (!unusedSoilIds.has(soil.id)) continue
        const difference = Math.abs(soil.measuredAt - climate.measuredAt)
        if (difference <= SENSOR_PAIR_WINDOW_MS && difference < nearestDifference) {
          nearestSoil = soil
          nearestDifference = difference
        }
      }
    }

    if (!nearestSoil) return climate
    unusedSoilIds.delete(nearestSoil.id)

    const measuredAt = Math.max(climate.measuredAt, nearestSoil.measuredAt)
    return {
      ...climate,
      id: `${climate.id}-${nearestSoil.id}`,
      measuredAt,
      time: new Date(measuredAt).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' }),
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
}

async function loadSensorReadings(bounds) {
  const data = await loadDailySensorRows(sensorSupabase, 'sensor_readings', '*', bounds)
  return data.map(formatSensorReading)
}

async function loadSoilReadings(bounds) {
  const data = await loadDailySensorRows(sensorSupabase, 'soil_readings', '*', bounds)
  return data.map(formatSoilReading)
}

function mergeReadings(current, fresh) {
  const byId = new Map(current.map((reading) => [reading.id, reading]))
  fresh.forEach((reading) => byId.set(reading.id, reading))
  return [...byId.values()].sort((left, right) => right.measuredAt - left.measuredAt)
}

export default function EnvironmentalMonitoring() {
  const [activeField, setActiveField] = useState('Field A')
  const [page, setPage] = useState(1)
  const readingsPerPage = READINGS_PER_PAGE
  const [weather, setWeather] = useState(null)
  const [deviceFields, setDeviceFields] = useState({})
  const [fieldMappingError, setFieldMappingError] = useState('')
  const [readings, setReadings] = useState([])
  const [soilReadings, setSoilReadings] = useState([])
  const [sensorError, setSensorError] = useState('')
  const [soilError, setSoilError] = useState('')
  const [sensorLoading, setSensorLoading] = useState(true)
  const [statusNow, setStatusNow] = useState(() => Date.now())
  const [dismissedAlerts, setDismissedAlerts] = useState([])
  const fieldReadings = useMemo(() => readingsForField(readings, activeField), [readings, activeField])
  const fieldSoilReadings = useMemo(() => readingsForField(soilReadings, activeField), [soilReadings, activeField])
  const currentTemperature = latestCurrentReading(fieldReadings, 'temperature_c', statusNow)
  const currentHumidity = latestCurrentReading(fieldReadings, 'humidity_percent', statusNow)
  const currentSoil = latestMoistureReading(fieldReadings, fieldSoilReadings, statusNow)
  const combinedReadings = useMemo(
    () => combineSensorReadings(fieldReadings, fieldSoilReadings),
    [fieldReadings, fieldSoilReadings],
  )

  const pageCount = Math.max(1, Math.ceil(combinedReadings.length / readingsPerPage))
  const totalReadings = combinedReadings.length
  const startReading = totalReadings === 0 ? 0 : (page - 1) * readingsPerPage + 1
  const endReading = Math.min(page * readingsPerPage, totalReadings)
  const visibleReadings = combinedReadings.slice(
    (page - 1) * readingsPerPage,
    page * readingsPerPage,
  )
  const reportingSensors = [currentTemperature, currentHumidity, currentSoil].filter(Boolean).length
  const connectedDevices = countConnectedSensors([fieldReadings, fieldSoilReadings], statusNow)
  const deviceIsLive = connectedDevices > 0
  const fieldAssigned = Object.values(deviceFields).includes(activeField)
  const sensorHasError = !sensorSupabase || Boolean(sensorError && soilError)
  const sensorStatusTitle = sensorLoading
    ? 'Checking Device'
    : deviceIsLive ? 'Device Active'
      : fieldMappingError ? 'Field Setup Unavailable'
        : !fieldAssigned ? 'No Device Assigned'
          : sensorHasError ? 'Device Status Unavailable' : 'Sensor Offline'
  const sensorStatusBadge = sensorLoading ? 'Checking' : deviceIsLive ? reportingSensors === 3 ? 'Live' : 'Sensor Alert' : fieldMappingError || sensorHasError ? 'Unavailable' : !fieldAssigned ? 'Unassigned' : 'Offline'
  const SensorStatusIcon = deviceIsLive ? Radio : sensorLoading ? Antenna : WifiOff
  const soilStatus = !currentSoil
    ? 'Offline'
    : currentSoil.moisture_percent < 30
      ? 'Dry'
      : currentSoil.moisture_percent < 70
        ? 'Moist'
        : 'Wet'

  const activeAlerts = useMemo(() => {
    const list = []

    if (!sensorLoading && fieldAssigned) {
      for (const [id, name, reading, error] of [
        ['soil-temperature-offline', 'Soil Temperature', currentTemperature, sensorError],
        ['humidity-offline', 'Humidity', currentHumidity, sensorError],
        ['soil-moisture-offline', 'Soil Moisture', currentSoil, soilError],
      ]) {
        if (!reading) list.push({
          id,
          type: 'danger',
          icon: WifiOff,
          title: `${name} Sensor Offline`,
          message: error || `No valid ${name.toLowerCase()} reading received in the last 2 minutes. Check the sensor and device connection.`,
          timestamp: 'Live status',
        })
      }
    }

    if (currentSoil) {
      const moistureVal = currentSoil.soil_moisture ?? currentSoil.moisture_percent
      if (moistureVal != null && moistureVal < 25) {
        list.push({
          id: 'low-moisture',
          type: 'danger',
          icon: Droplets,
          title: `Low Soil Moisture Alert (${activeField})`,
          message: `Soil moisture dropped to ${currentSoil.moisture}. Soil is dry—irrigation recommended immediately to prevent drought stress.`,
          timestamp: 'Live reading',
        })
      }
    }

    if (currentTemperature) {
      const tempC = Number(currentTemperature.temperature_c)
      if (tempC >= 33) {
        list.push({
          id: 'heat-stress',
          type: 'warning',
          icon: ThermometerSun,
          title: `Crop Heat Stress Warning (${activeField})`,
          message: `High soil temperature (${currentTemperature.temperature}) detected. Transpiration stress risk—ensure adequate shade and hydration.`,
          timestamp: 'Live reading',
        })
      }
    }

    if (currentHumidity && currentTemperature) {
      const humidity = Number(currentHumidity.humidity_percent)
      const tempC = Number(currentTemperature.temperature_c)
      if (humidity >= 80 && tempC >= 24) {
        list.push({
          id: 'fungal-risk',
          type: 'warning',
          icon: AlertTriangle,
          title: `Fungal Pathogen Risk Warning`,
          message: `Elevated relative humidity (${currentHumidity.humidity}) at ${currentTemperature.temperature} creates favorable conditions for fungal leaf spot.`,
          timestamp: 'Live reading',
        })
      }
    }

    const rainChance = weather?.dailyForecast?.[0]?.rainChance || 0
    if (weather && (weather.condition === 'rainy' || weather.condition === 'stormy' || rainChance >= 60)) {
      list.push({
        id: 'rain-spray',
        type: 'info',
        icon: CloudRain,
        title: 'Rainfall & Spraying Window Alert',
        message: `High rainfall probability today (${rainChance}% chance). Delay chemical fertilizer or pesticide spraying to avoid chemical runoff.`,
        timestamp: 'Forecast update',
      })
    }

    if (!list.length && reportingSensors === 3) {
      list.push({
        id: 'all-optimal',
        type: 'success',
        icon: CheckCircle2,
        title: `Optimal Microclimate Status (${activeField})`,
        message: `All environmental conditions (temperature, humidity, and soil moisture) are within optimal agricultural bounds.`,
        timestamp: 'Live monitoring',
      })
    }

    return list
  }, [sensorError, soilError, sensorLoading, currentTemperature, currentHumidity, currentSoil, reportingSensors, weather, activeField, fieldAssigned])

  const visibleAlerts = useMemo(
    () => activeAlerts.filter((alert) => !dismissedAlerts.includes(alert.id)),
    [activeAlerts, dismissedAlerts],
  )

  useEffect(() => {
    const recovered = new Set([
      currentTemperature && 'soil-temperature-offline',
      currentHumidity && 'humidity-offline',
      currentSoil && 'soil-moisture-offline',
    ].filter(Boolean))
    if (recovered.size) {
      setDismissedAlerts((current) => current.some((id) => recovered.has(id))
        ? current.filter((id) => !recovered.has(id))
        : current)
    }
  }, [currentTemperature, currentHumidity, currentSoil])

  useEffect(() => {
    let active = true
    loadWeather().then((snapshot) => {
      if (active) setWeather(snapshot)
    }).catch(() => {
      if (active) setWeather(null)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!sensorSupabase) {
      setSensorError('Sensor monitoring is not configured. Add VITE_SENSOR_SUPABASE_URL and VITE_SENSOR_SUPABASE_PUBLISHABLE_KEY to web/.env.local.')
      setSensorLoading(false)
      return
    }

    let active = true
    let currentDay = manilaDayBounds()

    const refreshDeviceFields = async () => {
      try {
        const { data, error } = await sensorSupabase.from('sensor_device_fields').select('device_id, field_name')
        if (!active) return
        if (error) throw error
        setDeviceFields(Object.fromEntries((data || []).map(({ device_id, field_name }) => [device_id, field_name])))
        setFieldMappingError('')
      } catch {
        if (active) setFieldMappingError('Field assignments are unavailable. Apply the sensor device fields migration in the sensor database.')
      }
    }

    const refreshReadings = async () => {
      const bounds = manilaDayBounds()
      if (bounds.day !== currentDay.day) {
        setReadings([])
        setSoilReadings([])
        setPage(1)
        setSensorLoading(true)
      }
      currentDay = bounds
      // Either sensor type can be online independently; a missing soil table
      // must not hide DHT22 readings.
      const [climateResult, soilResult] = await Promise.allSettled([
        loadSensorReadings(bounds),
        loadSoilReadings(bounds),
      ])
      if (!active) return
      if (manilaDayBounds().day !== bounds.day) return

      if (climateResult.status === 'fulfilled') {
        setReadings((current) => mergeReadings(current, climateResult.value))
        setSensorError('')
      } else {
        setSensorError(climateResult.reason?.message || 'Unable to load sensor readings.')
      }

      if (soilResult.status === 'fulfilled') {
        setSoilReadings((current) => mergeReadings(current, soilResult.value))
        setSoilError('')
      } else {
        setSoilError(soilResult.reason?.message || 'Unable to load soil readings.')
      }

      setStatusNow(Date.now())
      setSensorLoading(false)
    }

    const refreshRecentReadings = async () => {
      const bounds = manilaDayBounds()
      if (bounds.day !== currentDay.day) {
        refreshReadings()
        return
      }
      const recentBounds = { ...bounds, start: Math.max(bounds.start, Date.now() - SENSOR_ONLINE_WINDOW_MS) }
      const [climateResult, soilResult] = await Promise.allSettled([
        loadSensorReadings(recentBounds),
        loadSoilReadings(recentBounds),
      ])
      if (!active || manilaDayBounds().day !== bounds.day) return
      if (climateResult.status === 'fulfilled') {
        setReadings((current) => mergeReadings(current, climateResult.value))
        setSensorError('')
      } else {
        setSensorError(climateResult.reason?.message || 'Unable to load sensor readings.')
      }
      if (soilResult.status === 'fulfilled') {
        setSoilReadings((current) => mergeReadings(current, soilResult.value))
        setSoilError('')
      } else {
        setSoilError(soilResult.reason?.message || 'Unable to load soil readings.')
      }
      setStatusNow(Date.now())
    }

    refreshDeviceFields()
    refreshReadings()
    const statusTimer = window.setInterval(() => {
      setStatusNow(Date.now())
      refreshRecentReadings()
    }, 30000)
    const historyTimer = window.setInterval(() => {
      refreshReadings()
      refreshDeviceFields()
    }, 5 * 60 * 1000)
    const climateChannel = sensorSupabase
      .channel('environmental-sensor-readings')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sensor_readings' },
        ({ new: reading }) => {
          if (!active) return
          const measuredAt = Date.parse(reading.created_at)
          if (measuredAt < currentDay.start || measuredAt >= currentDay.end) return
          setReadings((current) => [
            formatSensorReading(reading),
            ...current.filter((item) => item.id !== `climate-${reading.id}`),
          ])
          setSensorError('')
          setSensorLoading(false)
          setStatusNow(Date.now())
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
          const measuredAt = Date.parse(reading.created_at)
          if (measuredAt < currentDay.start || measuredAt >= currentDay.end) return
          setSoilReadings((current) => [
            formatSoilReading(reading),
            ...current.filter((item) => item.id !== `soil-${reading.id}`),
          ])
          setSoilError('')
          setSensorLoading(false)
          setStatusNow(Date.now())
          setPage(1)
        },
      )
      .subscribe()

    return () => {
      active = false
      window.clearInterval(statusTimer)
      window.clearInterval(historyTimer)
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
  const condition = weather?.condition || 'cloudy'
  const backgroundImage = isNight ? weatherNightImage : (WEATHER_IMAGES[condition] || weatherCloudyImage)
  const forecast = weather?.dailyForecast?.slice(0, 5) || []

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

          <section className={`environment-network-status${sensorLoading ? ' is-checking' : !deviceIsLive ? ' is-offline' : reportingSensors < 3 ? ' is-partial' : ''}`} aria-label="Device status">
            <div><i aria-hidden="true" /><span><strong>{sensorStatusTitle}</strong><small>{sensorLoading ? 'Checking for recent readings…' : deviceIsLive ? `${connectedDevices} ${connectedDevices === 1 ? 'device' : 'devices'} connected` : fieldMappingError ? 'Field assignments could not be loaded' : !fieldAssigned ? `No device assigned to ${activeField}` : 'No recent sensor readings'}</small></span></div>
            <span><SensorStatusIcon aria-hidden="true" /> {sensorStatusBadge}</span>
          </section>

          {visibleAlerts.length > 0 && (
            <div className="environment-alerts-list" aria-label="Live environmental alerts">
              {visibleAlerts.map((alert) => {
                const IconComponent = alert.icon
                return (
                  <article className={`environment-alert-item is-${alert.type}`} key={alert.id}>
                    <div className="environment-alert-icon">
                      <IconComponent aria-hidden="true" />
                    </div>
                    <div className="environment-alert-content">
                      <strong>{alert.title}:</strong> {alert.message}
                    </div>
                    <button
                      type="button"
                      className="environment-alert-dismiss"
                      aria-label="Dismiss notification"
                      title="Dismiss notification"
                      onClick={() => setDismissedAlerts((prev) => [...prev, alert.id])}
                    >
                      <X aria-hidden="true" />
                    </button>
                  </article>
                )
              })}
            </div>
          )}

          <section
            className={`environment-weather-banner is-${condition}${isNight ? ' is-night' : ''}`}
            style={{ backgroundImage: `url(${backgroundImage})` }}
            aria-label={weather ? `Current weather: ${weather.label} in ${weather.locationLabel}` : 'Current weather unavailable'}
          >
            <div className="environment-weather-shade" aria-hidden="true" />
            <div className="environment-weather-main">
              <div className="environment-weather-topline">
                <span className="environment-weather-location"><MapPin aria-hidden="true" />{weather?.locationLabel || 'Weather unavailable'}</span>
                <img className="environment-weather-icon" src={isNight ? weatherNightIcon : (WEATHER_ICONS[condition] || weatherCloudyIcon)} alt="" />
              </div>
              <div className="environment-weather-reading">
                <strong>{weather?.temp == null ? '—' : `${weather.temp > 0 ? '+' : ''}${weather.temp}°C`}</strong>
                <span>H: {weather?.highTemp == null ? '—' : `${weather.highTemp}°C`}<br />L: {weather?.lowTemp == null ? '—' : `${weather.lowTemp}°C`}</span>
                <em>{weather?.label || 'No live weather'}</em>
              </div>
            </div>
            <section className="environment-weather-forecast" aria-label="Five day forecast">
              <header><span><CalendarDays aria-hidden="true" />5-Day Forecast</span><small>{weather ? 'Live weather' : 'Unavailable'}</small></header>
              <div>
                {!forecast.length && <p className="environment-forecast-empty">Weather data is temporarily unavailable.</p>}
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
                <button className={field === activeField ? 'is-active' : ''} type="button" key={field} onClick={() => { setActiveField(field); setPage(1); setDismissedAlerts([]) }} aria-pressed={field === activeField}>{field}</button>
              ))}
            </nav>
            {fieldMappingError && <p className="environment-field-message" role="status">{fieldMappingError}</p>}
            {!fieldMappingError && !fieldAssigned && (
              <p className="environment-field-message" role="status">No sensor device is assigned to {activeField}. Assign its device ID in the sensor database to show field readings.</p>
            )}

            <section className="environment-reading-grid" aria-label={`${activeField} latest readings`}>
              <article className={!sensorLoading && !currentTemperature ? 'is-disconnected' : ''}>
                <h2>Soil Temperature</h2>
                <div><strong>{currentTemperature?.temperature || '—'}</strong><img src={temperatureMetricIcon} alt="" /></div>
                <small>{sensorLoading ? 'Checking sensor' : currentTemperature ? 'Reporting · live reading' : 'Sensor Offline'}</small>
              </article>
              <article className={!sensorLoading && !currentHumidity ? 'is-disconnected' : ''}>
                <h2>Humidity</h2>
                <div><strong>{currentHumidity?.humidity || '—'}</strong><img src={humidityMetricIcon} alt="" /></div>
                <small>{sensorLoading ? 'Checking sensor' : currentHumidity ? 'Reporting · live reading' : 'Sensor Offline'}</small>
              </article>
              <article className={!sensorLoading && !currentSoil ? 'is-disconnected' : ''}>
                <h2>Soil Moisture</h2>
                <div><strong>{currentSoil?.moisture || '—'}</strong><img src={soilMoistureMetricIcon} alt="" /></div>
                <small className={soilStatus === 'Dry' ? 'is-monitor' : ''} title={!currentSoil ? soilError || undefined : undefined}>{sensorLoading ? 'Checking sensor' : currentSoil ? `Reporting · ${soilStatus}` : 'Sensor Offline'}</small>
              </article>
            </section>

            <div className="environment-table-wrap">
              <table>
                <thead><tr><th>Time</th><th>Soil Temperature</th><th>Humidity</th><th>Soil Moisture</th></tr></thead>
                <tbody>
                  {visibleReadings.map((reading) => (
                    <tr key={reading.id}>
                      <td><strong>{reading.time}</strong></td>
                      <td><span className="environment-cell-value">{reading.temperature}</span></td>
                      <td><span className="environment-cell-value">{reading.humidity}</span></td>
                      <td>
                        <div className="environment-moisture-cell">
                          <span>{reading.moisture}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!visibleReadings.length && (
                    <tr><td colSpan="4">{sensorError || `No readings received for ${activeField} today.`}</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalReadings > 0 && (
              <footer className="environment-pagination">
                <span>Today (Manila time) · Showing {startReading}–{endReading} of {totalReadings} readings</span>
                <nav aria-label="Sensor reading pages" className="environment-pagination-right">
                  <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>‹</button>
                  <span className="environment-page-indicator">{page} / {pageCount}</span>
                  <button type="button" aria-label="Next page" disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>›</button>
                </nav>
              </footer>
            )}
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
