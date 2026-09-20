// One stepper for both the order progress and the return progress so they read as a family.
// Styles live in styles/Buyer/deliveryProgress.css.
// state: 'done' | 'current' | 'declined' | '' (pending)
export default function ProgressStepper({ steps }) {
  return (
    <ol className="progress-stepper" style={{ '--steps': steps.length }}>
      {steps.map(({ icon: Icon, label, sub, state }) => (
        <li className={`progress-step ${state ? `is-${state}` : ''}`} key={label} aria-current={state === 'current' ? 'step' : undefined}>
          <span className="progress-node"><Icon aria-hidden="true" /></span>
          <strong>{label}</strong>
          <small>{sub}</small>
        </li>
      ))}
    </ol>
  )
}
