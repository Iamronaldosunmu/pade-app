import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export interface Chat {
  personId: string
  name: string
  photo: string
  lastBody: string
  /** ISO time of the latest message, or '' when nobody has said anything yet. */
  lastAt: string
  lastMine: boolean
  unread: number
}

export interface Msg { id: string; mine: boolean; body: string; at: string; /** set only on messages you sent that have not landed yet */ status?: 'sending' | 'failed' }

export const MAX_LEN = 1000

interface ChatRow { person_id: string; name: string; photo: string | null; last_body: string | null; last_at: string | null; last_mine: boolean; unread: number }
interface MsgRow { id: string; sender_id: string; body: string; created_at: string }

export const fromChatRow = (r: ChatRow): Chat => ({
  personId: r.person_id, name: r.name, photo: r.photo ?? '', lastBody: r.last_body ?? '', lastAt: r.last_at ?? '', lastMine: r.last_mine, unread: r.unread,
})
export const fromMsgRow = (r: MsgRow, me: string): Msg => ({ id: r.id, mine: r.sender_id === me, body: r.body, at: r.created_at })

/** What goes in the inbox: today shows the time, this week the weekday, older the date. */
export function whenLabel(iso: string, now: Date = new Date()): string {
  if (!iso) return ''
  const d = new Date(iso)
  const tz = 'Africa/Lagos'
  const day = (x: Date) => x.toLocaleDateString('en-CA', { timeZone: tz })
  if (day(d) === day(now)) return d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', timeZone: tz })
  const days = (now.getTime() - d.getTime()) / 86400_000
  if (days < 6) return d.toLocaleDateString('en-GB', { weekday: 'short', timeZone: tz })
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: tz })
}

export const cleanMessage = (v: string) => v.trim().slice(0, MAX_LEN)

/* ---------- with a real account ---------- */

export async function fetchChats(): Promise<Chat[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('my_chats').select('*')
  if (error) throw error
  return (data as ChatRow[]).map(fromChatRow)
}

export async function fetchThread(me: string, other: string): Promise<Msg[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('messages').select('id,sender_id,body,created_at')
    .or(`and(sender_id.eq.${me},recipient_id.eq.${other}),and(sender_id.eq.${other},recipient_id.eq.${me})`)
    .order('created_at', { ascending: true }).limit(500)
  if (error) throw error
  return (data as MsgRow[]).map((r) => fromMsgRow(r, me))
}

export async function sendMessage(me: string, to: string, body: string): Promise<Msg> {
  if (!supabase) throw new Error('offline')
  const { data, error } = await supabase.from('messages').insert({ sender_id: me, recipient_id: to, body: cleanMessage(body) }).select('id,sender_id,body,created_at').single()
  if (error) throw error
  return fromMsgRow(data as MsgRow, me)
}

export async function markRead(me: string, other: string) {
  if (!supabase) return
  await supabase.from('chat_reads').upsert({ user_id: me, other_id: other, read_at: new Date().toISOString() })
}

export async function blockPerson(me: string, other: string) {
  if (!supabase) return
  const { error } = await supabase.from('blocks').upsert({ blocker_id: me, blocked_id: other })
  if (error) throw error
}

export async function reportPerson(me: string, other: string, reason: string) {
  if (!supabase) return
  const { error } = await supabase.from('reports').insert({ reporter_id: me, reported_id: other, reason: reason.trim().slice(0, 500) })
  if (error) throw error
}

/** Calls back for each new message addressed to you. Returns a function that stops listening. */
export function listenForMessages(me: string, onMessage: (m: Msg & { from: string }) => void): () => void {
  if (!supabase) return () => {}
  const client = supabase
  const ch: RealtimeChannel = client.channel(`inbox-${me}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${me}` }, (payload) => {
      const r = payload.new as MsgRow
      onMessage({ ...fromMsgRow(r, me), from: r.sender_id })
    })
    .subscribe()
  return () => { void client.removeChannel(ch) }
}

/* ---------- local preview: sample conversations that live only in memory ---------- */

const ago = (h: number) => new Date(Date.now() - h * 3600_000).toISOString()

export const SAMPLE_THREADS: Record<string, Msg[]> = {
  s1: [
    { id: 'a1', mine: false, body: 'Loved that you said jollof is better the next day. I am still thinking about it.', at: ago(30) },
    { id: 'a2', mine: true, body: 'Bold of you to hear that and not agree. Coffee this weekend?', at: ago(28) },
    { id: 'a3', mine: false, body: 'Saturday works. Somewhere in Yaba?', at: ago(2) },
  ],
  s2: [
    { id: 'b1', mine: true, body: 'The danfo navigators take. I need the full story.', at: ago(120) },
  ],
  s3: [],
}

export const SAMPLE_CHATS: Chat[] = [
  { personId: 's1', name: 'Amaka', photo: '', lastBody: 'Saturday works. Somewhere in Yaba?', lastAt: ago(2), lastMine: false, unread: 1 },
  { personId: 's2', name: 'Tobi', photo: '', lastBody: 'The danfo navigators take. I need the full story.', lastAt: ago(120), lastMine: true, unread: 0 },
  { personId: 's3', name: 'Zainab', photo: '', lastBody: '', lastAt: '', lastMine: false, unread: 0 },
]

/* ---------- laying out a conversation ---------- */

export type Row =
  | { kind: 'day'; key: string; label: string }
  | { kind: 'msg'; key: string; msg: Msg; first: boolean; last: boolean }

const lagosDay = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })

/** "Today", "Yesterday", or "Fri 2 Oct". */
export function dayLabel(iso: string, now: Date = new Date()): string {
  const d = new Date(iso)
  if (lagosDay(d) === lagosDay(now)) return 'Today'
  if (lagosDay(d) === lagosDay(new Date(now.getTime() - 86400_000))) return 'Yesterday'
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' }).replace(',', '')
}

const GROUP_GAP_MS = 5 * 60_000

/** Adds a day heading whenever the day changes, and marks the first and last bubble of each run from one person. */
export function layoutThread(msgs: Msg[], now: Date = new Date()): Row[] {
  const rows: Row[] = []
  msgs.forEach((m, i) => {
    const prev = msgs[i - 1]
    const next = msgs[i + 1]
    const newDay = !prev || lagosDay(new Date(prev.at)) !== lagosDay(new Date(m.at))
    if (newDay) rows.push({ kind: 'day', key: `d${m.id}`, label: dayLabel(m.at, now) })
    const joinsPrev = !!prev && !newDay && prev.mine === m.mine && new Date(m.at).getTime() - new Date(prev.at).getTime() < GROUP_GAP_MS
    const nextNewDay = !!next && lagosDay(new Date(next.at)) !== lagosDay(new Date(m.at))
    const joinsNext = !!next && !nextNewDay && next.mine === m.mine && new Date(next.at).getTime() - new Date(m.at).getTime() < GROUP_GAP_MS
    rows.push({ kind: 'msg', key: m.id, msg: m, first: !joinsPrev, last: !joinsNext })
  })
  return rows
}

/** Things to say when a conversation is empty. The first one uses their hot take when they have one. */
export function openers(take?: string): string[] {
  const list = ['How has your week been?', 'What did you think of our five minutes?', 'What are you up to this weekend?']
  return take ? [`Okay, I need the story behind “${take}”`, ...list] : list
}
