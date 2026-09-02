-- Short-lived typing heartbeats for both participants in buyer/admin chat.
alter table public.buyer_conversations
  add column if not exists buyer_typing_at timestamptz,
  add column if not exists admin_typing_at timestamptz;

notify pgrst, 'reload schema';
