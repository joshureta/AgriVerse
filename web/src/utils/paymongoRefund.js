export function qrphRefundLink(order) {
  if (order?.payment_method !== 'qrph' || order.refund_status !== 'processing') return null
  try {
    const url = new URL(order.refund_reference)
    return url.protocol === 'https:' && /(^|\.)paymongo(?:-stg)?\.com$/i.test(url.hostname) ? url.href : null
  } catch {
    return null
  }
}
