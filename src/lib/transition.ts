import { flushSync } from 'react-dom'

/**
 * Moves between screens with the browser's View Transitions, so the old screen leaves
 * while the new one arrives. `fwd` and `back` slide the page; `fade` crossfades everything;
 * `drill` is a push or pop that only slides on narrow screens (on desktop both panes stay put).
 * Browsers without support, and people who prefer reduced motion, just get the update.
 */
export type Move = 'fwd' | 'back' | 'fade' | 'drill-in' | 'drill-out'

export const STYLES = [
  { id: 'slide', label: 'Slide', hint: 'Slides in from the side you are heading to' },
  { id: 'fade', label: 'Fade', hint: 'A calm dissolve, no direction' },
  { id: 'rise', label: 'Rise', hint: 'Lifts up from below' },
  { id: 'push', label: 'Push', hint: 'Covers the old page, like a phone' },
  { id: 'wipe', label: 'Wipe', hint: 'A clean edge reveals the next page' },
] as const
export type StyleId = (typeof STYLES)[number]['id']
const KEY = 'pade.transition'

export function getStyle(): StyleId {
  try { const v = localStorage.getItem(KEY); if (STYLES.some((s) => s.id === v)) return v as StyleId } catch { /* private mode */ }
  return 'slide'
}
export function setStyle(id: StyleId): void {
  document.documentElement.dataset.vts = id
  try { localStorage.setItem(KEY, id) } catch { /* private mode */ }
}
if (typeof document !== 'undefined') document.documentElement.dataset.vts = getStyle()

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
