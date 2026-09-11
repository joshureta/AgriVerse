-- Buyer-initiated cancellation, for orders that haven't started preparing yet.
-- Unlike change_buyer_order_status() (008), this is callable by the buyer who
-- owns the order rather than the seller managing it.
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

  -- No PayMongo refund API is wired up yet (same limitation as admin-deliveries'
  -- resolve-dispute route) — this only records that a refund is owed.
  if v_order.payment_method = 'gcash' and v_order.payment_status = 'paid' then
    v_refund_amount := v_order.total_amount;
  end if;

  update public.buyer_orders
  set
    order_status = 'cancelled',
    payment_status = case when v_refund_amount is not null then 'refunded' else payment_status end,
    refund_amount = coalesce(v_refund_amount, refund_amount),
    refund_reference = case when v_refund_amount is not null
      then 'Recorded — GCash refund not yet automated, no money moved by this action'
      else refund_reference end,
    refunded_at = case when v_refund_amount is not null then now() else refunded_at end
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

notify pgrst, 'reload schema';
