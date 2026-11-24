import { useState } from 'react'
import {
  INTERVAL_PRESETS,
  formatInterval,
  isValidInterval,
  joinInterval,
  splitInterval,
} from '../lib/sensorInterval.js'

const FIELDS = [
  { key: 'days', label: 'Days', max: 1 },
  { key: 'hours', label: 'Hours', max: 23 },
  { key: 'minutes', label: 'Minutes', max: 59 },
  { key: 'seconds', label: 'Seconds', max: 59 },
]

// Lets an admin pick how often a sensor device reads and sends data.
export default function SensorIntervalDialog({ device, onCancel, onSave }) {
  const current = device.read_interval_seconds
  const [mode, setMode] = useState(() => INTERVAL_PRESETS.some((preset) => preset.seconds === current) ? current : 'custom')
  const [parts, setParts] = useState(() => {
    const split = splitInterval(current)
    return Object.fromEntries(Object.entries(split).map(([key, value]) => [key, value ? String(value) : '']))
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const seconds = mode === 'custom' ? joinInterval(parts) : mode
  const valid = isValidInterval(seconds)

  function choosePreset(value) {
    setMode(value)
    setError('')
    if (value !== 'custom') {
      const split = splitInterval(value)
      setParts(Object.fromEntries(Object.entries(split).map(([key, part]) => [key, part ? String(part) : ''])))
    }
  }

  async function submit(event) {
    event.preventDefault()
    if (!valid) return
    setSaving(true); setError('')
    try {
      await onSave(seconds)
    } catch (saveError) {
      setError(saveError.message)
      setSaving(false)
    }
  }

  return (
    <div className="settings-modal-backdrop">
      <form className="settings-modal sensor-interval-modal" onSubmit={submit}>
        <div>
          <h2>Edit send interval</h2>
          <p className="sensor-interval-device">{device.device_id} · {device.field_name || 'No field assigned'}</p>
        </div>
        <fieldset className="sensor-interval-presets">
          <legend>How often should it send data?</legend>
          {INTERVAL_PRESETS.map((preset) => (
            <button key={preset.seconds} type="button" className={mode === preset.seconds ? 'is-selected' : ''} aria-pressed={mode === preset.seconds} onClick={() => choosePreset(preset.seconds)}>{preset.label}</button>
          ))}
          <button type="button" className={mode === 'custom' ? 'is-selected' : ''} aria-pressed={mode === 'custom'} onClick={() => choosePreset('custom')}>Custom</button>
        </fieldset>
        <div className={`sensor-interval-custom${mode === 'custom' ? '' : ' is-disabled'}`}>
          {FIELDS.map((field) => (
            <label key={field.key}>{field.label}
              <input
                type="number" inputMode="numeric" min="0" max={field.max} step="1" placeholder="0"
                value={parts[field.key]} disabled={mode !== 'custom'}
                aria-invalid={mode === 'custom' && !valid}
                onChange={(event) => setParts((currentParts) => ({ ...currentParts, [field.key]: event.target.value }))}
              />
            </label>
          ))}
        </div>
        {mode === 'custom' && !valid && <p className="sensor-interval-error" role="alert">Pick a value from 10 seconds to 1 day.</p>}
        <div className="sensor-interval-preview">
          <strong>{valid ? `Sends every ${formatInterval(seconds)}` : '—'}</strong>
          <span>Allowed: 10 seconds to 1 day. The device applies this within about 1 minute.</span>
        </div>
        {error && <p className="sensor-interval-error" role="alert">{error}</p>}
        <div className="settings-modal-actions">
          <button type="button" onClick={onCancel}>Cancel</button>
          <button className="settings-add-button" type="submit" disabled={!valid || saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </div>
  )
}
