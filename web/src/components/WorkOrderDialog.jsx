import { Check, X } from 'lucide-react'

// Shared building blocks for the admin "work order" dialogs (task, delivery, dispute, settings).
// Styles live in styles/work-order-dialogs.css.

export function WorkOrderDialog({
  size,
  eyebrow,
  id,
  title,
  titleId,
  sub,
  steps,
  onClose,
  onSubmit,
  footerNote,
  footer,
  children,
}) {
  const content = (
    <>
      <div className="wo-scroll custom-scrollbar">{children}</div>
      <footer className="wo-foot">
        <div className="wo-foot-note">{footerNote}</div>
        <div className="wo-foot-actions">{footer}</div>
      </footer>
    </>
  )

  return (
    <div className="task-modal-backdrop">
      <section
        className={`wo-dialog${size ? ` is-${size}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="wo-head">
          <div className="wo-head-text">
            <p className="wo-eyebrow">
              {eyebrow}
              {id && <span>{id}</span>}
            </p>
            <h2 id={titleId}>{title}</h2>
            {sub && <p className="wo-sub">{sub}</p>}
          </div>
          <button className="wo-close" type="button" onClick={onClose} aria-label="Close">
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        {steps}
        {onSubmit
          ? <form className="wo-form" onSubmit={onSubmit}>{content}</form>
          : <div className="wo-form">{content}</div>}
      </section>
    </div>
  )
}

export function WoSteps({ items }) {
  return (
    <ol className={`wo-steps is-${items.length}`} aria-label="Progress">
      {items.map((step) => (
        <li className={step.state || ''} key={step.label}>
          <span className="wo-step-dot" aria-hidden="true">
            {step.state === 'is-done' ? <Check size={9} strokeWidth={3.5} /> : null}
          </span>
          <span className="wo-step-text">
            <strong>{step.label}</strong>
            <small>{step.note}</small>
          </span>
        </li>
      ))}
    </ol>
  )
}

export function WoSection({ title, children, className = '' }) {
  return (
    <section className={`wo-section ${className}`}>
      {title && <h3>{title}</h3>}
      {children}
    </section>
  )
}

export function WoList({ children }) {
  return <dl className="wo-list">{children}</dl>
}

export function WoRow({ label, children }) {
  return (
    <div className="wo-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

export function WoField({ label, htmlFor, hint, wide, children }) {
  return (
    <div className={`wo-field${wide ? ' is-wide' : ''}`}>
      {label && <label htmlFor={htmlFor}>{label}</label>}
      {children}
      {hint && <small>{hint}</small>}
    </div>
  )
}

export function WoRadios({ label, options, value, onChange }) {
  return (
    <div className="wo-radios" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          type="button"
          role="radio"
          aria-checked={String(option.value) === String(value)}
          className={String(option.value) === String(value) ? 'is-on' : ''}
          key={option.value}
          onClick={() => onChange(option.value)}
        >
          <i aria-hidden="true" />
          {option.label}
        </button>
      ))}
    </div>
  )
}
