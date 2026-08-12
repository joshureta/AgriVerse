-- Allow a Buyer to use either the saved profile address or a one-time delivery address.
drop function if exists public.place_buyer_order(uuid, text, text, text, jsonb);

create or replace function public.place_buyer_order(
  p_buyer_id uuid,
  p_delivery_method text,
  p_payment_method text,
  p_customer_note text,
  p_items jsonb,
  p_delivery_address jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype;
  v_order_id bigint;
  v_order_number text;
  v_subtotal numeric(12, 2) := 0;
  v_shipping numeric(12, 2) := 0;
  v_item jsonb;
  v_size public.pineapple_sizes%rowtype;
  v_quantity integer;
  v_remaining integer;
  v_allocate integer;
  v_order_item_id bigint;
  v_inventory record;
  v_full_name text;
  v_mobile text;
  v_country text;
  v_region text;
  v_province text;
  v_city text;
  v_barangay text;
begin
  if p_delivery_method not in ('delivery', 'pickup') then raise exception 'Invalid delivery method'; end if;
  if p_payment_method not in ('cash', 'bank', 'gcash') then raise exception 'Invalid payment method'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'The shopping cart is empty';
  end if;

  select * into v_profile from public.profiles where id = p_buyer_id;
  if not found or v_profile.role::text <> 'buyer' then raise exception 'Buyer profile not found'; end if;

  v_full_name := coalesce(nullif(trim(p_delivery_address ->> 'full_name'), ''), nullif(trim(v_profile.full_name), ''), 'Buyer');
  v_mobile := coalesce(nullif(trim(p_delivery_address ->> 'mobile_number'), ''), v_profile.mobile_number);
  v_country := coalesce(nullif(trim(p_delivery_address ->> 'country'), ''), v_profile.country);
  v_region := coalesce(nullif(trim(p_delivery_address ->> 'region'), ''), v_profile.region);
  v_province := coalesce(nullif(trim(p_delivery_address ->> 'province'), ''), v_profile.province);
  v_city := coalesce(nullif(trim(p_delivery_address ->> 'city_municipality'), ''), v_profile.city_municipality);
  v_barangay := coalesce(nullif(trim(p_delivery_address ->> 'barangay'), ''), v_profile.barangay);

  if p_delivery_method = 'delivery' and (v_mobile is null or v_country is null or v_region is null or v_city is null or v_barangay is null) then
    raise exception 'Complete the recipient and delivery address before placing the order';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item ->> 'quantity')::integer;
    if v_quantity is null or v_quantity <= 0 then raise exception 'Order quantities must be greater than zero'; end if;
    select * into v_size from public.pineapple_sizes
      where id = (v_item ->> 'product_id')::bigint and status = true and marketplace_enabled = true;
    if not found then raise exception 'A selected pineapple product is unavailable'; end if;
    v_subtotal := v_subtotal + (v_size.selling_price * v_quantity);
  end loop;

  if p_delivery_method = 'delivery' then v_shipping := 100.00; end if;

  insert into public.buyer_orders (
    buyer_id, delivery_method, payment_method, payment_status, subtotal, shipping_fee, total_amount,
    customer_note, delivery_full_name, delivery_mobile_number, delivery_country, delivery_region,
    delivery_province, delivery_city_municipality, delivery_barangay
  ) values (
    p_buyer_id, p_delivery_method, p_payment_method,
    case when p_payment_method = 'cash' then 'unpaid' else 'pending' end,
    v_subtotal, v_shipping, v_subtotal + v_shipping, nullif(trim(p_customer_note), ''),
    v_full_name, v_mobile, v_country, v_region, v_province, v_city, v_barangay
  ) returning id into v_order_id;

  v_order_number := 'JT-' || to_char(current_date, 'YYYYMMDD') || '-' || lpad(v_order_id::text, 6, '0');
  update public.buyer_orders set order_number = v_order_number where id = v_order_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item ->> 'quantity')::integer;
    select * into v_size from public.pineapple_sizes where id = (v_item ->> 'product_id')::bigint;
    insert into public.buyer_order_items (
      order_id, pineapple_size_id, product_name, weight_label, quantity, unit_price, line_total
    ) values (
      v_order_id, v_size.id, v_size.size_name || ' Pineapple', v_size.weight_label,
      v_quantity, v_size.selling_price, v_size.selling_price * v_quantity
    ) returning id into v_order_item_id;

    v_remaining := v_quantity;
    for v_inventory in
      select i.id, i.quantity
      from public.inventory_items i
      join public.inventory_categories c on c.id = i.inventory_category_id and c.code = 'pineapple'
      join public.pineapple_inventory pi on pi.inventory_id = i.id and pi.size_id = v_size.id
      where i.archived_at is null and i.quantity > 0
      order by pi.harvest_date asc nulls last, i.created_at asc
      for update of i
    loop
      exit when v_remaining = 0;
      v_allocate := least(v_remaining, v_inventory.quantity);
      update public.inventory_items set quantity = quantity - v_allocate where id = v_inventory.id;
      insert into public.buyer_order_inventory_allocations(order_item_id, inventory_item_id, quantity)
        values (v_order_item_id, v_inventory.id, v_allocate);
      v_remaining := v_remaining - v_allocate;
    end loop;
    if v_remaining > 0 then raise exception 'Insufficient stock for %', v_size.size_name || ' Pineapple'; end if;
  end loop;

  return jsonb_build_object(
    'id', v_order_id, 'order_number', v_order_number, 'subtotal', v_subtotal,
    'shipping_fee', v_shipping, 'total_amount', v_subtotal + v_shipping, 'order_status', 'pending'
  );
end;
$$;

revoke all on function public.place_buyer_order(uuid, text, text, text, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.place_buyer_order(uuid, text, text, text, jsonb, jsonb) to service_role;
notify pgrst, 'reload schema';
