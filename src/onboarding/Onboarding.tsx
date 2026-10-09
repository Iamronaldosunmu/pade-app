import { useEffect, useRef, useState } from 'react'
import { AREAS, TAKE_IDEAS } from './data'
import { firstName, PROVIDERS, signIn, type Provider } from './auth'
import { chime, reducedMotion, thud, tick } from './feel'
import { Pick } from './Pick'
import { Ticket } from './Ticket'
import { nextSession, sessionIcs } from './session-time'
import { emptyProfile, type Profile } from './types'
import { cleanHandle, cleanName, formatPhone, isAdult, normalizePhone, parseAge, validHandle, validName } from './validate'
import './onboarding.css'

type StepId = 'welcome' | 'name' | 'age' | 'area' | 'you' | 'table' | 'takes' | 'contact' | 'photo' | 'buzzer' | 'ticket'
const STEPS: StepId[] = ['welcome', 'name', 'age', 'area', 'you', 'table', 'takes', 'contact', 'photo', 'buzzer', 'ticket']
const SHOW_TICKET: StepId[] = ['name', 'age', 'area', 'you', 'takes', 'photo']

export function Onboarding({ onPractice }: { onPractice: () => void }) {
  const [i, setI] = useState(0)
  const [p, setP] = useState<Profile>(emptyProfile)
  const when = useState(() => nextSession(new Date()))[0]
  const step = STEPS[i]
  const set = (patch: Partial<Profile>) => setP((x) => ({ ...x, ...patch }))
  const next = () => { setI((n) => Math.min(n + 1, STEPS.length - 1)) }
  const back = () => setI((n) => Math.max(0, n - 1))
  const stage = useRef<HTMLDivElement>(null)

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
          <Ticket profile={p} when={when} full enter printed={step === 'ticket'} />
          <p className="ob-aside-note">Your ticket, as people will see it.</p>
        </aside>
      )}
      <div className="ob-main">
<div className="ob-top" />
        {SHOW_TICKET.includes(step) && (
          <div className="ob-ticket"><Ticket profile={p} when={when} enter={step === 'name'} /></div>
        )}
        <div className="ob-stage" ref={stage} key={step}>
          {i > 0 && <button className="ob-back" onClick={back}><span aria-hidden="true">←</span> Back</button>}
          {step === 'welcome' && <Welcome onSignedIn={(id) => { set({ provider: id.provider, name: firstName(id.name), instagram: id.provider === 'instagram' ? id.handle : '' }); next() }} />}
        {step === 'name' && <Name provider={p.provider} value={p.name} onLive={(v) => set({ name: v })} onNext={(v) => { set({ name: v }); next() }} />}
        {step === 'age' && <Age value={p.age} onNext={(v) => { set({ age: v }); next() }} />}
        {step === 'area' && <Area value={p.area} onNext={(v) => { set({ area: v }); next() }} />}
        {step === 'you' && (
          <Q title="Pick three words for you." hint="What people say about you." ok={p.you.length === 3} onNext={next}>
            <Pick value={p.you} onChange={(you) => set({ you })} max={3} label="About you" />
          </Q>
        )}
        {step === 'table' && (
          <Q title="Who do you want at your table?" hint="Pick up to four. Nobody sees this." ok={p.table.length >= 1} onNext={next}>
            <Pick value={p.table} onChange={(table) => set({ table })} max={4} label="Your table" />
          </Q>
        )}
        {step === 'takes' && <Takes value={p.takes} onNext={(takes) => { set({ takes }); next() }} />}
        {step === 'contact' && <Contact p={p} onNext={(patch) => { set(patch); next() }} />}
        {step === 'photo' && <Photo has={p.hasPhoto} onNext={(hasPhoto) => { set({ hasPhoto }); next() }} />}
        {step === 'buzzer' && <Buzzer onNext={next} />}
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

function Foot({ ok, label = 'Continue', why }: { ok: boolean; label?: string; why?: string }) {
  return (
    <div className="ob-foot">
      {!ok && why && <p className="ob-why" id="why">{why}</p>}
      <button className="ob-next" type="submit" aria-disabled={!ok} aria-describedby={!ok && why ? 'why' : undefined}>{label}</button>
    </div>
  )
}

