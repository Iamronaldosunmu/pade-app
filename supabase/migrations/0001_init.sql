-- Pàdé: accounts, sessions, RSVPs and matches.
-- Privacy rule that everything below protects: a person's contact handle (and photo) is only ever readable by
-- themselves and by people they have been matched with. Nobody else can read another person's profile row.

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  name         text        not null check (char_length(name) between 1 and 40),
  age          int         not null check (age >= 18 and age <= 99),
  area         text        not null check (area in ('Island', 'Mainland')),
  work         text        not null default '' check (char_length(work) <= 60),
  takes        text[]      not null default '{}' check (cardinality(takes) <= 2),
  contact_kind text        not null check (contact_kind in ('instagram', 'x', 'snapchat')),
  handle       text        not null check (char_length(handle) between 1 and 30),
  photo        text        not null default '' check (char_length(photo) <= 150000),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- One row per Friday session. Start times are stored in UTC (9pm Lagos is 20:00 UTC).
create table public.sessions (
  id         uuid primary key default gen_random_uuid(),
  starts_at  timestamptz not null unique,
  created_at timestamptz not null default now()
);

create table public.rsvps (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  session_id uuid        not null references public.sessions (id) on delete cascade,
  going      boolean     not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, session_id)
);

-- Two people who both chose to keep talking after a five-minute call.
-- user_a < user_b always, so a pair is stored once per session. Only the server (service role) writes these.
create table public.matches (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid        not null references public.sessions (id) on delete cascade,
  user_a     uuid        not null references auth.users (id) on delete cascade,
  user_b     uuid        not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (session_id, user_a, user_b)
);
create index matches_user_a_idx on public.matches (user_a);
create index matches_user_b_idx on public.matches (user_b);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger rsvps_touch    before update on public.rsvps    for each row execute function public.touch_updated_at();

-- Has this person been matched with that one (in any session)? SECURITY DEFINER so the policy below can read matches.
create or replace function public.is_matched_with(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.matches m
    where (m.user_a = auth.uid() and m.user_b = other) or (m.user_b = auth.uid() and m.user_a = other)
  )
$$;

alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.rsvps    enable row level security;
alter table public.matches  enable row level security;

-- profiles: you, and the people you were matched with. Only you can change yours.
create policy "read own or matched profile" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_matched_with(id));
create policy "create own profile" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "delete own profile" on public.profiles for delete to authenticated using (id = auth.uid());

-- sessions: everyone signed in can see them; only the server creates them.
create policy "read sessions" on public.sessions for select to authenticated using (true);

-- rsvps: strictly your own.
create policy "read own rsvps"   on public.rsvps for select to authenticated using (user_id = auth.uid());
create policy "create own rsvp"  on public.rsvps for insert to authenticated with check (user_id = auth.uid());
create policy "update own rsvp"  on public.rsvps for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- matches: you can read the ones you are in. Nobody can write them from the app.
create policy "read own matches" on public.matches for select to authenticated
  using (user_a = auth.uid() or user_b = auth.uid());

-- The people you were matched with, newest first, with the fields the People screen shows. Runs as the caller, so the
-- profiles policy above still decides who is visible.
create or replace view public.my_people with (security_invoker = true) as
  select
    m.id as match_id,
    s.starts_at as met_on,
    p.id as person_id, p.name, p.age, p.area, p.work, p.takes, p.contact_kind, p.handle, p.photo
  from public.matches m
  join public.sessions s on s.id = m.session_id
  join public.profiles p on p.id = case when m.user_a = auth.uid() then m.user_b else m.user_a end
  order by s.starts_at desc;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select on public.sessions to authenticated;
grant select, insert, update on public.rsvps to authenticated;
grant select on public.matches to authenticated;
grant select on public.my_people to authenticated;

-- The app cannot write to sessions directly. This is the one door: it only creates a genuine Friday 9pm Lagos
-- session (20:00 UTC) within the next 60 days, and returns its id whether it was new or already there.
create or replace function public.ensure_session(t timestamptz) returns uuid
language plpgsql security definer set search_path = public as $$
declare sid uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if extract(isodow from t at time zone 'UTC') <> 5 or (t at time zone 'UTC')::time <> time '20:00' then
    raise exception 'sessions run on Fridays at 9pm Lagos time';
  end if;
  if t < now() - interval '1 day' or t > now() + interval '60 days' then
    raise exception 'that Friday is out of range';
  end if;
  insert into public.sessions (starts_at) values (t) on conflict (starts_at) do nothing;
  select id into sid from public.sessions where starts_at = t;
  return sid;
end $$;
revoke all on function public.ensure_session(timestamptz) from public;
grant execute on function public.ensure_session(timestamptz) to authenticated;
