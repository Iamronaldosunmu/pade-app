import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ROUND_SECONDS, afterFiveMinutes, openWindowAt, planWindows, resolveRound, unlocksContact,
  type BuzzEvent, type Choice, type RoundOutcome,
} from '../engine/timeline'

export type Phase = 'dating' | 'choice' | 'waiting' | 'keeping' | 'result'

export interface RoundState {
  /** Seconds elapsed on the round clock. */
  t: number
  phase: Phase
  windowOpen: boolean
  outcome: RoundOutcome | null
  /** What happened after five minutes. */
  decision: 'keep' | 'wrap' | null
}

/**
 * Stands in for the server in the prototype: it owns the clock and the hidden windows,
 * and only tells the screen whether a window is open right now. The real version will
 * read this from Supabase realtime instead of running locally.
 */
export function useRound(seed: number, speed: number) {
  const windows = useRef(planWindows(seed))
  const buzzes = useRef<BuzzEvent[]>([])
  const partnerBuzzAt = useRef<number | null>(null)
  const clock = useRef(0)
  const [state, setState] = useState<RoundState>({ t: 0, phase: 'dating', windowOpen: false, outcome: null, decision: null })
  const phaseRef = useRef<Phase>('dating')

  useEffect(() => {
    // The practice partner buzzes in about a third of rounds, inside a random window.
    const w = windows.current
    const r = ((seed * 9301 + 49297) % 233280) / 233280
    partnerBuzzAt.current = r < 0.33 ? w[Math.floor(r * 9) % 3].start + 3 : null
  }, [seed])

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.25, (now - last) / 1000)
      last = now
      if (phaseRef.current === 'dating') {
        clock.current = Math.min(ROUND_SECONDS, clock.current + dt * speed)
        const t = clock.current
        if (partnerBuzzAt.current !== null && t >= partnerBuzzAt.current && !buzzes.current.some((b) => b.by === 'partner')) {
          buzzes.current.push({ by: 'partner', at: partnerBuzzAt.current })
        }
        const outcome = resolveRound(windows.current, buzzes.current)
        if (outcome.kind === 'buzzed') {
          phaseRef.current = 'result'
          setState({ t: outcome.at, phase: 'result', windowOpen: false, outcome, decision: 'wrap' })
        } else if (t >= ROUND_SECONDS) {
          phaseRef.current = 'choice'
          setState({ t: ROUND_SECONDS, phase: 'choice', windowOpen: false, outcome: { kind: 'completed' }, decision: null })
        } else {
          setState((s) => ({ ...s, t, windowOpen: !!openWindowAt(windows.current, t) }))
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [speed])

  const buzz = useCallback(() => {
    if (phaseRef.current !== 'dating') return false
    // Resolved against the round clock, not against what the button looked like.
    buzzes.current.push({ by: 'me', at: clock.current })
    const outcome = resolveRound(windows.current, buzzes.current)
    if (outcome.kind === 'buzzed') {
      phaseRef.current = 'result'
      setState({ t: outcome.at, phase: 'result', windowOpen: false, outcome, decision: 'wrap' })
      return true
    }
    return false
  }, [])

  const choose = useCallback((mine: Choice) => {
    if (phaseRef.current !== 'choice') return
    phaseRef.current = 'waiting'
    setState((s) => ({ ...s, phase: 'waiting' }))
    // The practice partner takes a moment, then says keep about two times in three.
    window.setTimeout(() => {
      const theirs: Choice = (seed * 7) % 3 === 0 ? 'wrap' : 'keep'
      const decision = afterFiveMinutes(mine, theirs)
      phaseRef.current = decision === 'keep' ? 'keeping' : 'result'
      setState((s) => ({ ...s, phase: decision === 'keep' ? 'keeping' : 'result', decision }))
    }, 1400)
  }, [seed])

  const finishKeeping = useCallback(() => {
    phaseRef.current = 'result'
    setState((s) => ({ ...s, phase: 'result' }))
  }, [])

  return { state, buzz, choose, finishKeeping, unlocked: state.outcome ? unlocksContact(state.outcome) : false }
}
