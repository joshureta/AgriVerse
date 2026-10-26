-- Keep the admin decision and PayMongo's refund outcome separate from payment_status.
alter table public.buyer_orders
  add column if not exists paymongo_payment_id text,
  add column if not exists paymongo_refund_id text,
  add column if not exists refund_status text,
  add column if not exists refund_idempotency_key text,
  add column if not exists refund_decided_by uuid references public.profiles(id) on delete set null,
  add column if not exists refund_decided_at timestamptz,
  add column if not exists refund_decision_notes text,
  add column if not exists refund_error text;

alter table public.buyer_orders drop constraint if exists buyer_orders_refund_status_check;
alter table public.buyer_orders add constraint buyer_orders_refund_status_check
  check (refund_status is null or refund_status in
    ('requested', 'submitting', 'processing', 'succeeded', 'failed', 'rejected', 'review_required'));

create unique index if not exists buyer_orders_paymongo_payment_id_unique
  on public.buyer_orders (paymongo_payment_id) where paymongo_payment_id is not null;
create unique index if not exists buyer_orders_paymongo_refund_id_unique
  on public.buyer_orders (paymongo_refund_id) where paymongo_refund_id is not null;
create unique index if not exists buyer_orders_refund_idempotency_key_unique
  on public.buyer_orders (refund_idempotency_key) where refund_idempotency_key is not null;

-- Older GCash records were marked refunded without a PayMongo API request.
-- Reopen only those with the exact placeholder written by the old application.
update public.buyer_orders
set payment_status = 'paid', refunded_at = null,
    refund_status = case when order_status = 'cancelled' then 'requested' else 'review_required' end,
    refund_reference = null,
    refund_error = 'Previous application recorded approval without sending a PayMongo refund'
where payment_method = 'gcash' and payment_status = 'refunded'
  and refund_reference = 'Recorded — GCash refund not yet automated, no money moved by this action';

update public.buyer_orders
set refund_status = 'requested', refund_reference = null
where order_status = 'cancelled' and payment_method in ('gcash', 'qrph')
  and refund_amount is not null and payment_status = 'paid' and refund_status is null;

update public.buyer_orders
set refund_status = 'succeeded'
where payment_status = 'refunded' and refund_status is null;

-- Cancellation still releases inventory immediately; the paid refund waits for admin review.
create or replace function public.cancel_buyer_order(
  p_order_id bigint,
  p_buyer_id uuid,
  p_reason text default null
)
returns public.buyer_orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.buyer_orders%rowtype;
  v_previous_status text;
  v_allocation record;
  v_refund_amount numeric(12, 2) := null;
begin
  select * into v_order from public.buyer_orders
  where id = p_order_id and buyer_id = p_buyer_id
  for update;
  if not found then raise exception 'Order not found'; end if;

  v_previous_status := v_order.order_status;
  if v_previous_status not in ('pending', 'confirmed') then
    raise exception 'This order can no longer be cancelled';
  end if;

  for v_allocation in
    select a.inventory_item_id, sum(a.quantity)::integer as quantity
    from public.buyer_order_inventory_allocations a
    join public.buyer_order_items oi on oi.id = a.order_item_id
    where oi.order_id = p_order_id
    group by a.inventory_item_id
  loop
    update public.inventory_items
    set quantity = quantity + v_allocation.quantity
    where id = v_allocation.inventory_item_id;
  end loop;

  if v_order.payment_method in ('gcash', 'qrph') and v_order.payment_status = 'paid' then
    v_refund_amount := v_order.total_amount;
  end if;

  update public.buyer_orders
  set order_status = 'cancelled',
      refund_amount = coalesce(v_refund_amount, refund_amount),
      refund_status = case when v_refund_amount is not null then 'requested' else refund_status end,
      refund_reference = case when v_refund_amount is not null then null else refund_reference end,
      refunded_at = case when v_refund_amount is not null then null else refunded_at end
  where id = p_order_id
  returning * into v_order;

  insert into public.buyer_order_status_history (
    order_id, previous_status, new_status, changed_by, note
  ) values (
    p_order_id, v_previous_status, 'cancelled', p_buyer_id, nullif(trim(p_reason), '')
  );

  return v_order;
end;
$$;

revoke all on function public.cancel_buyer_order(bigint, uuid, text) from public, anon, authenticated;
grant execute on function public.cancel_buyer_order(bigint, uuid, text) to service_role;

-- An already-created payment can settle after cancellation for either online method.
create or replace function public.record_late_qrph_payment_refund()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.payment_method in ('gcash', 'qrph')
     and new.order_status = 'cancelled'
     and new.payment_status = 'paid'
     and old.payment_status is distinct from 'paid' then
    new.refund_amount := new.total_amount;
    new.refund_status := 'requested';
    new.refund_reference := null;
    new.refunded_at := null;
  end if;
  return new;
end;
$$;

notify pgrst, 'reload schema';
