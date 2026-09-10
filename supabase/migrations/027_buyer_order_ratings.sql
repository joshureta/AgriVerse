-- One buyer rating per completed order. The review is tied to the purchase so
-- buyers can update their own feedback without creating duplicate reviews.
alter table public.buyer_orders
  add column if not exists buyer_rating smallint,
  add column if not exists buyer_rating_comment text,
  add column if not exists buyer_rated_at timestamptz;

alter table public.buyer_orders drop constraint if exists buyer_orders_buyer_rating_check;
alter table public.buyer_orders add constraint buyer_orders_buyer_rating_check
  check (buyer_rating is null or buyer_rating between 1 and 5);

alter table public.buyer_orders drop constraint if exists buyer_orders_buyer_rating_comment_length;
alter table public.buyer_orders add constraint buyer_orders_buyer_rating_comment_length
  check (buyer_rating_comment is null or char_length(buyer_rating_comment) <= 500);

notify pgrst, 'reload schema';
