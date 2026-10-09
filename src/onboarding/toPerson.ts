import type { Person } from '../engine/pairing'
import type { Profile } from './types'

/** What the pairing engine needs from an onboarded profile. */
export const toPerson = (id: string, p: Profile): Person => ({ id, tags: p.you, wants: p.table })
