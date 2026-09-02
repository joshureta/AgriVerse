-- Lets admins manually decrease inventory stock (equipment losses, damage, corrections).
-- Mirrors add_inventory_stock; the existing stock-movement trigger already logs the
-- resulting decrease as a 'stock_out' row, so no ledger changes are needed here.
create or replace function public.remove_inventory_stock(p_item_id bigint, p_quantity integer)
returns setof public.inventory_items language plpgsql security definer set search_path = '' as $$
begin
  if p_quantity is null or p_quantity <= 0 then raise exception 'Stock quantity must be greater than zero'; end if;
  return query update public.inventory_items set quantity = quantity - p_quantity
    where id = p_item_id and archived_at is null and quantity >= p_quantity returning *;
  if not found then raise exception 'Inventory item not found or has insufficient stock'; end if;
end;
$$;

revoke all on function public.remove_inventory_stock(bigint, integer) from public, anon, authenticated;
grant execute on function public.remove_inventory_stock(bigint, integer) to service_role;

notify pgrst, 'reload schema';
