-- A seller could previously click "Start Delivery" (ready_for_delivery -> out_for_delivery)
-- even when no driver was assigned yet, or a driver was assigned but hadn't accepted the
-- job. This closes that gap: the transition now requires the driver to have accepted
-- (or already confirmed pickup) before the order can move to out_for_delivery.

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
  if p_new_status = 'out_for_delivery' and coalesce(v_order.delivery_assignment_status, '') not in ('accepted', 'picked_up') then
    raise exception 'Order cannot move to out for delivery until a driver has accepted this delivery';
  end if;
  if p_new_status = 'cancelled' then
    for v_allocation in select a.inventory_item_id, sum(a.quantity)::integer as quantity from public.buyer_order_inventory_allocations a join public.buyer_order_items oi on oi.id = a.order_item_id where oi.order_id = p_order_id group by a.inventory_item_id
    loop update public.inventory_items set quantity = quantity + v_allocation.quantity where id = v_allocation.inventory_item_id; end loop;
  end if;
  update public.buyer_orders set order_status = p_new_status, ready_for_delivery_at = case when p_new_status = 'ready_for_delivery' then coalesce(ready_for_delivery_at, now()) else ready_for_delivery_at end where id = p_order_id returning * into v_order;
  insert into public.buyer_order_status_history (order_id, previous_status, new_status, changed_by, note) values (p_order_id, v_previous_status, p_new_status, p_changed_by, nullif(trim(p_note), ''));
  return v_order;
end; $$;

notify pgrst, 'reload schema';
