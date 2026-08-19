-- Preserve completed order history when an administrator deletes a Buyer account.
-- The order already contains a delivery-name/address snapshot, so it remains useful
-- after the authentication user and profile have been removed.
alter table public.buyer_orders
  drop constraint if exists buyer_orders_buyer_id_fkey;

alter table public.buyer_orders
  alter column buyer_id drop not null;

alter table public.buyer_orders
  add constraint buyer_orders_buyer_id_fkey
  foreign key (buyer_id)
  references public.profiles(id)
  on delete set null;

notify pgrst, 'reload schema';
