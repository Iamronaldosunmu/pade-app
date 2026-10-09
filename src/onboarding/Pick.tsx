import { useRef } from 'react'
import { TAGS } from './data'
import { reducedMotion, tick } from './feel'

/** Tap chips and they fly into the plate. Tap a filled slot to put one back. */
export function Pick({ value, onChange, max, label }: { value: string[]; onChange: (v: string[]) => void; max: number; label: string }) {
  const slots = useRef<(HTMLButtonElement | null)[]>([])
  const toggle = (tag: string, chip: HTMLElement) => {
    if (value.includes(tag)) return onChange(value.filter((t) => t !== tag))
    if (value.length >= max) return
    tick()
    const to = slots.current[value.length]
    if (to && !reducedMotion()) {
      const a = chip.getBoundingClientRect()
      const b = to.getBoundingClientRect()
      const ghost = chip.cloneNode(true) as HTMLElement
      Object.assign(ghost.style, { position: 'fixed', left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, margin: '0', zIndex: '50', pointerEvents: 'none' })
      document.body.appendChild(ghost)
      const dx = b.left + b.width / 2 - (a.left + a.width / 2)
      const dy = b.top + b.height / 2 - (a.top + a.height / 2)
      ghost.animate(
        [{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${dx * 0.5}px,${dy * 0.5 - 30}px) scale(1.12)`, offset: 0.5 }, { transform: `translate(${dx}px,${dy}px) scale(0.9)` }],
        { duration: 420, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
      ).finished.then(() => ghost.remove(), () => ghost.remove())
      setTimeout(() => onChange([...value, tag]), 330)
    } else onChange([...value, tag])
  }
  return (
    <div className="pick">
      <div className="plate" role="group" aria-label={label}>
        {Array.from({ length: max }, (_, i) => (
          <button
            key={i}
            type="button"
            ref={(el) => { slots.current[i] = el }}
            className={`slot${value[i] ? ' full' : ''}`}
            aria-label={value[i] ? `Remove ${value[i]}` : `Empty slot ${i + 1}`}
            onClick={() => value[i] && onChange(value.filter((t) => t !== value[i]))}
          >
            {value[i] ?? i + 1}
          </button>
        ))}
      </div>
      <ul className="chips-pick">
        {TAGS.map((t) => (
          <li key={t}>
            <button type="button" aria-pressed={value.includes(t)} disabled={!value.includes(t) && value.length >= max} onClick={(e) => toggle(t, e.currentTarget)}>
              {t}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
