import { useState } from 'react'
import {
  Antenna,
  CloudRain,
  Droplets,
  Radio,
  Sprout,
  Thermometer,
} from 'lucide-react'
import { AdminSidebar, AdminTopbar } from '../../components/AdminNavigation.jsx'
import pineappleFieldImage from '../../assets/buyer/pineapple-farm-story.png'
import '../../styles/admin-dashboard.css'
import '../../styles/monitoring.css'

const fields = ['Field A', 'Field B', 'Field C', 'Field D']
const sensorReadings = {
  'Sensor 1': [
    { time: '7:00 AM', temperature: '32.2°C', humidity: '76%', moisture: '30%' },
    { time: '7:15 AM', temperature: '25.1°C', humidity: '55%', moisture: '20%' },
    { time: '7:30 AM', temperature: '42.2°C', humidity: '80%', moisture: '80%' },
    { time: '7:45 AM', temperature: '32.2°C', humidity: '90%', moisture: '90%' },
  ],
  'Sensor 2': [
    { time: '7:00 AM', temperature: '29.8°C', humidity: '72%', moisture: '42%' },
    { time: '7:15 AM', temperature: '30.1°C', humidity: '74%', moisture: '40%' },
    { time: '7:30 AM', temperature: '31.5°C', humidity: '78%', moisture: '38%' },
    { time: '7:45 AM', temperature: '32.0°C', humidity: '76%', moisture: '35%' },
  ],
}

export default function EnvironmentalMonitoring() {
  const [activeField, setActiveField] = useState('Field A')
  const [activeSensor, setActiveSensor] = useState('Sensor 1')
  const [page, setPage] = useState(1)
  const readings = sensorReadings[activeSensor]
  const latest = readings[0]

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
            className="environment-weather-banner"
            style={{ backgroundImage: `linear-gradient(rgba(74,91,78,.43),rgba(74,91,78,.43)), url(${pineappleFieldImage})` }}
            aria-label="Current weather: raining in Silang, Cavite"
          >
            <div className="environment-rain" aria-hidden="true" />
            <strong>Raining</strong>
            <span>Silang, Cavite, Philippines</span>
          </section>

          <section className="environment-sensor-panel">
            <nav className="environment-field-tabs" aria-label="Select farm field">
              {fields.map((field) => (
                <button className={field === activeField ? 'is-active' : ''} type="button" key={field} onClick={() => setActiveField(field)} aria-pressed={field === activeField}>{field}</button>
              ))}
            </nav>

            <nav className="environment-device-tabs" aria-label="Select sensor">
              {Object.keys(sensorReadings).map((sensor) => (
                <button className={sensor === activeSensor ? 'is-active' : ''} type="button" key={sensor} onClick={() => setActiveSensor(sensor)} aria-pressed={sensor === activeSensor}>{sensor}</button>
              ))}
            </nav>

            <section className="environment-reading-grid" aria-label={`${activeField} ${activeSensor} latest readings`}>
              <article>
                <h2>Temperature</h2>
                <div><Thermometer className="is-temperature" aria-hidden="true" /><strong>{latest.temperature}</strong></div>
                <small>Optimal</small>
              </article>
              <article>
                <h2>Humidity</h2>
                <div><Droplets className="is-humidity" aria-hidden="true" /><strong>{latest.humidity}</strong></div>
                <small>Optimal</small>
              </article>
              <article>
                <h2>Soil Moisture</h2>
                <div><Sprout className="is-moisture" aria-hidden="true" /><strong>{latest.moisture}</strong></div>
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
            <ul>
              <li>Temperature optimal</li>
              <li>Soil slightly dry</li>
              <li>Rainfall may cause root rot</li>
            </ul>
          </section>
        </div>
      </section>
    </main>
  )
}
