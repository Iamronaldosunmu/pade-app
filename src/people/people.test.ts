import { describe, expect, it } from 'vitest'
import { byRecent, contactUrl, fromViewRow, SAMPLE_PEOPLE } from './people'

describe('people', () => {
  it('links to each network', () => {
    expect(contactUrl('instagram', 'tolu')).toBe('https://instagram.com/tolu')
    expect(contactUrl('x', '@tolu_x')).toBe('https://x.com/tolu_x')
    expect(contactUrl('snapchat', 'tolu.s')).toBe('https://www.snapchat.com/add/tolu.s')
  })
  it('cannot be tricked by an odd handle', () => {
    expect(contactUrl('instagram', 'a/../b?x=1')).toBe('https://instagram.com/a%2F..%2Fb%3Fx%3D1')
  })
  it('lists the most recent Friday first', () => {
    const l = [...SAMPLE_PEOPLE].sort(byRecent)
    expect(l.map((x) => x.id)).toEqual(['s1', 's2', 's3'])
  })
  it('reads a row from the my_people view', () => {
    const p = fromViewRow({ person_id: 'u', name: 'A', age: 30, area: 'Island', work: 'w', takes: [], contact_kind: 'x', handle: 'a', photo: null, met_on: '2026-10-02T20:00:00Z' })
    expect(p).toMatchObject({ id: 'u', contactKind: 'x', photo: '' })
  })
})
