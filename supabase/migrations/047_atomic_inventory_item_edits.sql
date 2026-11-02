-- Update an inventory item and its category details in one transaction.
-- An error in any statement rolls back the entire RPC call.
create or replace function public.update_inventory_item(
  p_item_id bigint,
  p_inventory_category_id bigint,
  p_unit_id bigint,
  p_item_name text,
  p_detail jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_category_code text;
begin
  select code into v_category_code
  from public.inventory_categories
  where id = p_inventory_category_id and status = true;
  if not found then
    raise exception 'Inventory category is unavailable' using errcode = '22023';
  end if;

  perform 1 from public.measurement_units where id = p_unit_id and status = true;
  if not found then
    raise exception 'Unit is unavailable' using errcode = '22023';
  end if;

  perform 1 from public.inventory_items
  where id = p_item_id and archived_at is null
  for update;
  if not found then
    raise exception 'Inventory item was not found or is archived' using errcode = 'P0002';
  end if;

  update public.inventory_items
  set inventory_category_id = p_inventory_category_id,
      unit_id = p_unit_id,
      item_name = p_item_name
  where id = p_item_id;

  delete from public.pineapple_inventory where inventory_id = p_item_id;
  delete from public.fertilizer_inventory where inventory_id = p_item_id;
  delete from public.pesticide_inventory where inventory_id = p_item_id;
  delete from public.equipment_inventory where inventory_id = p_item_id;

  if v_category_code = 'pineapple' then
    insert into public.pineapple_inventory (inventory_id, size_id, harvest_date)
    values (p_item_id, (p_detail->>'size_id')::bigint, nullif(p_detail->>'harvest_date', '')::date);
  elsif v_category_code = 'fertilizer' then
    insert into public.fertilizer_inventory (inventory_id, formulation)
    values (p_item_id, p_detail->>'formulation');
  elsif v_category_code = 'pesticide' then
    insert into public.pesticide_inventory (inventory_id, pesticide_type)
    values (p_item_id, p_detail->>'pesticide_type');
  elsif v_category_code = 'equipment' then
    insert into public.equipment_inventory (inventory_id, equipment_type_id, condition, last_maintenance)
    values (
      p_item_id,
      (p_detail->>'equipment_type_id')::bigint,
      p_detail->>'condition',
      nullif(p_detail->>'last_maintenance', '')::date
    );
  end if;

  return p_item_id;
end;
$$;

revoke all on function public.update_inventory_item(bigint, bigint, bigint, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.update_inventory_item(bigint, bigint, bigint, text, jsonb)
  to service_role;

notify pgrst, 'reload schema';
