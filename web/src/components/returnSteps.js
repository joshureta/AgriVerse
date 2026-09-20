import { Banknote, FileText, Hourglass, X } from 'lucide-react'

// Steps for a return/refund dispute. A dismissed claim ends in "No refund" rather than
// "Refund completed" — the admin's decision (delivery_dispute_resolution) decides which.
export function buildReturnSteps(order, formatDate) {
  const resolved = order.delivery_dispute_status === 'resolved'
  const dismissed = resolved && order.delivery_dispute_resolution === 'dismissed'
  const decisionSub = !resolved ? '1–2 business days' : dismissed ? 'Claim dismissed' : 'Refund approved'

  return [
    {
      icon: FileText,
      label: 'Report submitted',
      sub: order.delivery_dispute_created_at ? formatDate(order.delivery_dispute_created_at) : 'Submitted',
      state: 'done',
    },
    { icon: Hourglass, label: 'Return decision', sub: decisionSub, state: resolved ? 'done' : 'current' },
    dismissed
      ? { icon: X, label: 'No refund', sub: 'Not approved', state: 'declined' }
      : { icon: Banknote, label: 'Refund completed', sub: resolved ? 'Completed' : 'Pending', state: resolved ? 'done' : '' },
  ]
}
