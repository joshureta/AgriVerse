-- Lightweight presence heartbeats for the buyer/admin chat.
alter table public.buyer_conversations
  add column if not exists buyer_last_seen_at timestamptz,
  add column if not exists admin_last_seen_at timestamptz;

notify pgrst, 'reload schema';
