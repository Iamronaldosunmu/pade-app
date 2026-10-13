import { useEffect, useRef, useState } from 'react'
import { AREAS, TAKE_IDEAS } from './data'
import { firstName, PROVIDERS, signIn, type Provider } from './auth'
import { chime, reducedMotion, thud, tick } from './feel'
import { Ticket } from './Ticket'
import { canvasBlob, drawShareCard, INVITE_LINK, DEFAULT_SHARE, type ShareOpts } from './shareCard'
import { nextSession, sessionIcs } from './session-time'
import { emptyProfile, type Profile } from './types'
import { cleanHandle, cleanName, isAdult, parseAge, validHandleFor, validName } from './validate'
import './onboarding.css'

type StepId = 'welcome' | 'name' | 'age' | 'area' | 'work' | 'takes' | 'contact' | 'photo' | 'ticket'
const STEPS: StepId[] = ['welcome', 'name', 'age', 'area', 'work', 'takes', 'contact', 'photo', 'ticket']
const SHOW_TICKET: StepId[] = ['name', 'age', 'area', 'work', 'takes', 'contact', 'photo']

const SAVE_KEY = 'pade.onboarding.v1'

/** Where the person got to, so a refresh or a return visit picks up on the same screen with their answers. */
function loadProgress(): { i: number; p: Profile } {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null') as { i?: number; p?: Partial<Profile> } | null
    if (raw && typeof raw.i === 'number' && raw.i >= 0 && raw.p && typeof raw.p === 'object') {
      // a signed-in profile is needed for anything past the welcome screen
      if (raw.i > 0 && !raw.p.provider) return { i: 0, p: emptyProfile }
      return { i: Math.min(raw.i, STEPS.length - 1), p: { ...emptyProfile, ...raw.p, hasPhoto: !!raw.p.photo } }
    }
  } catch { /* storage blocked or corrupt: start fresh */ }
  return { i: 0, p: emptyProfile }
}

export function Onboarding({ onPractice }: { onPractice: () => void }) {
  const saved = useState(loadProgress)[0]
  const [i, setI] = useState(saved.i)
  const [p, setP] = useState<Profile>(saved.p)
  const [spark, setSpark] = useState(0) // bumped when a new idea is generated, so the ticket can react
  const when = useState(() => nextSession(new Date()))[0]
  const step = STEPS[i]
  const set = (patch: Partial<Profile>) => setP((x) => ({ ...x, ...patch }))
  const next = () => { setI((n) => Math.min(n + 1, STEPS.length - 1)) }
  const back = () => setI((n) => Math.max(0, n - 1))
  const stage = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ i, p })) } catch { /* private mode */ }
  }, [i, p])

  useEffect(() => {
    stage.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true })
  }, [step])

  return (
    <div className={`ob${step === 'welcome' ? ' solo' : ''}`}>
      <div className="ob-bar" role="progressbar" aria-label="Progress" aria-valuemin={0} aria-valuemax={STEPS.length - 1} aria-valuenow={i}>
        <span style={{ transform: `scaleX(${i / (STEPS.length - 1)})` }} />
      </div>
      {step !== 'welcome' && (
        <aside className="ob-aside" aria-hidden="true">
          <Ticket profile={p} when={when} full enter printed={step === 'ticket'} spark={spark} />
          <p className="ob-aside-note">Your ticket, as people will see it.</p>
        </aside>
      )}
      <div className="ob-main">
<div className="ob-top">
          {i > 0 && <button className="ob-back" onClick={back} aria-label="Back"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg></button>}
        </div>
        {SHOW_TICKET.includes(step) && (
          <div className="ob-ticket"><Ticket profile={p} when={when} enter={step === 'name'} /></div>
        )}
        <div className="ob-stage" ref={stage} key={step}>
          {step === 'welcome' && <Welcome onSignedIn={(id) => { set({ provider: id.provider, name: firstName(id.name), contactKind: id.provider === 'x' ? 'x' : 'instagram', handle: id.provider === 'google' ? '' : id.handle }); next() }} />}
        {step === 'name' && <Name provider={p.provider} value={p.name} onLive={(v) => set({ name: v })} onNext={(v) => { set({ name: v }); next() }} />}
        {step === 'age' && <Age value={p.age} onLive={(age) => set({ age })} onNext={(v) => { set({ age: v }); next() }} />}
        {step === 'area' && <Area value={p.area} onLive={(area) => set({ area })} onNext={(v) => { set({ area: v }); next() }} />}
        {step === 'work' && <Work value={p.work} onLive={(work) => set({ work })} onNext={(work) => { set({ work }); next() }} />}
        {step === 'takes' && <Takes onSpark={() => setSpark((n) => n + 1)} value={p.takes} onLive={(takes) => set({ takes })} onNext={(takes) => { set({ takes }); next() }} />}
        {step === 'contact' && <Contact p={p} onLive={(patch) => set(patch)} onNext={(patch) => { set(patch); next() }} />}
        {step === 'photo' && <Photo photo={p.photo} onLive={(photo) => set({ photo, hasPhoto: !!photo })} onNext={() => next()} />}
        {step === 'ticket' && <Final p={p} when={when} onPractice={onPractice} />}
        </div>
      </div>
    </div>
  )
}

