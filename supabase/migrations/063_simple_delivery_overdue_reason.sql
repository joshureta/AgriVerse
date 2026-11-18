-- Delivery stays in its normal lifecycle. A late delivery records the driver's
-- explanation alongside the proof of delivery.
BEGIN;
ALTER TABLE public.buyer_orders
  ADD COLUMN IF NOT EXISTS delivery_delay_reason_code text,
  ADD COLUMN IF NOT EXISTS delivery_delay_reason_notes text,
  ADD COLUMN IF NOT EXISTS delivery_delay_reason_submitted_at timestamptz;
COMMIT;
