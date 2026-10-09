import { mulberry32 } from './rng'

/** One round is five minutes. Nothing can be buzzed in the first 1:20. */
export const ROUND_SECONDS = 300
export const SAFE_SECONDS = 80
export const WINDOW_COUNT = 3
export const WINDOW_MIN = 16
export const WINDOW_MAX = 20
export const WINDOW_GAP = 20
/** Last moment a window may still be open. */
export const WINDOWS_END = 294

export interface BuzzWindow {
  /** Seconds from the start of the round. */
  start: number
  end: number
}

/**
 * Three hidden windows, 16-20s each, at least 20s apart, nothing before 1:20,
 * all closed by 4:54. Spacing is random so people cannot predict when they open.
 * The server owns the seed; clients only ever learn whether a window is open now.
 */
export function planWindows(seed: number): BuzzWindow[] {
  const rng = mulberry32(seed)
  const lengths = Array.from({ length: WINDOW_COUNT }, () => WINDOW_MIN + rng() * (WINDOW_MAX - WINDOW_MIN))
  const used = lengths.reduce((s, l) => s + l, 0)
  const slack = WINDOWS_END - SAFE_SECONDS - used - WINDOW_GAP * (WINDOW_COUNT - 1)
  // Split the slack into WINDOW_COUNT + 1 random shares (before, between, after).
  const cuts = Array.from({ length: WINDOW_COUNT }, () => rng() * slack).sort((a, b) => a - b)
  const shares = cuts.map((c, i) => c - (i === 0 ? 0 : cuts[i - 1]))
  const out: BuzzWindow[] = []
  let cursor = SAFE_SECONDS
  for (let i = 0; i < WINDOW_COUNT; i++) {
    cursor += shares[i]
    const start = cursor
    const end = start + lengths[i]
    out.push({ start, end })
    cursor = end + WINDOW_GAP
  }
  return out
}

export function openWindowAt(windows: BuzzWindow[], t: number): BuzzWindow | null {
  return windows.find((w) => t >= w.start && t <= w.end) ?? null
}

export type RoundOutcome =
  | { kind: 'buzzed'; by: string; at: number }
  | { kind: 'completed' }

export interface BuzzEvent {
  by: string
  /** Server time, seconds from round start. */
  at: number
}

/** A buzz only counts if a window was open on the server's clock when it arrived. */
export function resolveRound(windows: BuzzWindow[], buzzes: BuzzEvent[]): RoundOutcome {
  const valid = buzzes
    .filter((b) => b.at <= ROUND_SECONDS && openWindowAt(windows, b.at))
    .sort((a, b) => a.at - b.at)[0]
  return valid ? { kind: 'buzzed', by: valid.by, at: valid.at } : { kind: 'completed' }
}

export type Choice = 'keep' | 'wrap'

/** After five minutes: keep talking only if both people say so. */
export function afterFiveMinutes(a: Choice, b: Choice): 'keep' | 'wrap' {
  return a === 'keep' && b === 'keep' ? 'keep' : 'wrap'
}

/** Contact details and profiles unlock for pairs who finished the five minutes without a valid buzz. */
export function unlocksContact(outcome: RoundOutcome): boolean {
  return outcome.kind === 'completed'
}
