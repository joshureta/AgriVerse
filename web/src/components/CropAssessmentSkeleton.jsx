import '../styles/crop-health-assessment.css'

function Bar({ width = '100%', height = 13, className = '' }) {
  return <span className={`cha-sk-bar ${className}`} style={{ width, height }} />
}

function Row() {
  return (
    <div className="cha-sk-row">
      <span className="cha-sk-bar cha-sk-icon" />
      <div>
        <div className="cha-sk-split"><Bar width="38%" height={15} /><Bar width={96} height={22} className="is-pill" /></div>
        <Bar width="92%" />
        <Bar width="70%" />
        <Bar width="34%" height={10} />
      </div>
    </div>
  )
}

function Card({ children, className = '' }) {
  return <div className={`crop-assessment-card cha-sk-card ${className}`}>{children}</div>
}

function Title({ width = '42%', pills = 1 }) {
  return (
    <div className="cha-sk-split">
      <Bar width={width} height={19} />
      <span className="cha-sk-pills">{Array.from({ length: pills }, (_, index) => <Bar key={index} width={104} height={24} className="is-pill" />)}</span>
    </div>
  )
}

// Placeholder that mirrors the monitoring report layout while it loads.
export default function CropAssessmentSkeleton({ label = 'Loading the monitoring report' }) {
  return (
    <div className="cha-skeleton" role="status" aria-live="polite" aria-label={label}>
      <span className="cha-sk-sr">{label}…</span>

      <div className="cha-info cha-sk-info" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => <div key={index}><Bar width="62%" height={10} /><Bar width="45%" height={16} /></div>)}
      </div>

      <Card className="cha-sk-overview">
        <Title width="34%" pills={2} />
        <div className="cha-sk-lines"><Bar /><Bar width="96%" /><Bar width="58%" /></div>
        <div className="cha-sk-split cha-sk-foot"><Bar width={190} height={11} /><Bar width={132} height={32} className="is-button" /></div>
      </Card>

      <div className="cha-grid">
        <Card><Title width="48%" /><Bar width="64%" height={11} /><div className="cha-sk-rows">{[1, 2, 3, 4].map((item) => <Row key={item} />)}</div></Card>
        <Card><Title width="54%" /><Bar width="58%" height={11} /><div className="cha-sk-rows">{[1, 2, 3, 4].map((item) => <Row key={item} />)}</div></Card>
      </div>

      <Card>
        <Title width="30%" />
        <div className="cha-sk-lines"><Bar width="88%" /></div>
        <div className="cha-combined">{[1, 2].map((item) => <div key={item} className="cha-combined-group"><Bar width="45%" height={12} /><Bar width="92%" /><Bar width="80%" /></div>)}</div>
      </Card>

      <div className="cha-grid">
        <Card><Bar width="40%" height={19} /><div className="cha-sk-rows">{[1, 2, 3].map((item) => <span key={item} className="cha-sk-block" />)}</div></Card>
        <Card><Bar width="46%" height={19} /><div className="cha-sk-rows">{[1, 2, 3].map((item) => <span key={item} className="cha-sk-block is-tall" />)}</div></Card>
      </div>

      <Card>
        <Bar width="28%" height={19} />
        <div className="cha-sk-table">
          <div className="cha-sk-table-head" />
          {[1, 2, 3].map((item) => (
            <div key={item} className="cha-sk-table-row"><Bar width="70%" /><Bar width={110} height={22} className="is-pill" /><Bar width="88%" /><Bar width="60%" height={20} /></div>
          ))}
        </div>
      </Card>
    </div>
  )
}
