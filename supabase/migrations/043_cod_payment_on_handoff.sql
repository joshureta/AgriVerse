-- Cash is collected at delivery or pickup handoff. Keep payment status in sync
-- regardless of which order-completion path performs the status update.
create or replace function public.mark_cod_paid_on_handoff()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.payment_method = 'cash'
     and new.order_status in ('delivered', 'completed')
     and new.payment_status = 'unpaid' then
    new.payment_status := 'paid';
  end if;
  return new;
end;
$$;

drop trigger if exists mark_cod_paid_on_handoff on public.buyer_orders;
create trigger mark_cod_paid_on_handoff
before insert or update of order_status on public.buyer_orders
for each row execute function public.mark_cod_paid_on_handoff();

-- Reconcile orders completed before this trigger was installed, including
-- cash pickups created after the earlier delivery-only backfill.
update public.buyer_orders
set payment_status = 'paid'
where payment_method = 'cash'
  and payment_status = 'unpaid'
  and order_status in ('delivered', 'completed');
