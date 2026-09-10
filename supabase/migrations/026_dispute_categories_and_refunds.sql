-- Adds structured categorization, bulk-order quantity, buyer evidence photos,
-- driver/seller loop-in, and refund recording to the existing delivery dispute flow.
-- (No PayMongo refund API call is wired up yet — refunds are recorded, not executed, for GCash.)

alter table public.buyer_orders
  add column if not exists delivery_dispute_category text,
  add column if not exists delivery_dispute_item_id bigint references public.buyer_order_items(id) on delete set null,
  add column if not exists delivery_dispute_affected_quantity integer,
  add column if not exists delivery_dispute_photo_urls text[],
  add column if not exists delivery_dispute_responsible_role text,
  add column if not exists delivery_dispute_responder_id uuid references public.profiles(id) on delete set null,
  add column if not exists delivery_dispute_response text,
  add column if not exists delivery_dispute_response_at timestamptz,
  add column if not exists refund_amount numeric(12, 2),
  add column if not exists refund_reference text,
  add column if not exists refunded_at timestamptz;

alter table public.buyer_orders drop constraint if exists buyer_orders_delivery_dispute_category_check;
alter table public.buyer_orders add constraint buyer_orders_delivery_dispute_category_check
  check (delivery_dispute_category is null or delivery_dispute_category in ('damaged', 'spoiled_rotten', 'wrong_item', 'missing_item', 'wrong_quantity'));

alter table public.buyer_orders drop constraint if exists buyer_orders_delivery_dispute_affected_quantity_check;
alter table public.buyer_orders add constraint buyer_orders_delivery_dispute_affected_quantity_check
  check (delivery_dispute_affected_quantity is null or delivery_dispute_affected_quantity > 0);

alter table public.buyer_orders drop constraint if exists buyer_orders_delivery_dispute_photo_urls_check;
alter table public.buyer_orders add constraint buyer_orders_delivery_dispute_photo_urls_check
  check (delivery_dispute_photo_urls is null or array_length(delivery_dispute_photo_urls, 1) <= 6);

alter table public.buyer_orders drop constraint if exists buyer_orders_delivery_dispute_responsible_role_check;
alter table public.buyer_orders add constraint buyer_orders_delivery_dispute_responsible_role_check
  check (delivery_dispute_responsible_role is null or delivery_dispute_responsible_role in ('driver', 'seller'));

alter table public.buyer_orders drop constraint if exists buyer_orders_delivery_dispute_response_length;
alter table public.buyer_orders add constraint buyer_orders_delivery_dispute_response_length
  check (delivery_dispute_response is null or char_length(delivery_dispute_response) <= 2000);

-- Resolution now means Refund or Dismiss; "completed"/"escalated" stay valid so
-- existing rows (if any) don't become invalid, but the app only writes the new values.
alter table public.buyer_orders drop constraint if exists buyer_orders_delivery_dispute_resolution_check;
alter table public.buyer_orders add constraint buyer_orders_delivery_dispute_resolution_check
  check (delivery_dispute_resolution is null or delivery_dispute_resolution in ('completed', 'escalated', 'refunded', 'dismissed'));

alter table public.buyer_orders drop constraint if exists buyer_orders_refund_amount_check;
alter table public.buyer_orders add constraint buyer_orders_refund_amount_check
  check (refund_amount is null or refund_amount >= 0);

alter table public.buyer_orders drop constraint if exists buyer_orders_refund_reference_length;
alter table public.buyer_orders add constraint buyer_orders_refund_reference_length
  check (refund_reference is null or char_length(refund_reference) <= 300);

-- Storage bucket for buyer-submitted dispute evidence photos (separate from the
-- driver's own delivery-proofs bucket).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dispute-evidence',
  'dispute-evidence',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

create policy "Public read access for dispute evidence images"
  on storage.objects for select
  using (bucket_id = 'dispute-evidence');

create policy "Authenticated users can upload dispute evidence images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'dispute-evidence');

notify pgrst, 'reload schema';
