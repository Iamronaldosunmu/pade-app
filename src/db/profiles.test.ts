import { describe, expect, it } from 'vitest'
import { fromRow, savable, toRow } from './profiles'
import { emptyProfile, type Profile } from '../onboarding/types'

const full: Profile = { ...emptyProfile, provider: 'google', name: ' Tolu ', age: 27, area: 'Island', work: 'Designer ', takes: ['a', 'b', 'c'], contactKind: 'x', handle: 'tolu', photo: 'data:image/jpeg;base64,AAA', hasPhoto: true }

describe('profile rows', () => {
  it('maps to a row the database accepts: trimmed, at most two takes, empty photo as null', () => {
    const r = toRow('u1', full)
    expect(r).toMatchObject({ id: 'u1', name: 'Tolu', work: 'Designer', takes: ['a', 'b'], contact_kind: 'x', handle: 'tolu' })
    expect(toRow('u1', { ...full, photo: '' }).photo).toBeNull()
  })
  it('round-trips', () => {
    const back = fromRow({ ...toRow('u1', full), photo: full.photo } as never, 'google')
    expect(back).toMatchObject({ name: 'Tolu', age: 27, area: 'Island', hasPhoto: true, provider: 'google' })
  })
  it('is only savable once the required answers are in', () => {
    expect(savable(full)).toBe(true)
    expect(savable({ ...full, age: 17 })).toBe(false)
    expect(savable({ ...full, area: '' })).toBe(false)
    expect(savable({ ...full, handle: '' })).toBe(false)
    expect(savable(emptyProfile)).toBe(false)
  })
})
