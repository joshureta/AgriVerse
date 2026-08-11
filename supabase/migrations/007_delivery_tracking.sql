-- Add delivery tracking fields to buyer orders created by migration 006.
-- Safe to run when buyer_orders already contains data.
alter table public.buyer_orders
  add column if not exists estimated_delivery_at timestamptz not null default (now() + interval '2 days'),
  add column if not exists confirmed_at timestamptz,
  add column if not exists preparing_at timestamptz,
  add column if not exists out_for_delivery_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists cancelled_at timestamptz;

create or replace function public.set_buyer_order_status_timestamps()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();

  if new.order_status is distinct from old.order_status then
    if new.order_status = 'confirmed' and new.confirmed_at is null then
      new.confirmed_at = now();
    elsif new.order_status = 'preparing' and new.preparing_at is null then
      new.preparing_at = now();
    elsif new.order_status = 'out_for_delivery' and new.out_for_delivery_at is null then
      new.out_for_delivery_at = now();
    elsif new.order_status = 'delivered' and new.delivered_at is null then
      new.delivered_at = now();
    elsif new.order_status = 'cancelled' and new.cancelled_at is null then
      new.cancelled_at = now();
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists buyer_orders_set_status_timestamps on public.buyer_orders;
create trigger buyer_orders_set_status_timestamps
  before update on public.buyer_orders
  for each row execute procedure public.set_buyer_order_status_timestamps();

notify pgrst, 'reload schema';
