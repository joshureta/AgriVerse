import { Check, X } from 'lucide-react'

// The admin's ruling on a return request: outcome, refund details, and their note.
// Renders nothing until the dispute is resolved. `compact` is the short version used on the order card.
export default function ReturnDecision({ order, paymentLabel, formatDate, compact = false }) {
  if (order.delivery_dispute_status !== 'resolved') return null

  const dismissed = order.delivery_dispute_resolution === 'dismissed'
  const notes = order.delivery_dispute_resolution_notes
  // GCash refunds are stored with an internal "Recorded — …" placeholder; only show a reference a person typed in.
  const reference = order.refund_reference && !order.refund_reference.startsWith('Recorded') ? order.refund_reference : null
  const Icon = dismissed ? X : Check
  const outcome = dismissed ? 'Claim dismissed' : 'Refund approved'

  if (compact) {
    return (
      <div className={`return-decision-compact ${dismissed ? 'is-dismissed' : 'is-refunded'}`}>
        <span className="return-decision-badge"><Icon aria-hidden="true" /> {outcome}</span>
        {!dismissed && order.refund_amount != null && <strong>PHP {Number(order.refund_amount).toLocaleString()}</strong>}
        {notes && <p>{notes}</p>}
      </div>
    )
  }

  return (
    <section className={`delivery-card return-panel return-decision ${dismissed ? 'is-dismissed' : 'is-refunded'}`} aria-labelledby="return-decision-title">
      <div className="return-panel-head">
        <h2 id="return-decision-title">Decision</h2>
        <span className="return-decision-badge"><Icon aria-hidden="true" /> {outcome}</span>
      </div>

      <dl className="return-decision-facts">
        {!dismissed && order.refund_amount != null && (
          <div><dt>Refund amount</dt><dd>PHP {Number(order.refund_amount).toLocaleString()}</dd></div>
        )}
        {order.delivery_dispute_resolved_at && (
          <div><dt>Decided on</dt><dd>{formatDate(order.delivery_dispute_resolved_at)}</dd></div>
        )}
        {!dismissed && paymentLabel && <div><dt>Refund to</dt><dd>{paymentLabel}</dd></div>}
        {!dismissed && reference && <div><dt>Reference</dt><dd>{reference}</dd></div>}
      </dl>

      <div className="return-detail-description-wrap">
        <span className="return-detail-label">Note from support</span>
        <blockquote className="return-detail-quote">{notes || 'No note was added to this decision.'}</blockquote>
      </div>

      {dismissed && <p className="return-panel-help">Think this is wrong? Use Contact Support on this page and mention your order number.</p>}
    </section>
  )
}
