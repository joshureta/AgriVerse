-- AgriVerse user profiles and role security.
-- Run this migration in the Supabase SQL Editor before testing registration.

do $$
begin
  create type public.app_role as enum ('admin', 'farm_worker', 'buyer');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.worker_category as enum (
    'driver',
    'crop_management_worker',
    'seller'
  );
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default 'Buyer',
  mobile_number text,
  country text,
  region text,
  province text,
  city_municipality text,
  barangay text,
  role public.app_role not null default 'buyer',
  worker_category public.worker_category,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_worker_category_matches_role check (
    (role = 'farm_worker' and worker_category is not null)
    or (role <> 'farm_worker' and worker_category is null)
  )
);

alter table public.profiles add column if not exists province text;
alter table public.profiles add column if not exists city_municipality text;
alter table public.profiles add column if not exists barangay text;

alter table public.profiles enable row level security;

-- This trigger deliberately ignores any role supplied by the browser.
-- Every public sign-up starts as a Buyer.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    mobile_number,
    country,
    region,
    province,
    city_municipality,
    barangay,
    role,
    worker_category
  )
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'Buyer'),
    nullif(trim(new.raw_user_meta_data ->> 'mobile_number'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'country'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'region'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'province'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'city_municipality'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'barangay'), ''),
    'buyer',
    null
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.set_profile_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_profile_updated_at();

revoke all on table public.profiles from anon, authenticated;
grant usage on type public.app_role to authenticated, service_role;
grant usage on type public.worker_category to authenticated, service_role;
grant select on table public.profiles to authenticated;
grant update (
  full_name,
  mobile_number,
  country,
  region,
  province,
  city_municipality,
  barangay
)
  on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Admin and Farm Worker roles must be assigned through a trusted admin flow.
-- Never allow the public registration form to set these columns.
