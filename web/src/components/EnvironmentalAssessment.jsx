import { AlertTriangle, CheckCircle2, Droplets, Info, ListChecks, ThermometerSun, Waves, Wind } from 'lucide-react'

const PARAMETER_ICONS = {
  airTemperature: ThermometerSun,
  soilTemperature: Waves,
  humidity: Wind,
  soilMoisture: Droplets,
}

// Maps backend statuses to the site's pill tones.
export function statusTone(status) {
  if (status === 'NORMAL') return 'normal'
  if (status === 'LOW' || status === 'HIGH') return 'watch'
  if (status?.startsWith('CRITICAL')) return 'critical'
  return 'muted'
}

const formatTime = (value) => value
  ? new Date(value).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' })
  : null

function StatusPill({ status }) {
  return <span className={`env-assess-pill is-${statusTone(status)}`}>{status}</span>
}

// Environmental monitoring report (summary, per-parameter assessment, priorities,
// recommendations, limitations). Statuses come from backend rules, never the AI.
export default function EnvironmentalAssessment({ assessment }) {
  const concerns = assessment.priorityConcerns || []
  return (
    <div className="env-assess">
      <section className="env-assess-summary" aria-label="Environmental monitoring summary">
        <div className="env-assess-section-title">
          <h4>Environmental Monitoring Summary</h4>
        </div>
        <p>{assessment.summary}</p>
      </section>

      <section aria-label="Individual parameter assessments">
        <div className="env-assess-section-title"><h4>Parameter Assessments</h4></div>
        <div className="env-assess-grid">
          {assessment.parameters.map((item) => {
            const Icon = PARAMETER_ICONS[item.key] || Info
            const tone = statusTone(item.status)
            return (
              <article key={item.key} className={`env-assess-param is-${tone}`}>
                <header>
                  <span className="env-assess-param-name"><Icon aria-hidden="true" />{item.parameter}</span>
                  <StatusPill status={item.status} />
                </header>
                <div className="env-assess-reading">
                  <strong>{item.displayReading}</strong>
                  <span>Range {item.referenceRange}{item.measuredAt ? ` · ${formatTime(item.measuredAt)}` : ''}</span>
                </div>
                <dl>
                  <dt>Description</dt>
                  <dd>{item.description}</dd>
                  <dt>Possible implication</dt>
                  <dd>{item.possibleImplication}</dd>
                  <dt>Recommended action</dt>
                  <dd>
                    <ul>{item.recommendedActions.map((action) => <li key={action}>{action}</li>)}</ul>
                  </dd>
                </dl>
              </article>
            )
          })}
        </div>
      </section>

      <div className="env-assess-columns">
        <section className="env-assess-panel" aria-label="Priority environmental concerns">
          <div className="env-assess-section-title"><h4><AlertTriangle aria-hidden="true" />Priority Concerns</h4></div>
          {concerns.length ? (
            <ol className="env-assess-concerns">
              {concerns.map((item) => (
                <li key={item.parameter} className={`is-${statusTone(item.status)}`}>
                  <div><strong>{item.parameter}</strong><StatusPill status={item.status} /></div>
                  <p>{item.concern}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="env-assess-ok"><CheckCircle2 aria-hidden="true" />{assessment.noConcernMessage}</p>
          )}
        </section>

        <section className="env-assess-panel" aria-label="General recommendations">
          <div className="env-assess-section-title"><h4><ListChecks aria-hidden="true" />General Recommendations</h4></div>
          <ol className="env-assess-recommendations">
            {assessment.generalRecommendations.map((item) => <li key={item}>{item}</li>)}
          </ol>
        </section>
      </div>

      {assessment.limitations?.length > 0 && (
        <details className="env-assess-limitations">
          <summary><Info aria-hidden="true" />Assessment limitations ({assessment.limitations.length})</summary>
          <ul>{assessment.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
        </details>
      )}
    </div>
  )
}