function Head({ title, hint }: { title: string; hint?: string }) {
  return (
    <>
      <h1 className="ob-h" tabIndex={-1}>{title}</h1>
      {hint && <p className="ob-hint">{hint}</p>}
    </>
  )
}

function Foot({ ok, label = 'Continue', why, onSkip }: { ok: boolean; label?: string; why?: string; onSkip?: () => void }) {
  return (
    <div className="ob-foot">
      {!ok && why && <p className="ob-why" id="why">{why}</p>}
      <button className="ob-next" type="submit" aria-disabled={!ok} aria-describedby={!ok && why ? 'why' : undefined}>{label}</button>
      {onSkip && <button type="button" className="ob-link" onClick={() => { tick(); onSkip() }}>Skip for now</button>}
    </div>
  )
}

/** One question per screen. Enter submits. */
function Q({ title, hint, ok, onNext, onSkip, children }: { title: string; hint?: string; ok: boolean; onNext: () => void; onSkip?: () => void; children: React.ReactNode }) {
  return (
    <form className="ob-q" onSubmit={(e) => { e.preventDefault(); if (ok) { chime(); onNext() } }}>
      <Head title={title} hint={hint} />
      {children}
      <Foot ok={ok} onSkip={onSkip} />
    </form>
  )
}

const GLYPH: Record<Provider, React.ReactNode> = {
  google: <span className="gl-g" aria-hidden="true">G</span>,
  instagram: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5.5" /><circle cx="12" cy="12" r="4.2" /><circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
      <path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.3L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z" />
    </svg>
  ),
}

function Welcome({ onSignedIn }: { onSignedIn: (id: Awaited<ReturnType<typeof signIn>>) => void }) {
  const [busy, setBusy] = useState<Provider | null>(null)
  const [leaving, setLeaving] = useState(false)
  const go = async (id: Provider) => {
    if (busy) return
    tick()
    setBusy(id)
    const who = await signIn(id)
    chime()
    if (!reducedMotion()) {
      setLeaving(true)
      await new Promise((r) => setTimeout(r, 320))
    }
    onSignedIn(who)
  }
  return (
    <div className={`ob-q ob-welcome${leaving ? ' leaving' : ''}`}>
      <p className="wm big" aria-label="Pàdé">P<i>à</i>d<i>é</i></p>
      <h1 className="ob-h" tabIndex={-1}>Meet someone new, five minutes at a time.</h1>
      <p className="ob-hint">Every Friday, 9 to 10pm, in Lagos.</p>
      <div className="ob-auth" role="group" aria-label="Sign up or sign in" aria-busy={busy !== null}>
        {PROVIDERS.map((pr, k) => (
          <button key={pr.id} className={`auth-btn${busy === pr.id ? ' busy' : ''}`} data-autofocus={k === 0 ? '' : undefined} aria-disabled={busy !== null && busy !== pr.id} onClick={() => go(pr.id)}>
            <span className="auth-glyph">{GLYPH[pr.id]}</span>
            <span className="auth-label">{busy === pr.id ? 'Connecting…' : `Continue with ${pr.label}`}</span>
            {busy === pr.id && <span className="auth-spin" aria-hidden="true" />}
          </button>
        ))}
      </div>
    </div>
  )
}

