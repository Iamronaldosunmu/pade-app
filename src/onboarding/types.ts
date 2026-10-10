import type { Provider } from './auth'

export type ContactKind = 'instagram' | 'x' | 'snapchat'

export interface Profile {
  provider: Provider | null
  name: string
  age: number | null
  area: string
  /** What they do, in their own words. */
  work: string
  /** What the person says about themselves. */
  you: string[]
  /** What they would like at their table. */
  table: string[]
  takes: string[]
  contactKind: ContactKind
  /** Handle on that network, without the @. Shared only when both people want to keep talking. */
  handle: string
  hasPhoto: boolean
}

export const emptyProfile: Profile = {
  provider: null,
  name: '',
  age: null,
  area: '',
  work: '',
  you: [],
  table: [],
  takes: [],
  contactKind: 'instagram',
  handle: '',
  hasPhoto: false,
}
