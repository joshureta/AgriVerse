-- Assign ready buyer orders to drivers without treating deliveries as farm tasks.
alter table public.buyer_orders
  add column if not exists assigned_driver_id uuid references public.profiles(id) on delete set null,
  add column if not exists delivery_scheduled_at timestamptz,
  add column if not exists delivery_window_end_at timestamptz,
  add column if not exists driver_assigned_at timestamptz;

alter table public.buyer_orders
  drop constraint if exists buyer_orders_delivery_window_check;

alter table public.buyer_orders
  add constraint buyer_orders_delivery_window_check check (
    delivery_window_end_at is null
    or delivery_scheduled_at is null
    or delivery_window_end_at > delivery_scheduled_at
  );

create index if not exists buyer_orders_assigned_driver_idx
  on public.buyer_orders (assigned_driver_id, delivery_scheduled_at asc)
  where assigned_driver_id is not null;