function Name({ provider, value, onLive, onNext }: { provider: Provider | null; value: string; onLive: (v: string) => void; onNext: (v: string) => void }) {
  const [v, setV] = useState(value)
  const [prefilled] = useState(!!value)
  return (
    <Q title="What should we call you?" hint={provider && prefilled ? `You are in. We took this from ${PROVIDERS.find((x) => x.id === provider)?.label}. Change it if you like. It is what people see.` : 'First name or a nickname. This is what people see.'} ok={validName(v)} onNext={() => onNext(cleanName(v))}>
      <label className="sr" htmlFor="nm">Name</label>
      <input id="nm" className="ob-input big" data-autofocus autoComplete="given-name" maxLength={24} value={v} onChange={(e) => { setV(e.target.value); onLive(e.target.value.trimStart()) }} />
    </Q>
  )
}

function Age({ value, onLive, onNext }: { value: number | null; onLive: (v: number | null) => void; onNext: (v: number) => void }) {
  const [v, setV] = useState(value ? String(value) : '')
  const a = parseAge(v)
  const under = a !== null && !isAdult(a) && v.length >= 2
  return (
    <Q title="How old are you?" hint="Pàdé is for adults, 18 and over." ok={isAdult(a)} onNext={() => a && onNext(a)}>
      <label className="sr" htmlFor="ag">Age</label>
      <input id="ag" className="ob-input big narrow" data-autofocus inputMode="numeric" maxLength={2} value={v} onChange={(e) => { const d = e.target.value.replace(/\D/g, ''); setV(d); onLive(parseAge(d)) }} aria-invalid={under} aria-describedby={under ? 'ag-err' : undefined} />
      {under && <p className="ob-err" id="ag-err" role="alert">You need to be 18 or over to join.</p>}
    </Q>
  )
}

function Area({ value, onLive, onNext }: { value: string; onLive: (v: string) => void; onNext: (v: string) => void }) {
  const [v, setV] = useState(value)
  return (
    <Q title="Where in Lagos are you?" hint="Roughly. It helps people picture you." ok={!!v} onNext={() => onNext(v)}>
      <div className="ob-opts" role="radiogroup" aria-label="Area">
        {AREAS.map((a, k) => (
          <button key={a} type="button" role="radio" aria-checked={v === a} data-autofocus={k === 0 ? '' : undefined} onClick={() => { tick(); setV(a); onLive(a) }}>{a}</button>
        ))}
      </div>
    </Q>
  )
}

function Work({ value, onLive, onNext }: { value: string; onLive: (v: string) => void; onNext: (v: string) => void }) {
  const [v, setV] = useState(value)
  const ok = v.trim().length >= 2
  return (
    <Q title="What do you do?" hint="Your job, your studies, or what keeps you busy." ok={ok} onNext={() => onNext(v.trim())}>
      <label className="sr" htmlFor="wk">What you do</label>
      <input id="wk" className="ob-input big" data-autofocus autoComplete="organization-title" maxLength={36} placeholder="Product designer" value={v} onChange={(e) => { setV(e.target.value); onLive(e.target.value.trimStart()) }} />
    </Q>
  )
}

