-- On-site pickup gets its own parallel branch after "preparing", instead of reusing
-- the delivery-only ready_for_delivery -> out_for_delivery -> delivered path (which a
-- pickup order can never satisfy, since it never gets a driver assigned).
--
-- New order_status value: 'ready_for_pickup' (preparing -> ready_for_pickup, pickup orders only).
-- From there, the seller's "Mark Picked Up" action jumps straight to 'completed' (no separate
-- buyer confirmation step, since the buyer inspects the order face to face at the counter) —
-- mirroring how a delivery order's buyer-confirmed receipt jumps straight to 'completed' too.
-- The delivery flow (pending..confirmed..preparing..ready_for_delivery..out_for_delivery..delivered)
-- is untouched by this migration.

alter table public.buyer_orders
  add column if not exists ready_for_pickup_at timestamptz,
  add column if not exists pickup_code text,
  add column if not exists picked_up_at timestamptz,
  add column if not exists picked_up_by uuid references public.profiles(id) on delete set null;

do $$
declare item record;
begin
  for item in select conname from pg_constraint where conrelid = 'public.buyer_orders'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%order_status%'
  loop execute format('alter table public.buyer_orders drop constraint %I', item.conname); end loop;
end $$;
alter table public.buyer_orders add constraint buyer_orders_order_status_check
  check (order_status in ('pending','confirmed','preparing','ready_for_delivery','out_for_delivery','ready_for_pickup','delivered','completed','cancelled'));

do $$
declare item record;
begin
  for item in select conname from pg_constraint where conrelid = 'public.buyer_order_status_history'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%new_status%'
  loop execute format('alter table public.buyer_order_status_history drop constraint %I', item.conname); end loop;
end $$;
alter table public.buyer_order_status_history add constraint buyer_order_status_history_new_status_check
  check (new_status in ('pending','confirmed','preparing','ready_for_delivery','out_for_delivery','ready_for_pickup','delivered','completed','cancelled'));

alter table public.buyer_orders drop constraint if exists buyer_orders_completed_via_check;
alter table public.buyer_orders add constraint buyer_orders_completed_via_check
  check (completed_via is null or completed_via in ('buyer_confirmed', 'auto_timeout', 'dispute_resolved', 'pickup_verified'));

create or replace function public.change_buyer_order_status(p_order_id bigint, p_new_status text, p_changed_by uuid, p_note text default null)
returns public.buyer_orders language plpgsql security definer set search_path = public as $$
declare v_order public.buyer_orders; v_previous_status text; v_allocation record;
begin
  select * into v_order from public.buyer_orders where id = p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  v_previous_status := v_order.order_status;
  if p_new_status not in ('confirmed','preparing','ready_for_delivery','out_for_delivery','ready_for_pickup','delivered','completed','cancelled') then raise exception 'Invalid order status'; end if;
  if v_order.order_status = p_new_status then return v_order; end if;
  if not (
    (v_order.order_status = 'pending' and p_new_status in ('confirmed','cancelled')) or
    (v_order.order_status = 'confirmed' and p_new_status in ('preparing','cancelled')) or
    (v_order.order_status = 'preparing' and p_new_status = 'ready_for_delivery') or
    (v_order.order_status = 'ready_for_delivery' and p_new_status = 'out_for_delivery') or
    (v_order.order_status = 'out_for_delivery' and p_new_status = 'delivered') or
    (v_order.order_status = 'preparing' and p_new_status = 'ready_for_pickup') or
    (v_order.order_status = 'ready_for_pickup' and p_new_status = 'completed')
  ) then raise exception 'Order cannot move from % to %', v_order.order_status, p_new_status; end if;
  if p_new_status = 'out_for_delivery' and coalesce(v_order.delivery_assignment_status, '') not in ('accepted', 'picked_up') then
    raise exception 'Order cannot move to out for delivery until a driver has accepted this delivery';
  end if;
  if p_new_status = 'ready_for_pickup' and v_order.delivery_method <> 'pickup' then
    raise exception 'Only on-site pickup orders can be marked ready for pickup';
  end if;
  if p_new_status = 'cancelled' then
    for v_allocation in select a.inventory_item_id, sum(a.quantity)::integer as quantity from public.buyer_order_inventory_allocations a join public.buyer_order_items oi on oi.id = a.order_item_id where oi.order_id = p_order_id group by a.inventory_item_id
    loop update public.inventory_items set quantity = quantity + v_allocation.quantity where id = v_allocation.inventory_item_id; end loop;
  end if;
  update public.buyer_orders set
    order_status = p_new_status,
    ready_for_delivery_at = case when p_new_status = 'ready_for_delivery' then coalesce(ready_for_delivery_at, now()) else ready_for_delivery_at end,
    ready_for_pickup_at = case when p_new_status = 'ready_for_pickup' then coalesce(ready_for_pickup_at, now()) else ready_for_pickup_at end,
    pickup_code = case when p_new_status = 'ready_for_pickup' then coalesce(pickup_code, lpad((floor(random() * 10000))::int::text, 4, '0')) else pickup_code end,
    picked_up_at = case when p_new_status = 'completed' and v_previous_status = 'ready_for_pickup' then now() else picked_up_at end,
    picked_up_by = case when p_new_status = 'completed' and v_previous_status = 'ready_for_pickup' then p_changed_by else picked_up_by end,
    completed_at = case when p_new_status = 'completed' then now() else completed_at end,
    completed_via = case when p_new_status = 'completed' then 'pickup_verified' else completed_via end
  where id = p_order_id returning * into v_order;
  insert into public.buyer_order_status_history (order_id, previous_status, new_status, changed_by, note) values (p_order_id, v_previous_status, p_new_status, p_changed_by, nullif(trim(p_note), ''));
  return v_order;
end; $$;

notify pgrst, 'reload schema';
