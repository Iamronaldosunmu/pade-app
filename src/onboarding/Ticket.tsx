import { useRef } from 'react'
import type { Profile } from './types'
import { sessionLabel } from './session-time'

/** The Friday ticket: it fills in as the person answers, and is the thing they keep. */
export function Ticket({ profile, when, full, printed, enter }: { profile: Profile; when: Date; full?: boolean; printed?: boolean; enter?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const tilt = (e: React.PointerEvent) => {
    const el = ref.current
    if (!el || e.pointerType === 'touch') return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    el.style.transform = `perspective(900px) rotateY(${x * 12}deg) rotateX(${-y * 10}deg)`
  }
  const reset = () => { if (ref.current) ref.current.style.transform = '' }
  return (
    <div className={`ticket${full ? ' full' : ''}${printed ? ' printed' : ''}${enter ? ' enter' : ''}`} ref={ref} onPointerMove={tilt} onPointerLeave={reset}>
      <div className="tk-main">
        <p className="tk-kicker">Pàdé · admit one</p>
        <p className="tk-name">{profile.name || <span className="tk-ph">Your name</span>}</p>
        <p className="tk-meta">
          {profile.age ?? '··'} · {profile.area || '·····'}
        </p>
        <ul className="tk-tags" aria-label="About you">
          {profile.you.map((t) => <li key={t}>{t}</li>)}
          {profile.you.length === 0 && <li className="tk-ph">Your tags</li>}
        </ul>
        {full && profile.takes[0] && <p className="tk-take">“{profile.takes[0]}”</p>}
      </div>
      <div className="tk-stub">
        <p className="tk-when">{sessionLabel(when)}</p>
        <span className={`tk-photo${profile.hasPhoto ? ' sealed' : ''}`} aria-hidden="true">
          {profile.hasPhoto ? 'sealed' : 'photo'}
        </span>
        {printed && <span className="tk-free">First Friday free</span>}
      </div>
    </div>
  )
}