function Takes({ value, onLive, onNext, onSpark }: { onSpark: () => void; value: string[]; onLive: (v: string[]) => void; onNext: (v: string[]) => void }) {
  const [a, setA] = useState(value[0] ?? '')
  const [b, setB] = useState(value[1] ?? '')
  const [two, setTwo] = useState(!!value[1])
  const [leaving, setLeaving] = useState(false)
  const [idea, setIdea] = useState(0)
  const empty = a.trim() === ''
  const ok = empty || a.trim().length >= 3
  const live = (x: string, y: string) => onLive([x.trim(), y.trim()].filter(Boolean))
  const second = useRef<HTMLTextAreaElement>(null)
  const raf = useRef(0)
  const [fx, setFx] = useState(0)
  const [busy, setBusy] = useState(false)
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  const stop = () => { cancelAnimationFrame(raf.current); setBusy(false) }

  /** Decode the new idea into the field: letters shuffle, then settle left to right. */
  const generate = () => {
    const t = TAKE_IDEAS[idea % TAKE_IDEAS.length]
    setIdea(idea + 1)
    onSpark()
    setFx((n) => n + 1)
    stop()
    if (reducedMotion()) { setA(t); live(t, b); return }
    const GLYPHS = 'abcdefghijklmnopqrstuvwxyz?!#%&*'
    const start = performance.now()
    setBusy(true)
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / 900)
      let out = ''
      for (let i = 0; i < t.length; i++) out += t[i] === ' ' || k >= (i / t.length) * 0.75 + 0.12 || k === 1 ? t[i] : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
      setA(out)
      live(out, b)
      if (k < 1) raf.current = requestAnimationFrame(step)
      else setBusy(false)
    }
    raf.current = requestAnimationFrame(step)
  }
  return (
    <Q title="What is your hot take?" hint="Say something people can argue with. It goes on your ticket, or skip it for now." ok={ok} onNext={() => onNext([a.trim(), b.trim()].filter(Boolean))} onSkip={empty ? () => onNext([]) : undefined}>
      <div className="takes">
        <div className={`take-card${busy ? ' busy' : ''}`}>
          {fx > 0 && <span className="sweep" key={fx} aria-hidden="true" />}
          <label className="take-tag" htmlFor="t1"><i>1</i>Your take</label>
          <textarea id="t1" data-autofocus rows={2} maxLength={90} value={a} onChange={(e) => { stop(); setA(e.target.value); live(e.target.value, b) }} placeholder="Jollof is better when it is a little burnt." />
          <div className="take-foot">
            <button type="button" className="ob-link idea" onClick={() => { tick(); generate() }}><svg key={fx} className="spk" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M12 2l2.2 6.3L20.5 10l-6.3 1.7L12 18l-2.2-6.3L3.5 10l6.3-1.7z" /></svg>Need an idea?</button>
            <span className="ob-count">{a.length}/90</span>
          </div>
        </div>
        {two ? (
          <div className={`take-wrap${leaving ? ' leaving' : ''}`}>
          <div className="take-card more">
            <label className="take-tag" htmlFor="t2"><i>2</i>Another one <em>optional</em></label>
            <button type="button" className="take-x" aria-label="Remove second take" onClick={() => {
              tick(); live(a, '')
              const done = () => { setTwo(false); setB(''); setLeaving(false) }
              if (reducedMotion()) { done(); return }
              setLeaving(true); window.setTimeout(done, 380)
            }}>×</button>
            <textarea id="t2" ref={second} rows={2} maxLength={90} value={b} onChange={(e) => { setB(e.target.value); live(a, e.target.value) }} placeholder="A second one, if you have it." />
            <div className="take-foot"><span /><span className="ob-count">{b.length}/90</span></div>
          </div>
          </div>
        ) : (
          !empty && ok && <button type="button" className="take-add" onClick={() => { tick(); setTwo(true); setTimeout(() => second.current?.focus(), 30) }}>+ Add a second take</button>
        )}
      </div>
    </Q>
  )
}

const NETWORKS: { id: Profile['contactKind']; label: string; domain: string }[] = [
  { id: 'instagram', label: 'Instagram', domain: 'instagram.com/' },
  { id: 'x', label: 'X', domain: 'x.com/' },
  { id: 'snapchat', label: 'Snapchat', domain: 'snapchat.com/add/' },
]