/** One question per screen. Enter submits. */
function Q({ title, hint, ok, onNext, children }: { title: string; hint?: string; ok: boolean; onNext: () => void; children: React.ReactNode }) {
  return (
    <form className="ob-q" onSubmit={(e) => { e.preventDefault(); if (ok) { chime(); onNext() } }}>
      <Head title={title} hint={hint} />
      {children}
      <Foot ok={ok} />
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
      <div className="meet" aria-hidden="true"><i /><i /><b /></div>
      <p className="wm big" aria-label="Pàdé">P<i>à</i>d<i>é</i></p>
      <h1 className="ob-h" tabIndex={-1}>Meet someone new, five minutes at a time.</h1>
      <p className="ob-hint">Fridays, 9 to 10pm, in Lagos. Your first Friday is free.</p>
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
  return (
    <Q title="What should we call you?" hint={provider ? `You are in. We took this from ${PROVIDERS.find((x) => x.id === provider)?.label}. Change it if you like. It is what people see.` : 'First name or a nickname. This is what people see.'} ok={validName(v)} onNext={() => onNext(cleanName(v))}>
      <label className="sr" htmlFor="nm">Name</label>
      <input id="nm" className="ob-input big" data-autofocus autoComplete="given-name" maxLength={24} value={v} onChange={(e) => { setV(e.target.value); onLive(e.target.value.trimStart()) }} />
    </Q>
  )
}

function Age({ value, onNext }: { value: number | null; onNext: (v: number) => void }) {
  const [v, setV] = useState(value ? String(value) : '')
  const a = parseAge(v)
  const under = a !== null && !isAdult(a) && v.length >= 2
  return (
    <Q title="How old are you?" hint="Pàdé is for adults, 18 and over." ok={isAdult(a)} onNext={() => a && onNext(a)}>
      <label className="sr" htmlFor="ag">Age</label>
      <input id="ag" className="ob-input big narrow" data-autofocus inputMode="numeric" maxLength={2} value={v} onChange={(e) => setV(e.target.value.replace(/\D/g, ''))} aria-invalid={under} aria-describedby={under ? 'ag-err' : undefined} />
      {under && <p className="ob-err" id="ag-err" role="alert">You need to be 18 or over to join.</p>}
    </Q>
  )
}

function Area({ value, onNext }: { value: string; onNext: (v: string) => void }) {
  const [v, setV] = useState(value)
  return (
    <Q title="Where in Lagos are you?" hint="Roughly. It helps people picture you." ok={!!v} onNext={() => onNext(v)}>
      <div className="ob-opts" role="radiogroup" aria-label="Area">
        {AREAS.map((a, k) => (
          <button key={a} type="button" role="radio" aria-checked={v === a} data-autofocus={k === 0 ? '' : undefined} onClick={() => { tick(); setV(a) }}>{a}</button>
        ))}
      </div>
    </Q>
  )
}

function Takes({ value, onNext }: { value: string[]; onNext: (v: string[]) => void }) {
  const [a, setA] = useState(value[0] ?? '')
  const [b, setB] = useState(value[1] ?? '')
  const [idea, setIdea] = useState(0)
  const ok = a.trim().length >= 3
  return (
    <Q title="Say something people can argue with." hint="A hot take. It goes on your ticket." ok={ok} onNext={() => onNext([a.trim(), b.trim()].filter(Boolean))}>
      <label className="sr" htmlFor="t1">Hot take</label>
      <textarea id="t1" className="ob-input take" data-autofocus rows={2} maxLength={90} value={a} onChange={(e) => setA(e.target.value)} placeholder="Jollof is better when it is a little burnt." />
      <div className="ob-row">
        <button type="button" className="ob-link" onClick={() => { tick(); setA(TAKE_IDEAS[idea % TAKE_IDEAS.length]); setIdea(idea + 1) }}>Need an idea?</button>
        <span className="ob-count">{a.length}/90</span>
      </div>
      {a.trim() && (
        <>
          <label className="sr" htmlFor="t2">Second take, optional</label>
          <textarea id="t2" className="ob-input take second" rows={2} maxLength={90} value={b} onChange={(e) => setB(e.target.value)} placeholder="One more, if you have it (optional)" />
        </>
      )}
    </Q>
  )
}

function Contact({ p, onNext }: { p: Profile; onNext: (patch: Partial<Profile>) => void }) {
  const [kind, setKind] = useState(p.contactKind)
  const [h, setH] = useState(p.instagram)
  const [ph, setPh] = useState(p.phone ? formatPhone(p.phone) : '')
  const handle = cleanHandle(h)
  const num = normalizePhone(ph)
  const ok = kind === 'whatsapp' ? !!num : validHandle(handle)
  return (
    <Q title="How should a match reach you?" hint="Shared only if you both stay past five minutes." ok={ok} onNext={() => onNext(kind === 'whatsapp' ? { contactKind: kind, phone: num ?? '' } : { contactKind: kind, instagram: handle })}>
      <div className="seg" role="radiogroup" aria-label="Contact">
        <span className="seg-pill" style={{ transform: `translateX(${kind === 'whatsapp' ? 0 : 100}%)` }} />
        <button type="button" role="radio" aria-checked={kind === 'whatsapp'} onClick={() => { tick(); setKind('whatsapp') }}>WhatsApp</button>
        <button type="button" role="radio" aria-checked={kind === 'instagram'} onClick={() => { tick(); setKind('instagram') }}>Instagram</button>
      </div>
      {kind === 'whatsapp' ? (
        <>
          <label className="sr" htmlFor="ph">WhatsApp number</label>
          <div className="ob-field big"><span aria-hidden="true">+234</span><input id="ph" data-autofocus type="tel" inputMode="tel" autoComplete="tel-national" placeholder="801 234 5678" value={ph} onChange={(e) => setPh(e.target.value)} /></div>
          <p className="ob-hint">Only the person you both choose to keep talking to sees it.</p>
        </>
      ) : (
        <>
          <label className="sr" htmlFor="ig">Instagram handle</label>
          <div className="ob-field"><span aria-hidden="true">@</span><input id="ig" data-autofocus autoCapitalize="none" autoCorrect="off" value={h.replace(/^@/, '')} onChange={(e) => setH(e.target.value)} /></div>
        </>
      )}
    </Q>
  )
}

function Photo({ has, onNext }: { has: boolean; onNext: (v: boolean) => void }) {
  const [got, setGot] = useState(has)
  const [url, setUrl] = useState('')
  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])
  return (
    <form className="ob-q" onSubmit={(e) => { e.preventDefault(); onNext(got) }}>
      <Head title="Add a photo." hint="Nobody sees it until a conversation passes five minutes. Then it opens for both of you." />
      <div className={`envelope${got ? ' sealed' : ''}`} aria-live="polite">
        {url && <img src={url} alt="" />}
        <span className="flap" aria-hidden="true" />
        <span className="env-label">{got ? 'Sealed. Opens after 5:00' : 'Opens after 5:00'}</span>
      </div>
      <label className="ob-next ghost">
        {got ? 'Choose a different photo' : 'Take or choose a photo'}
        <input type="file" accept="image/*" capture="user" className="sr" data-autofocus onChange={(e) => {
          const f = e.target.files?.[0]
          if (!f) return
          setUrl(URL.createObjectURL(f)); setGot(true); thud()
        }} />
      </label>
      <div className="ob-foot">
        <button className="ob-next" type="submit" aria-disabled={!got}>{got ? 'Continue' : 'Continue'}</button>
        {!got && <button type="button" className="ob-link" onClick={() => onNext(false)}>Skip for now</button>}
      </div>
    </form>
  )
}

