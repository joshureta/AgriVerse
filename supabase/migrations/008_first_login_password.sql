-- Require newly provisioned Farm Workers to replace their temporary password.
-- Existing users default to false and retain their current login flow.
alter table public.profiles
  add column if not exists must_change_password boolean not null default false,
  add column if not exists name_confirmed_at timestamptz default now(),
  add column if not exists onboarding_completed_at timestamptz default now();
