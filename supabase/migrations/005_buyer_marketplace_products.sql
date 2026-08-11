-- Marketplace details for pineapple sizes. Physical stock remains in inventory_items.
alter table public.pineapple_sizes
  add column if not exists weight_label text,
  add column if not exists description text,
  add column if not exists selling_price numeric(10, 2),
  add column if not exists display_order integer not null default 0,
  add column if not exists marketplace_enabled boolean not null default true;

update public.pineapple_sizes
set
  weight_label = case lower(size_name)
    when 'small' then '400g - 500g'
    when 'medium' then '700g - 900g'
    when 'large' then '1kg - 1.3kg'
    else coalesce(weight_label, size_name)
  end,
  description = case lower(size_name)
    when 'small' then 'Perfect for juice and snacks.'
    when 'medium' then 'Ideal balance of sweetness and size.'
    when 'large' then 'Great for sharing, events, and premium use.'
    else coalesce(description, 'Fresh JToledo pineapple.')
  end,
  selling_price = case lower(size_name)
    when 'small' then 50.00
    when 'medium' then 65.00
    when 'large' then 80.00
    else coalesce(selling_price, 0.00)
  end,
  display_order = case lower(size_name)
    when 'small' then 1
    when 'medium' then 2
    when 'large' then 3
    else display_order
  end
where weight_label is null or description is null or selling_price is null or display_order = 0;

alter table public.pineapple_sizes
  alter column weight_label set not null,
  alter column description set not null,
  alter column selling_price set not null;

alter table public.pineapple_sizes
  drop constraint if exists pineapple_sizes_selling_price_nonnegative;

alter table public.pineapple_sizes
  add constraint pineapple_sizes_selling_price_nonnegative
  check (selling_price >= 0);

grant select on table public.pineapple_sizes to service_role;

notify pgrst, 'reload schema';
