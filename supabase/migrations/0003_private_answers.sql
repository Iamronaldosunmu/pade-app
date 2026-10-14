-- Private answers used only to decide who meets whom. They live apart from profiles on purpose: the profiles policy
-- shows a whole row to the people you have met, and these must never be visible to anyone but you (and the server).
create table public.private_answers (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  intent     text check (intent in ('date', 'friends', 'either')),
  topics     text[] not null default '{}' check (cardinality(topics) <= 4),
  pace       text check (pace in ('quick', 'warm', 'listen')),
  updated_at timestamptz not null default now()
);
create trigger private_answers_touch before update on public.private_answers for each row execute function public.touch_updated_at();

alter table public.private_answers enable row level security;
create policy "read my answers"   on public.private_answers for select to authenticated using (user_id = auth.uid());
create policy "create my answers" on public.private_answers for insert to authenticated with check (user_id = auth.uid());
create policy "update my answers" on public.private_answers for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update on public.private_answers to authenticated;