function NetIcon({ id, size = 20 }: { id: Profile['contactKind']; size?: number }) {
  if (id === 'instagram') return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5.5" /><circle cx="12" cy="12" r="4.2" /><circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" /></svg>
  if (id === 'x') return <svg viewBox="0 0 24 24" width={size - 2} height={size - 2} fill="currentColor" aria-hidden="true"><path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.3L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z" /></svg>
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M12 3c-3.3 0-5.2 2.4-5.2 5.4V11c-.9.3-1.8.2-2.3 0 .1 1.1 1.2 1.8 2.3 1.9-.4 1.2-1.5 2.4-3 3 1.2.5 2.4.6 3.4.5.4.7 1 1.3 1.6 1.6 1.1.5 2.3.5 3.2.5s2.1 0 3.2-.5c.6-.3 1.2-.9 1.6-1.6 1 .1 2.2 0 3.4-.5-1.5-.6-2.6-1.8-3-3 1.1-.1 2.2-.8 2.3-1.9-.5.2-1.4.3-2.3 0V8.4C17.2 5.4 15.3 3 12 3z" /></svg>
}

function Contact({ p, onLive, onNext }: { p: Profile; onLive: (patch: Partial<Profile>) => void; onNext: (patch: Partial<Profile>) => void }) {
  const [kind, setKind] = useState(p.contactKind)
  const [h, setH] = useState(p.handle)
  const handle = cleanHandle(h)
  const ok = validHandleFor(kind, handle)
  const net = NETWORKS.find((n) => n.id === kind) ?? NETWORKS[0]
  const pick = (id: Profile['contactKind']) => { tick(); setKind(id); onLive({ contactKind: id, handle: cleanHandle(h) }) }
  const input = (cls: string) => (
    <input id="hd" className={cls} data-autofocus autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="username" aria-label={`${net.label} username`} value={h.replace(/^@/, '')} onChange={(e) => { setH(e.target.value); onLive({ contactKind: kind, handle: cleanHandle(e.target.value) }) }} />
  )
  const radio = (n: (typeof NETWORKS)[number], children: React.ReactNode, cls = '') => (
    <button key={n.id} type="button" role="radio" className={cls} aria-checked={kind === n.id} aria-label={n.label} onClick={() => pick(n.id)}>{children}</button>
  )
  return (
    <Q title="Where can someone find you?" hint="Only the person you both choose to keep talking to sees it." ok={ok} onNext={() => onNext({ contactKind: kind, handle })}>
      <div className="cf">
        <div className="cf-rows" role="radiogroup" aria-label="Network">
          {NETWORKS.map((n) => (
            <div key={n.id} className={`cf-row${kind === n.id ? ' on' : ''}`}>
              {radio(n, <><NetIcon id={n.id} size={22} /><b>{n.label}</b><i aria-hidden="true" /></>)}
              {kind === n.id && <label className="cf-in"><span>@</span>{input('')}</label>}
            </div>
          ))}
        </div>
      </div>
    </Q>
  )
}

/** Square, small JPEG so it fits comfortably in local storage and on the ticket. */
function shrinkPhoto(file: File, size = 160): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = c.height = size
      const g = c.getContext('2d')
      if (!g) { URL.revokeObjectURL(url); reject(new Error('no canvas')); return }
      const side = Math.min(img.width, img.height)
      g.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad image')) }
    img.src = url
  })
}

