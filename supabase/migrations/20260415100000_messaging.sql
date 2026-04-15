-- ═══════════════════════════════════════════════════
-- Messaging schema: conversations + messages
-- ═══════════════════════════════════════════════════

create table if not exists public.conversations (
  id            uuid primary key default gen_random_uuid(),
  participant_a uuid not null references auth.users(id) on delete cascade,
  participant_b uuid not null references auth.users(id) on delete cascade,
  last_message_at timestamptz,
  created_at    timestamptz not null default now(),

  constraint conversations_pair_unique unique (participant_a, participant_b),
  constraint conversations_different_users check (participant_a <> participant_b)
);

create index if not exists conversations_participant_a_idx
  on public.conversations (participant_a);
create index if not exists conversations_participant_b_idx
  on public.conversations (participant_b);

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references auth.users(id) on delete cascade,
  content         text not null check (char_length(content) > 0 and char_length(content) <= 5000),
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists messages_conversation_id_idx
  on public.messages (conversation_id, created_at desc);
create index if not exists messages_sender_id_idx
  on public.messages (sender_id);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "Users can read their own conversations"
  on public.conversations for select
  using (auth.uid() = participant_a or auth.uid() = participant_b);

create policy "Users can insert conversations they participate in"
  on public.conversations for insert
  with check (auth.uid() = participant_a or auth.uid() = participant_b);

create policy "Users can update their own conversations"
  on public.conversations for update
  using (auth.uid() = participant_a or auth.uid() = participant_b);

create policy "Users can read messages in their conversations"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    )
  );

create policy "Users can insert messages in their conversations"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    )
  );

create policy "Users can update messages they received (mark as read)"
  on public.messages for update
  using (
    sender_id <> auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    )
  );
