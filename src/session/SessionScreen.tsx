import { useEffect, useState } from 'react'
import { ROUND_SECONDS } from '../engine/timeline'
import { HOT_TAKES, PARTNER, QUESTIONS } from './content'
import { useRound } from './useRound'
import './session.css'

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s) % 60).padStart(2, '0')}`

type Card = { kind: 'question' | 'take'; text: string }

export function SessionScreen({ seed, speed, onExit }: { seed: number; speed: number; onExit: () => void }) {
  const { state, buzz, choose, finishKeeping, unlocked } = useRound(seed, speed)
  const [card, setCard] = useState<Card | null>(null)
  const [react, setReact] = useState<string | null>(null)
  const [cardsUsed, setCardsUsed] = useState({ question: 0, take: 0 })
  const [shake, setShake] = useState(false)

  const draw = (kind: Card['kind']) => {
    const list = kind === 'question' ? QUESTIONS : HOT_TAKES
    const i = (seed + cardsUsed[kind] * 3) % list.length
    setCardsUsed((c) => ({ ...c, [kind]: c[kind] + 1 }))
    setReact(null)
    setCard({ kind, text: list[i] })
  }

  const press = () => {
    if (state.phase !== 'dating') return
    if (!buzz()) {
      setShake(true)
      window.setTimeout(() => setShake(false), 400)
    }
  }

  // Space bar buzzes too, but only when nothing else is focused.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && document.activeElement === document.body) {
        e.preventDefault()
        press()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const progress = state.t / ROUND_SECONDS
  const live = state.phase === 'dating'
  const red = live && state.windowOpen
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight })
  useEffect(() => {
    const on = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  // A hairline around the screen edge that starts at top-centre and runs clockwise.
  const { w, h } = size
  const hairline = `M ${w / 2} 1 H ${w - 1} V ${h - 1} H 1 V 1 Z`

  return (
    <main className={`ss ${red ? 'red' : ''}`} data-phase={state.phase}>
      <div className="stage" aria-hidden={state.phase === 'result' ? true : undefined}>
        <div className="blob b1" /><div className="blob b2" />
        <div className="who"><span className="avatar">{PARTNER.initial}</span><p>{PARTNER.name}</p></div>
        <p className="note">Prototype: video is simulated</p>
      </div>

      <svg className="ring" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
        <path d={hairline} className="track" />
        <path d={hairline} pathLength={1} className="fill" style={{ strokeDashoffset: 1 - progress }} />
      </svg>

      <header className="top">
        <button className="ghost" onClick={onExit}>Leave</button>
        <p className="clock" role="timer" aria-label="Time elapsed">{fmt(state.t)}</p>
      </header>

      {live && card && (
        <div className="card" data-kind={card.kind} key={card.text}>
          <p className="k">{card.kind === 'take' ? 'Hot take' : 'Conversation card'}</p>
          <p className="t">{card.text}</p>
          {card.kind === 'take' && (
            react ? <p className="r">{react === 'Agree' ? 'Now tell them why.' : 'Good. Now convince them.'}</p> : (
              <div className="rx"><button onClick={() => setReact('Agree')}>Agree</button><button onClick={() => setReact('Disagree')}>Disagree</button></div>
            )
          )}
          <button className="x" onClick={() => setCard(null)} aria-label="Put the card away">×</button>
        </div>
      )}

      {live && (
        <footer className="bar">
          <div className="deck">
            <button onClick={() => draw('question')}>Ask me something</button>
            <button onClick={() => draw('take')}>Hot take</button>
          </div>
          <button className={`buzz ${shake ? 'no' : ''}`} onClick={press} aria-disabled={!red}>
            Buzz
          </button>
          <p className="sr" aria-live="polite">{red ? 'Buzzer is live. Press it.' : ''}</p>
        </footer>
      )}

      {(state.phase === 'choice' || state.phase === 'waiting') && (
        <section className="sheet" role="dialog" aria-label="Five minutes">
          <p className="big">5:00</p>
          <h1>You both made it.</h1>
          <p>Keep talking as long as you like, or wrap up here and swap details.</p>
          <div className="row">
            <button className="solid" disabled={state.phase === 'waiting'} onClick={() => choose('keep')}>Keep talking</button>
            <button className="line" disabled={state.phase === 'waiting'} onClick={() => choose('wrap')}>Wrap up</button>
          </div>
          {state.phase === 'waiting' && <p className="hint">Waiting for {PARTNER.name}…</p>}
        </section>
      )}

      {state.phase === 'keeping' && (
        <section className="sheet" role="dialog" aria-label="Keep talking">
          <h1>You both said keep going.</h1>
          <p>No timer now. Talk until you are done.</p>
          <div className="row"><button className="solid" onClick={finishKeeping}>We are done</button></div>
        </section>
      )}

      {state.phase === 'result' && (
        <section className="sheet result" role="dialog" aria-label="Result">
          {unlocked ? (
            <>
              <h1>Unlocked.</h1>
              <p>{PARTNER.name}'s profile and contact are yours.</p>
              <ul className="unlock"><li><span>Name</span><b>{PARTNER.name}</b></li><li><span>Profile</span><b>{PARTNER.line}</b></li><li><span>Contact</span><b>@tomi.designs</b></li></ul>
            </>
          ) : (
            <>
              <h1>{state.outcome?.kind === 'buzzed' && state.outcome.by === 'me' ? 'You buzzed.' : `${PARTNER.name} buzzed.`}</h1>
              <p>No hard feelings. On to the next person.</p>
            </>
          )}
          <div className="row"><button className="solid" onClick={onExit}>Back to my ticket</button></div>
        </section>
      )}
    </main>
  )
}
