import { useEffect, useState } from 'react'
import { fetchGoing, saveGoing } from '../db/profiles'
import { currentSession, googleCalendarUrl, sessionLabel } from '../onboarding/session-time'
import type { Profile } from '../onboarding/types'
import './home.css'


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


/** Whether you are coming to one Friday: remembered on this device and, with an account, saved there too. */
function useGoing(start: Date, userId: string | null) {
  const key = `pade.going.${start.toISOString()}`
  const [going, setGoing] = useState(() => loadGoing(key))
  const flip = () => {
    const next = !going
    setGoing(next)
    try { localStorage.setItem(key, next ? 'yes' : 'no') } catch { /* private mode */ }
    if (userId) void saveGoing(userId, start, next).catch(() => {})
  }
  // another device may have changed it
  useEffect(() => {
    if (!userId) return
    void fetchGoing(userId, start).then((g) => { if (g !== null) setGoing(g) }).catch(() => {})
  }, [userId, start])
  return [going, flip] as const
}

const short = (d: Date) => new Date(d.getTime() + 3600_000).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })

function Upcoming({ start, userId }: { start: Date; userId: string | null }) {
  const [going, flip] = useGoing(start, userId)
  return (
    <li>
      <span className="hm-l">{short(start)}</span>
      <button type="button" className="hm-mini" role="switch" aria-checked={going} aria-label={`Coming on ${sessionLabel(start)}`} onClick={flip}>
        <span>{going ? 'Coming' : 'Skipping'}</span><i aria-hidden="true" />
      </button>
    </li>
  )
}

const Top = ({ children }: { children?: React.ReactNode }) => (
  <header className="hm-top">
    <span className="wm" aria-label="Pàdé">P<i>à</i>d<i>é</i></span>
    {children}
  </header>
)

export function Fridays({ profile, userId = null }: { profile: Profile; userId?: string | null }) {
  const [sess] = useState(() => currentSession(new Date()))
  const clock = useCountdown(sess.start)
  // the session may start while the page is open
  const live = sess.live || clock.now >= sess.start.getTime()
  const [going, flip] = useGoing(sess.start, userId)
  const later = [1, 2, 3].map((n) => new Date(sess.start.getTime() + n * 7 * 86400_000))

  return (
    <div className="hm">
      <Top />
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

        <section className="hm-card" aria-labelledby="hm-up-h">
          <h2 className="hm-h" id="hm-up-h">Coming up</h2>
          <ul className="hm-up">
            {later.map((d) => <Upcoming key={d.toISOString()} start={d} userId={userId} />)}
          </ul>
          <a className="hm-cal" href={googleCalendarUrl(sess.start)} target="_blank" rel="noopener noreferrer">Add every Friday to Google Calendar</a>
        </section>

        <section className="hm-card" aria-labelledby="hm-fri-h">
          <h2 className="hm-h" id="hm-fri-h">Before Friday</h2>
          <ul className="hm-tips">
            <li>Find somewhere quiet, with decent signal.</li>
            <li>Charge your phone, or plug it in.</li>
            <li>Headphones make the five minutes feel closer.</li>
          </ul>
        </section>
      </main>
    </div>
  )
}
