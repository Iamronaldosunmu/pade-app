import { describe, expect, it } from 'vitest'
import { buildSchedule, compatibility, type Person } from './pairing'
import {
  ROUND_SECONDS, SAFE_SECONDS, WINDOWS_END, WINDOW_GAP, WINDOW_MAX, WINDOW_MIN,
  afterFiveMinutes, openWindowAt, planWindows, resolveRound, unlocksContact,
} from './timeline'

const person = (id: string, tags: string[] = [], wants: string[] = []): Person => ({ id, tags, wants })

describe('windows', () => {
  it('always respects the rules, for many seeds', () => {
    for (let seed = 1; seed <= 500; seed++) {
      const w = planWindows(seed)
      expect(w).toHaveLength(3)
      expect(w[0].start).toBeGreaterThanOrEqual(SAFE_SECONDS)
      expect(w[2].end).toBeLessThanOrEqual(WINDOWS_END + 1e-9)
      w.forEach((x) => {
        expect(x.end - x.start).toBeGreaterThanOrEqual(WINDOW_MIN - 1e-9)
        expect(x.end - x.start).toBeLessThanOrEqual(WINDOW_MAX + 1e-9)
      })
      expect(w[1].start - w[0].end).toBeGreaterThanOrEqual(WINDOW_GAP - 1e-9)
      expect(w[2].start - w[1].end).toBeGreaterThanOrEqual(WINDOW_GAP - 1e-9)
    }
  })
  it('is deterministic per seed and differs across seeds', () => {
    expect(planWindows(7)).toEqual(planWindows(7))
    expect(planWindows(7)).not.toEqual(planWindows(8))
  })
  it('is closed during the first 1:20', () => {
    const w = planWindows(3)
    for (let t = 0; t < SAFE_SECONDS; t += 1) expect(openWindowAt(w, t)).toBeNull()
  })
})

describe('resolving a round', () => {
  const w = planWindows(5)
  const mid = (w[0].start + w[0].end) / 2
  it('counts a buzz inside a window', () => {
    expect(resolveRound(w, [{ by: 'a', at: mid }])).toEqual({ kind: 'buzzed', by: 'a', at: mid })
  })
  it('ignores a buzz outside any window', () => {
    expect(resolveRound(w, [{ by: 'a', at: 10 }])).toEqual({ kind: 'completed' })
  })
  it('takes the earliest valid buzz', () => {
    const r = resolveRound(w, [{ by: 'b', at: mid + 2 }, { by: 'a', at: mid }])
    expect(r).toMatchObject({ kind: 'buzzed', by: 'a' })
  })
  it('unlocks contact only on a completed round', () => {
    expect(unlocksContact({ kind: 'completed' })).toBe(true)
    expect(unlocksContact({ kind: 'buzzed', by: 'a', at: mid })).toBe(false)
  })
  it('keeps talking only if both agree', () => {
    expect(afterFiveMinutes('keep', 'keep')).toBe('keep')
    expect(afterFiveMinutes('keep', 'wrap')).toBe('wrap')
    expect(ROUND_SECONDS).toBe(300)
  })
})

describe('pairing', () => {
  const ids = (n: number) => Array.from({ length: n }, (_, i) => person(`p${i}`))
  it('never repeats a pair and uses everyone each round (even room)', () => {
    const rounds = buildSchedule(ids(12), 8, 4)
    const seen = new Set<string>()
    for (const r of rounds) {
      const inRound = new Set<string>()
      for (const [a, b] of r.pairs) {
        const key = [a, b].sort().join('|')
        expect(seen.has(key)).toBe(false)
        seen.add(key)
        inRound.add(a); inRound.add(b)
      }
      expect(inRound.size).toBe(12)
      expect(r.bye).toBeNull()
    }
    expect(rounds).toHaveLength(8)
  })
  it('gives one bye per round in an odd room, and nobody sits out twice in a row early on', () => {
    const rounds = buildSchedule(ids(7), 6, 2)
    const byes = rounds.map((r) => r.bye)
    expect(byes.every(Boolean)).toBe(true)
    expect(new Set(byes).size).toBe(byes.length)
  })
  it('caps rounds at what is possible', () => {
    expect(buildSchedule(ids(4), 10)).toHaveLength(3)
  })
  it('puts people with matching wishes together earlier', () => {
    const people = [
      person('a', ['x'], ['y']), person('b', ['y'], ['x']),
      person('c', ['z'], ['w']), person('d', ['w'], ['z']),
      person('e', ['q'], ['r']), person('f', ['r'], ['q']),
    ]
    const first = buildSchedule(people, 1, 9)[0]
    const byId = new Map(people.map((p) => [p.id, p]))
    const total = first.pairs.reduce((s, [a, b]) => s + compatibility(byId.get(a)!, byId.get(b)!), 0)
    expect(total).toBe(3)
  })
  it('handles tiny rooms', () => {
    expect(buildSchedule(ids(1), 3)).toEqual([])
    expect(buildSchedule(ids(2), 3)).toHaveLength(1)
  })
})
