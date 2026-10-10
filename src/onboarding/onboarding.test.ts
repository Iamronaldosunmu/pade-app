import { describe, expect, it } from 'vitest'
import { cleanHandle, isAdult, normalizePhone, parseAge, validHandle, validHandleFor, validName } from './validate'
import { nextSession, sessionIcs, sessionLabel } from './session-time'
import { toPerson } from './toPerson'
import { compatibility } from '../engine/pairing'
import { emptyProfile } from './types'

describe('phone', () => {
  it.each(['08012345678', '0801 234 5678', '+2348012345678', '2348012345678', '801-234-5678'])('accepts %s', (v) => {
    expect(normalizePhone(v)).toBe('+2348012345678')
  })
  it.each(['', '12345', '0701234567', '+14155550123', '06012345678', '080123456789'])('rejects %s', (v) => {
    expect(normalizePhone(v)).toBeNull()
  })
})

describe('age and names', () => {
  it('only lets adults in', () => {
    expect(isAdult(parseAge('17'))).toBe(false)
    expect(isAdult(parseAge('18'))).toBe(true)
    expect(isAdult(parseAge('abc'))).toBe(false)
    expect(isAdult(null)).toBe(false)
  })
  it('checks names and handles', () => {
    expect(validName('  Tomi  ')).toBe(true)
    expect(validName('   ')).toBe(false)
    expect(validName('x'.repeat(25))).toBe(false)
    expect(cleanHandle(' @tomi.designs ')).toBe('tomi.designs')
    expect(validHandle('tomi.designs')).toBe(true)
    expect(validHandle('no spaces')).toBe(false)
    expect(validHandleFor('x', 'a'.repeat(16))).toBe(false)
    expect(validHandleFor('x', 'tomi_k')).toBe(true)
    expect(validHandleFor('snapchat', 'ab')).toBe(false)
    expect(validHandleFor('snapchat', 'tomi-k')).toBe(true)
  })
})

describe('next session', () => {
  it('is tonight on a Friday afternoon in Lagos', () => {
    const now = new Date('2026-10-09T14:00:00Z') // Friday 3pm Lagos
    expect(nextSession(now).toISOString()).toBe('2026-10-09T20:00:00.000Z')
  })
  it('is next week once 9pm has passed', () => {
    const now = new Date('2026-10-09T20:30:00Z')
    expect(nextSession(now).toISOString()).toBe('2026-10-16T20:00:00.000Z')
  })
  it('finds the coming Friday from midweek', () => {
    expect(nextSession(new Date('2026-10-07T09:00:00Z')).toISOString()).toBe('2026-10-09T20:00:00.000Z')
  })
  it('labels it in Lagos time and writes a calendar file', () => {
    const s = nextSession(new Date('2026-10-07T09:00:00Z'))
    expect(sessionLabel(s)).toBe('Friday 9 October, 9pm')
    const ics = sessionIcs(s)
    expect(ics).toContain('DTSTART:20261009T200000Z')
    expect(ics).toContain('DTEND:20261009T210000Z')
  })
})

describe('profile to pairing', () => {
  it('feeds what people say and what they want into compatibility', () => {
    const a = toPerson('a', { ...emptyProfile, you: ['Funny'], table: ['Creative'] })
    const b = toPerson('b', { ...emptyProfile, you: ['Creative'], table: ['Funny'] })
    expect(compatibility(a, b)).toBe(1)
  })
})
