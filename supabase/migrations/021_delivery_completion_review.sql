-- Delivery completion proof, buyer confirmation, and dispute handling.

alter table public.buyer_orders
  add column if not exists delivery_proof_image_url text,
  add column if not exists delivery_proof_image_storage_path text,
  add column if not exists delivery_proof_notes text,
  add column if not exists delivery_proof_submitted_at timestamptz,
  add column if not exists buyer_confirmed_at timestamptz,
  add column if not exists delivery_dispute_status text,
  add column if not exists delivery_dispute_reason text,
  add column if not exists delivery_dispute_created_at timestamptz,
  add column if not exists delivery_dispute_resolved_by uuid references public.profiles(id) on delete set null,
  add column if not exists delivery_dispute_resolved_at timestamptz,
  add column if not exists delivery_dispute_resolution text,
  add column if not exists delivery_dispute_resolution_notes text,
  add column if not exists completed_at timestamptz,
  add column if not exists completed_via text;

alter table public.buyer_orders drop constraint if exists buyer_orders_delivery_proof_notes_length;
alter table public.buyer_orders add constraint buyer_orders_delivery_proof_notes_length
  check (delivery_proof_notes is null or char_length(delivery_proof_notes) <= 2000);

alter table public.buyer_orders drop constraint if exists buyer_orders_delivery_dispute_status_check;
alter table public.buyer_orders add constraint buyer_orders_delivery_dispute_status_check
  check (delivery_dispute_status is null or delivery_dispute_status in ('open', 'resolved'));

alter table public.buyer_orders drop constraint if exists buyer_orders_delivery_dispute_reason_length;
alter table public.buyer_orders add constraint buyer_orders_delivery_dispute_reason_length
  check (delivery_dispute_reason is null or char_length(delivery_dispute_reason) <= 1000);

alter table public.buyer_orders drop constraint if exists buyer_orders_delivery_dispute_resolution_check;
alter table public.buyer_orders add constraint buyer_orders_delivery_dispute_resolution_check
  check (delivery_dispute_resolution is null or delivery_dispute_resolution in ('completed', 'escalated'));

alter table public.buyer_orders drop constraint if exists buyer_orders_delivery_dispute_resolution_notes_length;
alter table public.buyer_orders add constraint buyer_orders_delivery_dispute_resolution_notes_length
  check (delivery_dispute_resolution_notes is null or char_length(delivery_dispute_resolution_notes) <= 1000);

alter table public.buyer_orders drop constraint if exists buyer_orders_completed_via_check;
alter table public.buyer_orders add constraint buyer_orders_completed_via_check
  check (completed_via is null or completed_via in ('buyer_confirmed', 'auto_timeout', 'dispute_resolved'));

-- Widen order_status / status-history to accept the new terminal "completed" state.
do $$
declare item record;
begin
  for item in select conname from pg_constraint where conrelid = 'public.buyer_orders'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%order_status%'
  loop execute format('alter table public.buyer_orders drop constraint %I', item.conname); end loop;
end $$;
alter table public.buyer_orders add constraint buyer_orders_order_status_check check (order_status in ('pending','confirmed','preparing','ready_for_delivery','out_for_delivery','delivered','completed','cancelled'));

do $$
declare item record;
begin
  for item in select conname from pg_constraint where conrelid = 'public.buyer_order_status_history'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%new_status%'
  loop execute format('alter table public.buyer_order_status_history drop constraint %I', item.conname); end loop;
end $$;
alter table public.buyer_order_status_history add constraint buyer_order_status_history_new_status_check check (new_status in ('pending','confirmed','preparing','ready_for_delivery','out_for_delivery','delivered','completed','cancelled'));

create index if not exists buyer_orders_delivery_dispute_open_idx
  on public.buyer_orders (delivery_dispute_created_at asc)
  where delivery_dispute_status = 'open';

-- Storage bucket for driver delivery-proof photos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'delivery-proofs',
  'delivery-proofs',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

create policy "Public read access for delivery proof images"
  on storage.objects for select
  using (bucket_id = 'delivery-proofs');

create policy "Authenticated users can upload delivery proof images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'delivery-proofs');

create policy "Authenticated users can update delivery proof images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'delivery-proofs');

create policy "Authenticated users can delete delivery proof images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'delivery-proofs');

notify pgrst, 'reload schema';
