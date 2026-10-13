import { supabase } from '../lib/supabase'
import type { ContactKind } from '../onboarding/types'

export interface Person {
  id: string
  name: string
  age: number
  area: string
  work: string
  takes: string[]
  contactKind: ContactKind
  handle: string
  photo: string
  /** ISO time of the Friday you met. */
  metOn: string
}

const BASE: Record<ContactKind, string> = { instagram: 'https://instagram.com/', x: 'https://x.com/', snapchat: 'https://www.snapchat.com/add/' }
export const NETWORK: Record<ContactKind, string> = { instagram: 'Instagram', x: 'X', snapchat: 'Snapchat' }

/** Where tapping "Say hi" goes. Handles are stored without the @, but strip one anyway. */
export const contactUrl = (kind: ContactKind, handle: string) => BASE[kind] + encodeURIComponent(handle.replace(/^@/, '').trim())

interface Row {
  person_id: string; name: string; age: number; area: string; work: string; takes: string[]
  contact_kind: ContactKind; handle: string; photo: string | null; met_on: string
}

export const fromViewRow = (r: Row): Person => ({
  id: r.person_id, name: r.name, age: r.age, area: r.area, work: r.work, takes: r.takes ?? [],
  contactKind: r.contact_kind, handle: r.handle, photo: r.photo ?? '', metOn: r.met_on,
})

/** Newest first. */
export const byRecent = (a: Person, b: Person) => b.metOn.localeCompare(a.metOn)

export async function fetchPeople(): Promise<Person[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('my_people').select('*')
  if (error) throw error
  return (data as Row[]).map(fromViewRow).sort(byRecent)
}

/** Shown only in local mode, and labelled as samples, so the screen can be judged before anyone has met anyone. */
export const SAMPLE_PEOPLE: Person[] = [
  { id: 's1', name: 'Amaka', age: 28, area: 'Island', work: 'Product designer', takes: ['Jollof is better the next day.'], contactKind: 'instagram', handle: 'amaka.sample', photo: '', metOn: '2026-10-02T20:00:00Z' },
  { id: 's2', name: 'Tobi', age: 31, area: 'Mainland', work: 'Civil engineer', takes: ['Danfo drivers are the best navigators in Lagos.'], contactKind: 'x', handle: 'tobi_sample', photo: '', metOn: '2026-09-25T20:00:00Z' },
  { id: 's3', name: 'Zainab', age: 26, area: 'Island', work: 'Radio presenter', takes: ['Sunday is the real weekend.'], contactKind: 'snapchat', handle: 'zainab.sample', photo: '', metOn: '2026-09-18T20:00:00Z' },
]
