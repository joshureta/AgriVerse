-- Enforce the pineapple subtotal minimum at order creation, using the server-calculated price.
-- A trigger on INSERT keeps older orders below the new minimum editable.
create or replace function public.enforce_minimum_pineapple_order()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.subtotal < 1500 then
    raise exception 'The shopping cart subtotal must be at least PHP 1,500 before shipping';
  end if;
  return new;
end;
$$;

drop trigger if exists buyer_orders_minimum_pineapple_order on public.buyer_orders;
create trigger buyer_orders_minimum_pineapple_order
before insert on public.buyer_orders
for each row execute function public.enforce_minimum_pineapple_order();
