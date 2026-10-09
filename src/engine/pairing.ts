import { mulberry32 } from './rng'

export interface Person {
  id: string
  /** What this person says about themselves. */
  tags: string[]
  /** What they said they would like to meet. */
  wants: string[]
}

export interface Round {
  pairs: [string, string][]
  /** Someone sits out when the room has an odd number of people. */
  bye: string | null
}

/** How well two people fit, 0 to 1: each side's wishes against the other's tags, averaged. */
export function compatibility(a: Person, b: Person): number {
  const side = (x: Person, y: Person) =>
    x.wants.length === 0 ? 0.5 : x.wants.filter((w) => y.tags.includes(w)).length / x.wants.length
  return (side(a, b) + side(b, a)) / 2
}

const BYE = '__bye__'

/** Circle method: every round is a full matching and nobody meets twice. */
function circle(ids: string[]): string[][][] {
  const list = ids.length % 2 === 0 ? [...ids] : [...ids, BYE]
  const n = list.length
  const rounds: string[][][] = []
  for (let r = 0; r < n - 1; r++) {
    const pairs: string[][] = []
    for (let i = 0; i < n / 2; i++) pairs.push([list[i], list[n - 1 - i]])
    rounds.push(pairs)
    list.splice(1, 0, list.pop() as string)
  }
  return rounds
}

function toRounds(raw: string[][][], count: number): Round[] {
  return raw.slice(0, count).map((pairs) => {
    let bye: string | null = null
    const real: [string, string][] = []
    for (const [a, b] of pairs) {
      if (a === BYE) bye = b
      else if (b === BYE) bye = a
      else real.push([a, b])
    }
    return { pairs: real, bye }
  })
}

function score(rounds: Round[], byId: Map<string, Person>): number {
  let s = 0
  for (const r of rounds) for (const [a, b] of r.pairs) s += compatibility(byId.get(a)!, byId.get(b)!)
  return s
}

/**
 * A schedule of up to `roundCount` rounds where nobody meets the same person twice.
 * Validity comes from the circle method; quality comes from shuffling who sits where
 * and keeping the arrangement whose early rounds fit people's stated wishes best.
 */
export function buildSchedule(people: Person[], roundCount: number, seed = 1): Round[] {
  if (people.length < 2) return []
  const byId = new Map(people.map((p) => [p.id, p]))
  const rng = mulberry32(seed)
  const maxRounds = Math.min(roundCount, people.length % 2 === 0 ? people.length - 1 : people.length)
  let order = people.map((p) => p.id)
  let best = toRounds(circle(order), maxRounds)
  let bestScore = score(best, byId)
  for (let i = 0; i < 400; i++) {
    const next = [...order]
    const x = Math.floor(rng() * next.length)
    const y = Math.floor(rng() * next.length)
    ;[next[x], next[y]] = [next[y], next[x]]
    const cand = toRounds(circle(next), maxRounds)
    const s = score(cand, byId)
    if (s > bestScore) {
      best = cand
      bestScore = s
      order = next
    }
  }
  return best
}
