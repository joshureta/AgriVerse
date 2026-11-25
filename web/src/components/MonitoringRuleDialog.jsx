import { useState } from 'react'

const READINGS = {
  soil_moisture: { label: 'Soil moisture', unit: '%', min: 0, max: 100 },
  humidity_percent: { label: 'Humidity', unit: '%', min: 0, max: 100 },
  temperature_c: { label: 'Air temperature', unit: '°C', min: -10, max: 60 },
  soil_temperature_c: { label: 'Soil temperature', unit: '°C', min: -10, max: 70 },
}
const PRIORITIES = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' }

function part(reading, comparison, threshold) {
  const info = READINGS[reading] || { label: reading, unit: '' }
  return `${info.label} ${comparison} ${Number(threshold)}${info.unit}`
}

// "Soil moisture below 35%" (plus the second condition when the rule has one).
export function ruleCondition(rule) {
  const first = part(rule.reading, rule.comparison, rule.threshold)
  return rule.also_reading ? `${first} and ${part(rule.also_reading, rule.also_comparison, rule.also_threshold).toLowerCase()}` : first
}

// "Field A · Irrigation · High priority"
export function ruleTask(rule) {
  return `${rule.field_name || 'All fields'} · ${rule.category_name} · ${PRIORITIES[rule.priority_code] || rule.priority_code} priority`
}

function ThresholdInput({ reading, comparison, value, onChange, label }) {
  const info = READINGS[reading] || { label: reading, unit: '', min: -1000, max: 1000 }
  return (
    <label>{label || `${info.label} ${comparison}`}
      <span className="monitoring-rule-threshold">
        <input type="number" inputMode="decimal" step="0.1" min={info.min} max={info.max} required value={value} onChange={(event) => onChange(event.target.value)} />
        <span>{info.unit}</span>
      </span>
    </label>
  )
}

function valid(reading, value) {
  const info = READINGS[reading] || { min: -1000, max: 1000 }
  const number = Number(value)
  return value !== '' && Number.isFinite(number) && number >= info.min && number <= info.max
}

// Lets an admin change the threshold(s) of one monitoring rule.
export default function MonitoringRuleDialog({ rule, onCancel, onSave }) {
  const [threshold, setThreshold] = useState(String(Number(rule.threshold)))
  const [alsoThreshold, setAlsoThreshold] = useState(rule.also_reading ? String(Number(rule.also_threshold)) : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const ok = valid(rule.reading, threshold) && (!rule.also_reading || valid(rule.also_reading, alsoThreshold))

  async function submit(event) {
    event.preventDefault()
    if (!ok) { setError('Enter a threshold within the allowed range.'); return }
    setSaving(true); setError('')
    try {
      await onSave({ threshold: Number(threshold), ...(rule.also_reading ? { also_threshold: Number(alsoThreshold) } : {}) })
    } catch (saveError) {
      setError(saveError.message)
      setSaving(false)
    }
  }

  return (
    <div className="settings-modal-backdrop">
      <form className="settings-modal monitoring-rule-modal" onSubmit={submit}>
        <div>
          <h2>Edit rule</h2>
          <p className="sensor-interval-device">{rule.rule_name} · {ruleTask(rule)}</p>
        </div>
        <p className="monitoring-rule-hint">A task is created when the 3 latest readings from a field's sensor, all from the last 10 minutes, meet this condition.</p>
        <ThresholdInput reading={rule.reading} comparison={rule.comparison} value={threshold} onChange={(value) => { setThreshold(value); setError('') }} />
        {rule.also_reading && <ThresholdInput reading={rule.also_reading} comparison={rule.also_comparison} value={alsoThreshold} onChange={(value) => { setAlsoThreshold(value); setError('') }} label={`And ${READINGS[rule.also_reading]?.label.toLowerCase() || rule.also_reading} ${rule.also_comparison}`} />}
        <div className="sensor-interval-preview">
          <strong>{ok ? ruleCondition({ ...rule, threshold, also_threshold: alsoThreshold }) : '—'}</strong>
          <span>Applies to new readings from now on. Tasks already created stay as they are.</span>
        </div>
        {error && <p className="sensor-interval-error" role="alert">{error}</p>}
        <div className="settings-modal-actions">
          <button type="button" onClick={onCancel}>Cancel</button>
          <button className="settings-add-button" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </div>
  )
}
