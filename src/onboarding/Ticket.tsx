import { useEffect, useRef } from 'react'
import type { Profile } from './types'
import { sessionLabel } from './session-time'
import { reducedMotion } from './feel'

const MAX_TILT = 11

/** The Friday ticket: it fills in as the person answers, and is the thing they keep.
 *  On hover it tilts toward the pointer with a little spring, catches the light, lifts off the page and
 *  its contents float at different depths. One rAF loop, which stops once everything has settled. */
export function Ticket({ profile, when, full, printed, enter }: { profile: Profile; when: Date; full?: boolean; printed?: boolean; enter?: boolean }) {
  const wrap = useRef<HTMLDivElement>(null)
  const glare = useRef<HTMLSpanElement>(null)
  const shade = useRef<HTMLSpanElement>(null)
  const rect = useRef<DOMRect | null>(null)
  const raf = useRef(0)
  // current and target: tilt x/y (deg), scale, light amount, pointer position 0..1
  const s = useRef({ x: 0, y: 0, k: 1, g: 0, px: 0.5, py: 0.5, tx: 0, ty: 0, tk: 1, tg: 0, tpx: 0.5, tpy: 0.5 })

  const draw = () => {
    const v = s.current
    const ease = 0.14
    v.x += (v.tx - v.x) * ease
    v.y += (v.ty - v.y) * ease
    v.k += (v.tk - v.k) * ease
    v.g += (v.tg - v.g) * ease
    v.px += (v.tpx - v.px) * 0.2
    v.py += (v.tpy - v.py) * 0.2
    const w = wrap.current
    if (w) w.style.transform = `perspective(900px) rotateX(${v.x.toFixed(2)}deg) rotateY(${v.y.toFixed(2)}deg) scale(${v.k.toFixed(4)})`
    if (glare.current) {
      glare.current.style.opacity = String(v.g.toFixed(3))
      glare.current.firstElementChild?.setAttribute('style', `transform: translate(${((v.px - 0.5) * 70).toFixed(1)}%, ${((v.py - 0.5) * 70).toFixed(1)}%)`)
    }
    if (shade.current) {
      shade.current.style.opacity = String(v.g.toFixed(3))
      shade.current.style.transform = `translate(${(-v.y * 2.2).toFixed(1)}px, ${(v.x * -2.2 + 18 * v.g).toFixed(1)}px)`
    }
    const settled = Math.abs(v.tx - v.x) + Math.abs(v.ty - v.y) + Math.abs(v.tk - v.k) * 20 + Math.abs(v.tg - v.g) * 10 < 0.01
    raf.current = settled ? 0 : requestAnimationFrame(draw)
  }
  const kick = () => { if (!raf.current) raf.current = requestAnimationFrame(draw) }
  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const enterHover = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch' || reducedMotion()) return
    rect.current = wrap.current?.getBoundingClientRect() ?? null // measure once per hover, then only write
    s.current.tk = 1.035
    s.current.tg = 1
    kick()
  }
  const move = (e: React.PointerEvent) => {
    const r = rect.current
    if (!r || e.pointerType === 'touch' || reducedMotion()) return
    const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
    const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
    const v = s.current
    v.ty = (px - 0.5) * 2 * MAX_TILT
    v.tx = -(py - 0.5) * 2 * MAX_TILT
    v.tpx = px
    v.tpy = py
    kick()
  }
  const leave = () => {
    const v = s.current
    v.tx = 0; v.ty = 0; v.tk = 1; v.tg = 0; v.tpx = 0.5; v.tpy = 0.5
    rect.current = null
    kick()
  }
  const contact = profile.contactKind === 'instagram' ? (profile.instagram ? `@${profile.instagram}` : '') : profile.phone
  return (
    <div className="tk-tilt" ref={wrap} onPointerEnter={enterHover} onPointerMove={move} onPointerLeave={leave}>
    <span className="tk-shade" ref={shade} />
    <div className={`ticket${full ? ' full' : ''}${printed ? ' printed' : ''}${enter ? ' enter' : ''}`}>
      <span className="tk-glare" ref={glare}><i /></span>
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
        {full && profile.takes[1] && <p className="tk-take">“{profile.takes[1]}”</p>}
        {full && contact && <p className="tk-contact">Private · {contact}</p>}
      </div>
      <div className="tk-stub">
        {printed && <p className="tk-when">{sessionLabel(when)}</p>}
        <span className={`tk-photo${profile.hasPhoto ? ' sealed' : ''}`} aria-hidden="true">
          {profile.hasPhoto ? 'sealed' : 'photo'}
        </span>
      </div>
    </div>
    </div>
  )
}
