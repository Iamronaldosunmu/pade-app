import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'

// Runs the real migration in an in-memory Postgres and checks who can read and write what.
// Supabase's auth schema is stubbed: auth.uid() reads the user id we set for the session.
const A = '00000000-0000-0000-0000-00000000000a'
const B = '00000000-0000-0000-0000-00000000000b'
const C = '00000000-0000-0000-0000-00000000000c'
const S1 = '10000000-0000-0000-0000-000000000001'

let db: PGlite

const as = async (user: string | null) => {
  await db.exec('reset role')
  if (user) {
    await db.exec(`select set_config('request.jwt.claim.sub', '${user}', false)`)
    await db.exec('set role authenticated')
  }
}
const profile = (id: string, name: string, handle: string) =>
  `insert into public.profiles (id, name, age, area, contact_kind, handle) values ('${id}', '${name}', 27, 'Island', 'instagram', '${handle}')`

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    create role authenticated; create role anon;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated;
  `)
  await db.exec(readFileSync(new URL('../../supabase/migrations/0001_init.sql', import.meta.url), 'utf8'))
  await db.exec(readFileSync(new URL('../../supabase/migrations/0002_chats.sql', import.meta.url), 'utf8'))
  await db.exec(`
    insert into auth.users values ('${A}'), ('${B}'), ('${C}');
    ${profile(A, 'Ada', 'ada.k')}; ${profile(B, 'Bayo', 'bayo_x')}; ${profile(C, 'Chi', 'chi.c')};
    insert into public.sessions (id, starts_at) values ('${S1}', '2026-10-09T20:00:00Z');
    insert into public.matches (session_id, user_a, user_b) values ('${S1}', '${A}', '${B}');
  `)
})

describe('who can read profiles', () => {
  it('lets you see yourself and the people you matched with, but nobody else', async () => {
    await as(A)
    expect((await db.query<{ name: string }>('select name from public.profiles order by name')).rows.map((r) => r.name)).toEqual(['Ada', 'Bayo'])
    await as(B)
    expect((await db.query<{ name: string }>('select name from public.profiles order by name')).rows.map((r) => r.name)).toEqual(['Ada', 'Bayo'])
  })
  it('keeps a stranger out of everyone else’s contact details', async () => {
    await as(C)
    expect((await db.query<{ name: string }>('select name from public.profiles')).rows.map((r) => r.name)).toEqual(['Chi'])
  })
  it('shows nothing to someone who is not signed in', async () => {
    await as(null)
    await db.exec('set role anon')
    await expect(db.query('select * from public.profiles')).rejects.toThrow()
  })
})

describe('the people list', () => {
  it('gives each matched person the other’s details and the day they met', async () => {
    await as(A)
    const { rows } = await db.query<{ name: string; handle: string; met_on: Date }>('select name, handle, met_on from public.my_people')
    expect(rows).toHaveLength(1)
    expect(rows[0]?.name).toBe('Bayo')
    expect(rows[0]?.handle).toBe('bayo_x')
    await as(B)
    expect((await db.query<{ name: string }>('select name from public.my_people')).rows.map((r) => r.name)).toEqual(['Ada'])
  })
  it('is empty for someone with no matches', async () => {
    await as(C)
    expect((await db.query('select * from public.my_people')).rows).toHaveLength(0)
  })
})

describe('who can write', () => {
  it('lets you change only your own profile', async () => {
    await as(C)
    const mine = await db.query(`update public.profiles set work = 'Doctor' where id = '${C}'`)
    expect(mine.affectedRows).toBe(1)
    const theirs = await db.query(`update public.profiles set handle = 'hacked' where id = '${A}'`)
    expect(theirs.affectedRows).toBe(0)
    await as(A)
    expect((await db.query<{ handle: string }>(`select handle from public.profiles where id = '${A}'`)).rows[0]?.handle).toBe('ada.k')
  })
  it('refuses a profile created for someone else', async () => {
    await as(C)
    await expect(db.exec(profile('00000000-0000-0000-0000-0000000000dd', 'Fake', 'fake'))).rejects.toThrow()
  })
  it('does not let the app create matches or sessions', async () => {
    await as(C)
    await expect(db.exec(`insert into public.matches (session_id, user_a, user_b) values ('${S1}', '${A}', '${C}')`)).rejects.toThrow()
    await expect(db.exec(`insert into public.sessions (starts_at) values (now())`)).rejects.toThrow()
  })
  it('hides other people’s matches', async () => {
    await as(C)
    expect((await db.query('select * from public.matches')).rows).toHaveLength(0)
    await as(A)
    expect((await db.query('select * from public.matches')).rows).toHaveLength(1)
  })
})

describe('RSVPs', () => {
  it('are private to each person', async () => {
    await as(A)
    await db.exec(`insert into public.rsvps (user_id, session_id, going) values ('${A}', '${S1}', true)`)
    await as(B)
    expect((await db.query('select * from public.rsvps')).rows).toHaveLength(0)
    await expect(db.exec(`insert into public.rsvps (user_id, session_id) values ('${A}', '${S1}')`)).rejects.toThrow()
  })
})

describe('creating a Friday session', () => {
  it('works for a real Friday 9pm Lagos and returns the same id each time', async () => {
    await as(A)
    const friday = new Date(); friday.setUTCDate(friday.getUTCDate() + ((5 - friday.getUTCDay() + 7) % 7 || 7)); friday.setUTCHours(20, 0, 0, 0)
    const a = await db.query<{ ensure_session: string }>('select public.ensure_session($1::timestamptz) as ensure_session', [friday.toISOString()])
    const b = await db.query<{ ensure_session: string }>('select public.ensure_session($1::timestamptz) as ensure_session', [friday.toISOString()])
    expect(a.rows[0]?.ensure_session).toBe(b.rows[0]?.ensure_session)
  })
  it('refuses other days, other hours, far-off dates and signed-out callers', async () => {
    await as(A)
    const bad = (t: string) => expect(db.query('select public.ensure_session($1::timestamptz)', [t])).rejects.toThrow()
    await bad('2026-10-10T20:00:00Z') // a Saturday
    await bad('2026-10-09T10:00:00Z') // a Friday, wrong hour
    await bad('2030-01-04T20:00:00Z') // a Friday, too far away
    await as(null)
    await db.exec('set role anon')
    await expect(db.query('select public.ensure_session(now())')).rejects.toThrow()
  })
})

describe('data rules', () => {
  it('rejects under-18s, bad areas and too many takes', async () => {
    await as(null)
    const bad = (sql: string) => expect(db.exec(sql)).rejects.toThrow()
    await db.exec(`insert into auth.users values ('00000000-0000-0000-0000-0000000000e1')`)
    await bad(`insert into public.profiles (id, name, age, area, contact_kind, handle) values ('00000000-0000-0000-0000-0000000000e1', 'Kid', 16, 'Island', 'x', 'kid')`)
    await bad(`insert into public.profiles (id, name, age, area, contact_kind, handle) values ('00000000-0000-0000-0000-0000000000e1', 'Ok', 30, 'Abuja', 'x', 'ok')`)
    await bad(`insert into public.profiles (id, name, age, area, contact_kind, handle, takes) values ('00000000-0000-0000-0000-0000000000e1', 'Ok', 30, 'Island', 'x', 'ok', '{a,b,c}')`)
  })
})