function Lock({ size = 14 }: { size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
}
function Camera({ size = 28 }: { size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8h3l1.5-2h7L17 8h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
}

function Photo({ photo, onLive, onNext }: { photo: string; onLive: (photo: string) => void; onNext: () => void }) {
  const got = photo !== ''
  const [peek, setPeek] = useState(false)
  return (
    <form className="ob-q" onSubmit={(e) => { e.preventDefault(); onNext() }}>
      <Head title="Add a photo." hint="Nobody sees it until a conversation passes five minutes. Then it opens for both of you." />
      <div className="ph-stage" aria-live="polite">
        <label htmlFor="ph-file" className={`ph ph-frost${got ? ' got' : ''}${peek ? ' peek' : ''}`}>
          {got ? <img src={photo} alt="Your photo" /> : <span className="ph-empty"><Camera /><b>Add a photo</b></span>}
          {got && <span className="ph-chip"><Lock />Opens after 5:00</span>}
        </label>
        {got && <button type="button" className="ph-peek" aria-pressed={peek} onClick={() => { tick(); setPeek((v) => !v) }}>{peek ? 'Hide it again' : 'Peek at it'}</button>}
      </div>
      <label className="ob-next ghost">
        {got ? 'Choose a different photo' : 'Take or choose a photo'}
        <input id="ph-file" type="file" accept="image/*" capture="user" className="sr" data-autofocus onChange={(e) => {
          const f = e.target.files?.[0]
          if (!f) return
          shrinkPhoto(f, 360).then((d) => { onLive(d); thud() }).catch(() => { /* unreadable image: keep what we had */ })
        }} />
      </label>
      <div className="ob-foot">
        <button className="ob-next" type="submit" aria-disabled={!got}>Continue</button>
        {!got && <button type="button" className="ob-link" onClick={onNext}>Skip for now</button>}
      </div>
    </form>
  )
}

const LOOKS: { id: ShareOpts['style']; label: string; bg: string }[] = [
  { id: 'cream', label: 'Cream', bg: '#efe6cf' },
  { id: 'gold', label: 'Gold', bg: '#ffc24a' },
  { id: 'night', label: 'Night', bg: '#1b1e25' },
]

/** One screen: your ticket as a shareable card, a colour if you care, and the share button. */
function Final({ p, when, onPractice }: { p: Profile; when: Date; onPractice: () => void }) {
  useEffect(() => { thud() }, [])
  const card = useRef<HTMLCanvasElement>(null)
  const [note, setNote] = useState('')
  const [style, setStyle] = useState<ShareOpts['style']>(DEFAULT_SHARE.style)
  const [big, setBig] = useState('') // data URL of the card while it is open full screen
  const opts: ShareOpts = { ...DEFAULT_SHARE, style }
  useEffect(() => { if (card.current) void drawShareCard(p, card.current, { ...DEFAULT_SHARE, style }) }, [p, style])
  const addCal = () => {
    const blob = new Blob([sessionIcs(when)], { type: 'text/calendar' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'pade-friday.ics'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }
  const share = async () => {
    if (!card.current) return
    try {
      const blob = await canvasBlob(await drawShareCard(p, card.current, opts))
      const file = new File([blob], 'pade-ticket.png', { type: 'image/png' })
      const text = `I just signed up for Pàdé. Five minutes with a new person, Fridays 9 to 10pm in Lagos.${INVITE_LINK ? ` ${INVITE_LINK}` : ''}`
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text })
        return
      }
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'pade-ticket.png'
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 1000)
      setNote('Saved. Post it wherever you like.')
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setNote('Could not share that. Try again.')
    }
  }
  return (
    <div className="ob-q ob-final sh">
      <Head title={`You are in, ${p.name}.`} hint="Share your ticket and tell someone you are coming." />
      <button type="button" className="sh-open" aria-label="View your ticket full screen" onClick={() => { if (card.current) { tick(); setBig(card.current.toDataURL('image/png')) } }}>
        <canvas className="share-card" ref={card} role="img" aria-label="Your Pàdé ticket, ready to share" />
      </button>
      <div className="sh-dots" role="radiogroup" aria-label="Colour">
        {LOOKS.map((l) => <button key={l.id} type="button" role="radio" aria-checked={style === l.id} aria-label={l.label} style={{ background: l.bg }} onClick={() => { tick(); setStyle(l.id) }} />)}
      </div>
      <div className="ob-foot">
        <button className="ob-next" data-autofocus onClick={share}>Share my ticket</button>
        {note && <p className="ob-why" role="status">{note}</p>}
        <button className="ob-link" onClick={addCal}>Add to calendar</button>
        <button className="ob-link" onClick={onPractice}>Try a practice call</button>
      </div>
      {big && (
        <dialog className="lb" aria-label="Your ticket, full screen" ref={(d) => { if (d && !d.open) d.showModal() }} onClose={() => setBig('')} onClick={() => setBig('')}>
          <img src={big} alt="Your Pàdé ticket, full size" />
          <button type="button" className="lb-x" aria-label="Close" autoFocus onClick={() => setBig('')}>×</button>
        </dialog>
      )}
    </div>
  )
}
