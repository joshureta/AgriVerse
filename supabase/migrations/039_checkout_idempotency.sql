-- Keep a completed checkout tied to one request key, including when the HTTP response is lost.
create table if not exists public.buyer_checkout_requests (
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  idempotency_key uuid not null,
  payload_hash text not null,
  order_id bigint not null unique references public.buyer_orders(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (buyer_id, idempotency_key)
);

alter table public.buyer_checkout_requests enable row level security;
revoke all on table public.buyer_checkout_requests from anon, authenticated;
grant all on table public.buyer_checkout_requests to service_role;

create or replace function public.place_buyer_order_idempotent(
  p_buyer_id uuid,
  p_delivery_method text,
  p_payment_method text,
  p_customer_note text,
  p_items jsonb,
  p_delivery_address jsonb,
  p_idempotency_key uuid,
  p_payload_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing record;
  v_order jsonb;
begin
  if p_idempotency_key is null or p_payload_hash is null then
    raise exception 'A checkout request key is required';
  end if;

  -- Serialize attempts for the same buyer and key before either one can allocate stock.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext(p_buyer_id::text),
    pg_catalog.hashtext(p_idempotency_key::text)
  );

  select r.payload_hash, o.id, o.order_number, o.subtotal, o.shipping_fee,
         o.total_amount, o.order_status
    into v_existing
    from public.buyer_checkout_requests r
    join public.buyer_orders o on o.id = r.order_id
    where r.buyer_id = p_buyer_id and r.idempotency_key = p_idempotency_key;

  if found then
    if v_existing.payload_hash <> p_payload_hash then
      raise exception 'Checkout request has changed; start a new order';
    end if;
    return pg_catalog.jsonb_build_object(
      'id', v_existing.id,
      'order_number', v_existing.order_number,
      'subtotal', v_existing.subtotal,
      'shipping_fee', v_existing.shipping_fee,
      'total_amount', v_existing.total_amount,
      'order_status', v_existing.order_status
    );
  end if;

  v_order := public.place_buyer_order(
    p_buyer_id, p_delivery_method, p_payment_method, p_customer_note,
    p_items, p_delivery_address
  );

  insert into public.buyer_checkout_requests (
    buyer_id, idempotency_key, payload_hash, order_id
  ) values (
    p_buyer_id, p_idempotency_key, p_payload_hash, (v_order ->> 'id')::bigint
  );

  return v_order;
end;
$$;

revoke all on function public.place_buyer_order_idempotent(uuid, text, text, text, jsonb, jsonb, uuid, text)
  from public, anon, authenticated;
grant execute on function public.place_buyer_order_idempotent(uuid, text, text, text, jsonb, jsonb, uuid, text)
  to service_role;
notify pgrst, 'reload schema';
