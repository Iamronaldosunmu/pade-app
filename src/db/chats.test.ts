import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'

const A = '00000000-0000-0000-0000-00000000000a'
const B = '00000000-0000-0000-0000-00000000000b'
const C = '00000000-0000-0000-0000-00000000000c'
const D = '00000000-0000-0000-0000-00000000000d'
const S1 = '10000000-0000-0000-0000-000000000001'

let db: PGlite
const as = async (user: string | null) => {
  await db.exec('reset role')
  if (user) {
    await db.exec(`select set_config('request.jwt.claim.sub', '${user}', false)`)
    await db.exec('set role authenticated')
  }
}
const send = (to: string, body: string, from?: string) =>
  db.query('insert into public.messages (sender_id, recipient_id, body) values (coalesce($3, auth.uid()), $1, $2)', [to, body, from ?? null])
const profile = (id: string, name: string) => `insert into public.profiles (id, name, age, area, contact_kind, handle) values ('${id}', '${name}', 27, 'Island', 'instagram', '${name.toLowerCase()}')`

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    create role authenticated; create role anon;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated;
  `)
  for (const f of ['0001_init', '0002_chats']) await db.exec(readFileSync(new URL(`../../supabase/migrations/${f}.sql`, import.meta.url), 'utf8'))
  await db.exec(`
    insert into auth.users values ('${A}'), ('${B}'), ('${C}'), ('${D}');
    ${profile(A, 'Ada')}; ${profile(B, 'Bayo')}; ${profile(C, 'Chi')}; ${profile(D, 'Dayo')};
    insert into public.sessions (id, starts_at) values ('${S1}', '2026-10-09T20:00:00Z');
    insert into public.matches (session_id, user_a, user_b) values ('${S1}', '${A}', '${B}'), ('${S1}', '${A}', '${D}');
  `)
})

describe('sending', () => {
  it('lets you message someone you have met', async () => {
    await as(A)
    await expect(send(B, 'Hi Bayo')).resolves.toBeTruthy()
  })
  it('refuses a stranger, an empty message, an over-long one, and pretending to be someone else', async () => {
    await as(A)
    await expect(send(C, 'hello')).rejects.toThrow()
    await expect(send(B, '   ')).rejects.toThrow()
    await expect(send(B, 'x'.repeat(1001))).rejects.toThrow()
    await expect(send(B, 'it is me', B)).rejects.toThrow()
  })
  it('refuses once either side has blocked the other', async () => {
    await as(A)
    await db.exec(`insert into public.blocks (blocker_id, blocked_id) values ('${A}', '${D}')`)
    await expect(send(D, 'hey')).rejects.toThrow()
    await as(D)
    await expect(send(A, 'hey back')).rejects.toThrow()
    await as(A)
    await db.exec(`delete from public.blocks where blocked_id = '${D}'`)
    await expect(send(D, 'sorry')).resolves.toBeTruthy()
  })
  it('refuses someone who is not signed in', async () => {
    await as(null)
    await db.exec('set role anon')
    await expect(db.query('select * from public.messages')).rejects.toThrow()
  })
})

describe('reading', () => {
  it('shows a conversation only to the two people in it', async () => {
    await as(B)
    expect((await db.query<{ body: string }>('select body from public.messages order by created_at')).rows.map((r) => r.body)).toEqual(['Hi Bayo'])
    await as(C)
    expect((await db.query('select * from public.messages')).rows).toHaveLength(0)
  })
  it('lists everyone you have met, newest conversation first, with unread counts', async () => {
    await as(B)
    const { rows } = await db.query<{ name: string; unread: number; last_body: string; last_mine: boolean }>('select name, unread, last_body, last_mine from public.my_chats')
    expect(rows).toEqual([{ name: 'Ada', unread: 1, last_body: 'Hi Bayo', last_mine: false }])
    await as(A)
    const mine = (await db.query<{ name: string }>('select name from public.my_chats')).rows.map((r) => r.name)
    expect(mine).toEqual(['Dayo', 'Bayo']) // Dayo's message is newest
  })
  it('clears the unread count once you open the conversation', async () => {
    await as(B)
    await db.exec(`insert into public.chat_reads (user_id, other_id) values ('${B}', '${A}') on conflict (user_id, other_id) do update set read_at = now()`)
    expect((await db.query<{ unread: number }>('select unread from public.my_chats')).rows[0]?.unread).toBe(0)
  })
  it('cannot mark a conversation read for someone else', async () => {
    await as(C)
    await expect(db.exec(`insert into public.chat_reads (user_id, other_id) values ('${A}', '${B}')`)).rejects.toThrow()
  })
})

describe('reports and blocks', () => {
  it('lets you file a report but never read reports back', async () => {
    await as(A)
    await db.exec(`insert into public.reports (reporter_id, reported_id, reason) values ('${A}', '${B}', 'rude')`)
    await expect(db.query('select * from public.reports')).rejects.toThrow()
    await expect(db.exec(`insert into public.reports (reporter_id, reported_id, reason) values ('${B}', '${C}', 'x')`)).rejects.toThrow()
  })
  it('keeps your block list private', async () => {
    await as(A)
    await db.exec(`insert into public.blocks (blocker_id, blocked_id) values ('${A}', '${C}')`)
    await as(C)
    expect((await db.query('select * from public.blocks')).rows).toHaveLength(0)
  })
})
