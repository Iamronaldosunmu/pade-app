import { flushSync } from 'react-dom'

/**
 * Moves between screens with the browser's View Transitions, so the old screen leaves
 * while the new one arrives. `fwd` and `back` slide the page; `fade` crossfades everything;
 * `drill` is a push or pop that only slides on narrow screens (on desktop both panes stay put).
 * Browsers without support, and people who prefer reduced motion, just get the update.
 */
export type Move = 'fwd' | 'back' | 'fade' | 'drill-in' | 'drill-out'

let running: ViewTransition | null = null

export function navigate(move: Move, update: () => void): void {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => ViewTransition }
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const wide = window.matchMedia('(min-width: 900px)').matches
  if (!doc.startViewTransition || reduce || (wide && move.startsWith('drill'))) { update(); return }
  const dir = move === 'drill-in' ? 'fwd' : move === 'drill-out' ? 'back' : move
  running?.skipTransition()
  const root = document.documentElement
  root.dataset.vt = dir
  const t = doc.startViewTransition(() => { flushSync(update) })
  running = t
  void t.finished.catch(() => {}).finally(() => { if (running === t) { running = null; delete root.dataset.vt } })
}
