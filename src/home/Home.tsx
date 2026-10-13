import { useEffect, useState } from 'react'
import { Ticket } from '../onboarding/Ticket'
import type { StepId } from '../onboarding/progress'
import { currentSession, googleCalendarUrl, sessionLabel } from '../onboarding/session-time'
import type { Profile } from '../onboarding/types'
import './home.css'

const NET: Record<Profile['contactKind'], string> = { instagram: 'Instagram', x: 'X', snapchat: 'Snapchat' }

/** Time left as days, hours, minutes and seconds, ticking once a second. */
function useCountdown(target: Date) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const left = Math.max(0, Math.floor((target.getTime() - now) / 1000))
  return { d: Math.floor(left / 86400), h: Math.floor((left % 86400) / 3600), m: Math.floor((left % 3600) / 60), s: left % 60, now }
}

const two = (n: number) => String(n).padStart(2, '0')

function loadGoing(key: string): boolean {
  try { return localStorage.getItem(key) !== 'no' } catch { return true }
}

export function Home({ profile, onEdit, onSignOut }: { profile: Profile; onEdit: (s: StepId) => void; onSignOut: () => void }) {
  const [sess] = useState(() => currentSession(new Date()))
  const clock = useCountdown(sess.start)
  // the session may start while the page is open
  const live = sess.live || clock.now >= sess.start.getTime()
  const goKey = `pade.going.${sess.start.toISOString()}`
  const [going, setGoing] = useState(() => loadGoing(goKey))
  const flip = () => {
    setGoing((g) => {
      try { localStorage.setItem(goKey, g ? 'no' : 'yes') } catch { /* private mode */ }
      return !g
    })
  }

  const rows: { step: StepId; label: string; value: string }[] = [
    { step: 'name', label: 'Name', value: profile.name },
    { step: 'age', label: 'Age', value: profile.age === null ? 'Not added' : String(profile.age) },
    { step: 'area', label: 'Where in Lagos', value: profile.area },
    { step: 'work', label: 'What you do', value: profile.work || 'Not added' },
    { step: 'takes', label: 'Hot take', value: profile.takes.length ? profile.takes.map((t) => `“${t}”`).join(' ') : 'Not added' },
    { step: 'contact', label: 'Find me on', value: profile.handle ? `${NET[profile.contactKind]} @${profile.handle}` : 'Not added' },
    { step: 'photo', label: 'Photo', value: profile.photo ? 'Sealed until 5:00' : 'Not added' },
  ]

  return (
    <div className="hm">
      <header className="hm-top">
        <span className="wm" aria-label="Pàdé">P<i>à</i>d<i>é</i></span>
        <button type="button" className="hm-out" onClick={onSignOut}>Sign out</button>
      </header>

      <main className="hm-main">
        <h1 className="hm-hi">Hi, {profile.name}.</h1>

        <section className={`hm-card hm-next${going ? '' : ' off'}`} aria-labelledby="hm-next-h">
          <p className="hm-eyebrow" id="hm-next-h">{live ? 'Happening now' : 'Next Friday'}</p>
          <p className="hm-when">{sessionLabel(sess.start)}, Lagos</p>
          {live ? (
            <p className="hm-live"><i aria-hidden="true" />Doors are open</p>
          ) : (
            <div className="hm-clock" role="timer" aria-label="Time until the next Friday">
              {([[clock.d, 'days'], [clock.h, 'hrs'], [clock.m, 'min'], [clock.s, 'sec']] as const).map(([n, l]) => (
                <div key={l}><b>{two(n)}</b><span>{l}</span></div>
              ))}
            </div>
          )}
          <button type="button" className="hm-switch" role="switch" aria-checked={going} onClick={flip}>
            <span>{going ? 'I am coming' : 'Skipping this one'}</span><i aria-hidden="true" />
          </button>
        </section>

        <section className="hm-ticket" aria-label="Your ticket">
          <Ticket profile={profile} when={sess.start} full printed />
        </section>

        <section className="hm-card" aria-labelledby="hm-det-h">
          <h2 className="hm-h" id="hm-det-h">Your details</h2>
          <ul className="hm-rows">
            {rows.map((r) => (
              <li key={r.step}>
                <button type="button" onClick={() => onEdit(r.step)} aria-label={`Edit ${r.label}: ${r.value}`}>
                  <span className="hm-l">{r.label}</span>
                  <span className={`hm-v${r.value === 'Not added' ? ' none' : ''}`}>{r.value}</span>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="hm-card" aria-labelledby="hm-fri-h">
          <h2 className="hm-h" id="hm-fri-h">Before Friday</h2>
          <ul className="hm-tips">
            <li>Find somewhere quiet, with decent signal.</li>
            <li>Charge your phone, or plug it in.</li>
            <li>Headphones make the five minutes feel closer.</li>
          </ul>
        </section>

        <nav className="hm-links" aria-label="More">
          <button type="button" onClick={() => onEdit('ticket')}>Share my ticket</button>
          <a href={googleCalendarUrl(sess.start)} target="_blank" rel="noopener noreferrer">Add to Google Calendar</a>
        </nav>
      </main>
    </div>
  )
}
