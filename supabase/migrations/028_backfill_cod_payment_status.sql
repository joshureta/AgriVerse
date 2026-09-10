-- Cash on delivery is collected by the driver at hand-off, so delivery is the payment
-- event (see backend/routes/driver-orders.js POST /:id/complete). Before that logic
-- existed, cash orders that were already delivered/completed were left stuck on
-- payment_status = 'unpaid'. Backfill those so history matches the corrected logic.
update public.buyer_orders
set payment_status = 'paid'
where payment_method = 'cash'
  and payment_status = 'unpaid'
  and order_status in ('delivered', 'completed');
