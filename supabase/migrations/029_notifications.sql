-- In-app notification feed. One row per recipient per event (task/harvest/delivery/dispute updates).
create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in (
    'task_assigned', 'task_starting_soon', 'harvest_approved', 'harvest_rejected',
    'task_reassigned', 'admin_broadcast', 'weather_alert',
    'delivery_assigned', 'delivery_window_approaching', 'order_cancelled',
    'dispute_opened', 'cod_confirmed', 'rating_received'
  )),
  title text not null check (char_length(title) between 1 and 200),
  body text not null check (char_length(body) between 1 and 500),
  entity_type text check (entity_type in ('task', 'order')),
  entity_id bigint,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_id_idx on public.notifications(recipient_id, created_at desc);
create index if not exists notifications_recipient_unread_idx on public.notifications(recipient_id) where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists notifications_recipient_select on public.notifications;
create policy notifications_recipient_select on public.notifications
  for select
  using (recipient_id = auth.uid());

drop policy if exists notifications_recipient_update on public.notifications;
create policy notifications_recipient_update on public.notifications
  for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

notify pgrst, 'reload schema';
