export type ContactKind = 'whatsapp' | 'instagram'

export interface Profile {
  /** E.164, e.g. +2348012345678 */
  phone: string
  name: string
  age: number | null
  area: string
  /** What the person says about themselves. */
  you: string[]
  /** What they would like at their table. */
  table: string[]
  takes: string[]
  contactKind: ContactKind
  /** Instagram handle without the @, when contactKind is instagram. */
  instagram: string
  hasPhoto: boolean
}

export const emptyProfile: Profile = {
  phone: '',
  name: '',
  age: null,
  area: '',
  you: [],
  table: [],
  takes: [],
  contactKind: 'whatsapp',
  instagram: '',
  hasPhoto: false,
}
