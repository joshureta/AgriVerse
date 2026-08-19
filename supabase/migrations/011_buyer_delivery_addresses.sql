create table if not exists public.buyer_delivery_addresses (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  label text not null default 'New address',
  full_name text not null,
  mobile_number text not null,
  country text not null,
  region text not null,
  province text,
  city_municipality text not null,
  barangay text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists buyer_delivery_addresses_buyer_id_idx
  on public.buyer_delivery_addresses(buyer_id, created_at);

-- Remove any identical address rows created before duplicate protection was added.
with ranked_addresses as (
  select
    id,
    row_number() over (
      partition by
        buyer_id,
        lower(trim(full_name)),
        lower(trim(mobile_number)),
        lower(trim(country)),
        lower(trim(region)),
        lower(trim(coalesce(province, ''))),
        lower(trim(city_municipality)),
        lower(trim(barangay))
      order by created_at, id
    ) as duplicate_number
  from public.buyer_delivery_addresses
)
delete from public.buyer_delivery_addresses
where id in (
  select id from ranked_addresses where duplicate_number > 1
);

-- A Buyer cannot save the same normalized address more than once.
create unique index if not exists buyer_delivery_addresses_unique_address_idx
  on public.buyer_delivery_addresses (
    buyer_id,
    lower(trim(full_name)),
    lower(trim(mobile_number)),
    lower(trim(country)),
    lower(trim(region)),
    lower(trim(coalesce(province, ''))),
    lower(trim(city_municipality)),
    lower(trim(barangay))
  );

alter table public.buyer_delivery_addresses enable row level security;

drop policy if exists "Buyers can read their delivery addresses" on public.buyer_delivery_addresses;
create policy "Buyers can read their delivery addresses"
  on public.buyer_delivery_addresses for select
  to authenticated
  using (buyer_id = auth.uid());

drop policy if exists "Buyers can add their delivery addresses" on public.buyer_delivery_addresses;
create policy "Buyers can add their delivery addresses"
  on public.buyer_delivery_addresses for insert
  to authenticated
  with check (buyer_id = auth.uid());

drop policy if exists "Buyers can update their delivery addresses" on public.buyer_delivery_addresses;
create policy "Buyers can update their delivery addresses"
  on public.buyer_delivery_addresses for update
  to authenticated
  using (buyer_id = auth.uid())
  with check (buyer_id = auth.uid());

notify pgrst, 'reload schema';
