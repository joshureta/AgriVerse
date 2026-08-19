alter table public.profiles
  add column if not exists default_delivery_address_id uuid
    references public.buyer_delivery_addresses(id) on delete set null,
  add column if not exists delivery_address_confirmed_at timestamptz;

create index if not exists profiles_default_delivery_address_id_idx
  on public.profiles(default_delivery_address_id)
  where default_delivery_address_id is not null;

notify pgrst, 'reload schema';
