-- Seller handoff before a driver can be assigned.
alter table public.buyer_orders add column if not exists ready_for_delivery_at timestamptz;

do $$
declare item record;
begin
  for item in select conname from pg_constraint where conrelid = 'public.buyer_orders'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%order_status%'
  loop execute format('alter table public.buyer_orders drop constraint %I', item.conname); end loop;
end $$;
alter table public.buyer_orders add constraint buyer_orders_order_status_check check (order_status in ('pending','confirmed','preparing','ready_for_delivery','out_for_delivery','delivered','cancelled'));

do $$
declare item record;
begin
  for item in select conname from pg_constraint where conrelid = 'public.buyer_order_status_history'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%new_status%'
  loop execute format('alter table public.buyer_order_status_history drop constraint %I', item.conname); end loop;
end $$;
alter table public.buyer_order_status_history add constraint buyer_order_status_history_new_status_check check (new_status in ('pending','confirmed','preparing','ready_for_delivery','out_for_delivery','delivered','cancelled'));

create or replace function public.change_buyer_order_status(p_order_id bigint, p_new_status text, p_changed_by uuid, p_note text default null)
returns public.buyer_orders language plpgsql security definer set search_path = public as $$
declare v_order public.buyer_orders; v_previous_status text; v_allocation record;
begin
  select * into v_order from public.buyer_orders where id = p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  v_previous_status := v_order.order_status;
  if p_new_status not in ('confirmed','preparing','ready_for_delivery','out_for_delivery','delivered','cancelled') then raise exception 'Invalid order status'; end if;
  if v_order.order_status = p_new_status then return v_order; end if;
  if not ((v_order.order_status = 'pending' and p_new_status in ('confirmed','cancelled')) or (v_order.order_status = 'confirmed' and p_new_status in ('preparing','cancelled')) or (v_order.order_status = 'preparing' and p_new_status = 'ready_for_delivery') or (v_order.order_status = 'ready_for_delivery' and p_new_status = 'out_for_delivery') or (v_order.order_status = 'out_for_delivery' and p_new_status = 'delivered')) then raise exception 'Order cannot move from % to %', v_order.order_status, p_new_status; end if;
  if p_new_status = 'cancelled' then
    for v_allocation in select a.inventory_item_id, sum(a.quantity)::integer as quantity from public.buyer_order_inventory_allocations a join public.buyer_order_items oi on oi.id = a.order_item_id where oi.order_id = p_order_id group by a.inventory_item_id
    loop update public.inventory_items set quantity = quantity + v_allocation.quantity where id = v_allocation.inventory_item_id; end loop;
  end if;
  update public.buyer_orders set order_status = p_new_status, ready_for_delivery_at = case when p_new_status = 'ready_for_delivery' then coalesce(ready_for_delivery_at, now()) else ready_for_delivery_at end where id = p_order_id returning * into v_order;
  insert into public.buyer_order_status_history (order_id, previous_status, new_status, changed_by, note) values (p_order_id, v_previous_status, p_new_status, p_changed_by, nullif(trim(p_note), ''));
  return v_order;
end; $$;

notify pgrst, 'reload schema';
