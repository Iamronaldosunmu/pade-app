import { supabase } from '../lib/supabase'
import { emptyProfile, type ContactKind, type Profile } from '../onboarding/types'
import type { Provider } from '../onboarding/auth'

/** The shape of a row in public.profiles (see supabase/migrations/0001_init.sql). */
export interface ProfileRow {
  id: string
  name: string
  age: number
  area: string
  work: string
  takes: string[]
  contact_kind: ContactKind
  handle: string
  photo: string | null
}

export const toRow = (id: string, p: Profile): Omit<ProfileRow, 'photo'> & { photo: string | null } => ({
  id,
  name: p.name.trim(),
  age: p.age ?? 0,
  area: p.area,
  work: p.work.trim(),
  takes: p.takes.slice(0, 2),
  contact_kind: p.contactKind,
  handle: p.handle,
  photo: p.photo || null,
})

export const fromRow = (r: ProfileRow, provider: Provider): Profile => ({
  ...emptyProfile,
  provider,
  name: r.name,
  age: r.age,
  area: r.area,
  work: r.work,
  takes: r.takes ?? [],
  contactKind: r.contact_kind,
  handle: r.handle,
  photo: r.photo ?? '',
  hasPhoto: !!r.photo,
})

/** Private answers, stored apart from the profile so nobody you meet can read them. */
export const toAnswersRow = (id: string, p: Profile) => ({
  user_id: id, intent: p.intent || null, topics: p.topics.slice(0, 4), pace: p.pace || null,
})
interface AnswersRow { intent: Profile['intent'] | null; topics: string[] | null; pace: Profile['pace'] | null }
export const withAnswers = (p: Profile, a: AnswersRow | null): Profile => (a ? { ...p, intent: a.intent ?? '', topics: a.topics ?? [], pace: a.pace ?? '' } : p)

/** Enough filled in that the database will accept it. Until then nothing is sent. */
export const savable = (p: Profile) =>
  p.name.trim().length > 0 && (p.age ?? 0) >= 18 && (p.area === 'Island' || p.area === 'Mainland') && p.handle.length > 0

export async function fetchProfile(userId: string, provider: Provider): Promise<Profile | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  if (!data) return null
  const { data: a } = await supabase.from('private_answers').select('intent,topics,pace').eq('user_id', userId).maybeSingle()
  return withAnswers(fromRow(data as ProfileRow, provider), a as AnswersRow | null)
}

export async function saveProfile(userId: string, p: Profile) {
  if (!supabase || !savable(p)) return
  const { error } = await supabase.from('profiles').upsert(toRow(userId, p))
  if (error) throw error
  if (p.intent || p.topics.length || p.pace) {
    const { error: e2 } = await supabase.from('private_answers').upsert(toAnswersRow(userId, p))
    if (e2) throw e2
  }
}

/** RSVP for one Friday. Creates the session row on first use through the one allowed door. */
export async function saveGoing(userId: string, start: Date, going: boolean) {
  if (!supabase) return
  const { data: sid, error } = await supabase.rpc('ensure_session', { t: start.toISOString() })
  if (error) throw error
  const { error: e2 } = await supabase.from('rsvps').upsert({ user_id: userId, session_id: sid, going })
  if (e2) throw e2
}

export async function fetchGoing(userId: string, start: Date): Promise<boolean | null> {
  if (!supabase) return null
  const { data: s } = await supabase.from('sessions').select('id').eq('starts_at', start.toISOString()).maybeSingle()
  if (!s) return null
  const { data } = await supabase.from('rsvps').select('going').eq('user_id', userId).eq('session_id', s.id).maybeSingle()
  return data ? (data.going as boolean) : null
}
