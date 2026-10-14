-- Chats: private messages between two people who have met. One conversation per pair, across all Fridays.

create table public.messages (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid        not null references auth.users (id) on delete cascade,
  recipient_id uuid        not null references auth.users (id) on delete cascade,
  body         text        not null check (char_length(btrim(body)) between 1 and 1000),
  created_at   timestamptz not null default now(),
  check (sender_id <> recipient_id)
);
create index messages_pair_idx on public.messages (sender_id, recipient_id, created_at desc);
create index messages_inbox_idx on public.messages (recipient_id, created_at desc);

-- When you last opened a conversation. Messages from them after this are unread.
create table public.chat_reads (
  user_id  uuid        not null references auth.users (id) on delete cascade,
  other_id uuid        not null references auth.users (id) on delete cascade,
  read_at  timestamptz not null default now(),
  primary key (user_id, other_id)
);

create table public.blocks (
  blocker_id uuid        not null references auth.users (id) on delete cascade,
  blocked_id uuid        not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid        not null references auth.users (id) on delete cascade,
  reported_id uuid        not null references auth.users (id) on delete cascade,
  reason      text        not null check (char_length(btrim(reason)) between 1 and 500),
  created_at  timestamptz not null default now()
);

-- Either person blocking the other ends new messages. SECURITY DEFINER so the policy can see the other side's blocks.
create or replace function public.is_blocked_between(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = other) or (b.blocker_id = other and b.blocked_id = auth.uid())
  )
$$;

alter table public.messages   enable row level security;
alter table public.chat_reads enable row level security;
alter table public.blocks     enable row level security;
alter table public.reports    enable row level security;

create policy "read my messages" on public.messages for select to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid());
create policy "send to someone I have met" on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.is_matched_with(recipient_id) and not public.is_blocked_between(recipient_id));

create policy "read my read marks"   on public.chat_reads for select to authenticated using (user_id = auth.uid());
create policy "create my read mark"  on public.chat_reads for insert to authenticated with check (user_id = auth.uid());
create policy "update my read mark"  on public.chat_reads for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "read my blocks"   on public.blocks for select to authenticated using (blocker_id = auth.uid());
create policy "block someone"    on public.blocks for insert to authenticated with check (blocker_id = auth.uid());
create policy "unblock someone"  on public.blocks for delete to authenticated using (blocker_id = auth.uid());

-- Reports can be written, never read back by the app. Only the team reads them.
create policy "file a report" on public.reports for insert to authenticated with check (reporter_id = auth.uid());

-- One row per person you have met: their name and photo, the latest message either way, and how many are unread.
create or replace view public.my_chats with (security_invoker = true) as
  select
    p.person_id, p.name, p.photo,
    lm.body as last_body, lm.created_at as last_at, coalesce(lm.sender_id = auth.uid(), false) as last_mine,
    (select count(*) from public.messages m
       where m.recipient_id = auth.uid() and m.sender_id = p.person_id
         and m.created_at > coalesce((select r.read_at from public.chat_reads r where r.user_id = auth.uid() and r.other_id = p.person_id), 'epoch'::timestamptz))::int as unread
  from (select distinct on (person_id) person_id, name, photo from public.my_people) p
  left join lateral (
    select m.body, m.created_at, m.sender_id from public.messages m
    where (m.sender_id = auth.uid() and m.recipient_id = p.person_id) or (m.sender_id = p.person_id and m.recipient_id = auth.uid())
    order by m.created_at desc limit 1
  ) lm on true
  order by lm.created_at desc nulls last, p.name;

grant select, insert on public.messages to authenticated;
grant select, insert, update on public.chat_reads to authenticated;
grant select, insert, delete on public.blocks to authenticated;
grant insert on public.reports to authenticated;
grant select on public.my_chats to authenticated;

-- Live updates in the app, where Supabase's realtime publication exists.
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
