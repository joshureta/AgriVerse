-- Overdue is derived from the schedule date; the task retains its normal status.
-- No incident, recovery, or progress-guard objects are required.
BEGIN;
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS delay_reason_code text,
  ADD COLUMN IF NOT EXISTS delay_reason_notes text,
  ADD COLUMN IF NOT EXISTS delay_reason_submitted_at timestamptz;
DROP TRIGGER IF EXISTS tasks_operation_guard ON public.tasks;
DROP TRIGGER IF EXISTS orders_operation_guard ON public.buyer_orders;
DROP FUNCTION IF EXISTS public.guard_operation_progress();
COMMIT;