/** A twenty second dry run of the thing that matters most: the buzzer only works when it is red. */
function Buzzer({ onNext }: { onNext: () => void }) {
  const [t, setT] = useState(0)
  const [state, setState] = useState<'wait' | 'early' | 'won'>('wait')
  const [shake, setShake] = useState(0)
  const red = t >= 3 && t < 9
  useEffect(() => {
    const id = setInterval(() => setT((x) => x + 0.1), 100)
    return () => clearInterval(id)
  }, [])
  const press = () => {
    if (state === 'won') return
    if (red) { setState('won'); chime(); return }
    thud(); setShake((s) => s + 1); setState('early')
  }
  const missed = t >= 9 && state !== 'won'
  return (
    <div className="ob-q">
      <Head title="Learn the buzzer." hint="In a call, it works only while the screen flashes red. Try it now: wait for red, then press." />
      <button className={`practice${red ? ' red' : ''}${state === 'won' ? ' won' : ''}`} key={shake} data-autofocus aria-disabled={!red && state !== 'won'} onClick={press}>
        {state === 'won' ? 'Nice' : 'BUZZ'}
      </button>
      <p className="ob-hint pad" role="status">
        {state === 'won' ? 'That is it. Press at the wrong time and nothing happens.' : missed ? 'Red window passed. Press anyway to see what happens.' : state === 'early' ? 'Too early. Wait for red.' : red ? 'Now!' : 'Wait for it…'}
      </p>
      <div className="ob-foot">
        <button className="ob-next" aria-disabled={state !== 'won'} onClick={() => state === 'won' && onNext()}>Continue</button>
        {state !== 'won' && <button className="ob-link" onClick={onNext}>Skip</button>}
      </div>
    </div>
  )
}

function Final({ p, when, onPractice }: { p: Profile; when: Date; onPractice: () => void }) {
  useEffect(() => { thud() }, [])
  const addCal = () => {
    const blob = new Blob([sessionIcs(when)], { type: 'text/calendar' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'pade-friday.ics'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }
  return (
    <div className="ob-q ob-final">
      <Head title={`You are in, ${p.name}.`} hint="Your first Friday is completely free." />
      <Ticket profile={p} when={when} full printed />
      <div className="ob-foot">
        <button className="ob-next" data-autofocus onClick={addCal}>Add to calendar</button>
        <button className="ob-link" onClick={onPractice}>Try a practice call</button>
      </div>
    </div>
  )
}
