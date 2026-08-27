-- Tracks the PayMongo objects behind a GCash order so incoming webhooks can
-- be matched back to the buyer_orders row that should be marked paid.
alter table public.buyer_orders add column if not exists paymongo_payment_intent_id text;
alter table public.buyer_orders add column if not exists paymongo_payment_method_id text;

create unique index if not exists buyer_orders_paymongo_intent_key
  on public.buyer_orders (paymongo_payment_intent_id)
  where paymongo_payment_intent_id is not null;

notify pgrst, 'reload schema';
