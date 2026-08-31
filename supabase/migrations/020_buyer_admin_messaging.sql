-- Buyer <-> Admin messaging. One conversation per buyer; any admin account can view and reply.
create table if not exists public.buyer_conversations (
  id bigint generated always as identity primary key,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  unique (buyer_id)
);

create table if not exists public.buyer_messages (
  id bigint generated always as identity primary key,
  conversation_id bigint not null references public.buyer_conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  sender_role text not null check (sender_role in ('buyer', 'admin')),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists buyer_messages_conversation_id_idx on public.buyer_messages(conversation_id, created_at);

create or replace function public.touch_buyer_conversation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.buyer_conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists buyer_messages_touch_conversation on public.buyer_messages;
create trigger buyer_messages_touch_conversation
  after insert on public.buyer_messages
  for each row execute procedure public.touch_buyer_conversation();

alter table public.buyer_conversations enable row level security;
alter table public.buyer_messages enable row level security;

drop policy if exists buyer_conversations_participant_select on public.buyer_conversations;
create policy buyer_conversations_participant_select on public.buyer_conversations
  for select
  using (
    buyer_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists buyer_messages_participant_select on public.buyer_messages;
create policy buyer_messages_participant_select on public.buyer_messages
  for select
  using (
    exists (
      select 1 from public.buyer_conversations c
      where c.id = conversation_id
        and (
          c.buyer_id = auth.uid()
          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
        )
    )
  );

drop policy if exists buyer_messages_participant_insert on public.buyer_messages;
create policy buyer_messages_participant_insert on public.buyer_messages
  for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.buyer_conversations c
      where c.id = conversation_id
        and (
          c.buyer_id = auth.uid()
          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
        )
    )
  );

notify pgrst, 'reload schema';
