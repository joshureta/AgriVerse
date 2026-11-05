-- Native Firebase Cloud Messaging registrations for Android mobile devices.
create table if not exists public.push_devices (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null unique check (char_length(token) between 20 and 4096),
  platform text not null check (platform in ('android')),
  provider text not null default 'fcm' check (provider in ('fcm')),
  device_name text check (device_name is null or char_length(device_name) between 1 and 200),
  active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_devices_user_active_idx
  on public.push_devices(user_id, active);

alter table public.push_devices enable row level security;

drop policy if exists push_devices_owner_select on public.push_devices;
create policy push_devices_owner_select on public.push_devices
  for select using (user_id = auth.uid());

drop policy if exists push_devices_owner_delete on public.push_devices;
create policy push_devices_owner_delete on public.push_devices
  for delete using (user_id = auth.uid());

notify pgrst, 'reload schema';
