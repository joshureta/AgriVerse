-- Keep sales history while removing personal information for deleted Buyers.
create or replace function public.anonymize_deleted_buyer_orders()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role::text = 'buyer' then
    update public.buyer_orders
    set
      buyer_id = null,
      delivery_full_name = 'Deleted Buyer',
      delivery_mobile_number = null,
      delivery_country = null,
      delivery_region = null,
      delivery_province = null,
      delivery_city_municipality = null,
      delivery_barangay = null,
      customer_note = null
    where buyer_id = old.id;
  end if;

  return old;
end;
$$;

drop trigger if exists anonymize_buyer_orders_before_profile_delete on public.profiles;
create trigger anonymize_buyer_orders_before_profile_delete
before delete on public.profiles
for each row
execute function public.anonymize_deleted_buyer_orders();

revoke all on function public.anonymize_deleted_buyer_orders() from public, anon, authenticated;

notify pgrst, 'reload schema';
