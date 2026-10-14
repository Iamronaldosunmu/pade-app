import { useState } from 'react'
import { Ticket } from '../onboarding/Ticket'
import type { StepId } from '../onboarding/progress'
import { currentSession } from '../onboarding/session-time'
import { INTENTS, PACES } from '../onboarding/data'
import type { Profile } from '../onboarding/types'
import './home.css'

const NET: Record<Profile['contactKind'], string> = { instagram: 'Instagram', x: 'X', snapchat: 'Snapchat' }

type Row = { step: StepId; label: string; value: string }

function Rows({ list, onEdit }: { list: Row[]; onEdit: (s: StepId) => void }) {
  return (
    <ul className="hm-rows">
      {list.map((r) => (
        <li key={r.step}>
          <button type="button" onClick={() => onEdit(r.step)} aria-label={`Edit ${r.label}: ${r.value}`}>
            <span className="hm-l">{r.label}</span>
            <span className={`hm-v${r.value === 'Not added' ? ' none' : ''}`}>{r.value}</span>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
          </button>
        </li>
      ))}
    </ul>
  )
}

export function Me({ profile, onEdit, onSignOut }: { profile: Profile; onEdit: (s: StepId) => void; onSignOut: () => void }) {
  const [sess] = useState(() => currentSession(new Date()))
  const rows: { step: StepId; label: string; value: string }[] = [
    { step: 'name', label: 'Name', value: profile.name },
    { step: 'age', label: 'Age', value: profile.age === null ? 'Not added' : String(profile.age) },
    { step: 'area', label: 'Where in Lagos', value: profile.area },
    { step: 'work', label: 'What you do', value: profile.work || 'Not added' },
    { step: 'takes', label: 'Hot take', value: profile.takes.length ? profile.takes.map((t) => `“${t}”`).join(' ') : 'Not added' },
    { step: 'contact', label: 'Find me on', value: profile.handle ? `${NET[profile.contactKind]} @${profile.handle}` : 'Not added' },
    { step: 'photo', label: 'Photo', value: profile.photo ? 'Sealed until 5:00' : 'Not added' },
  ]

  const answers: { step: StepId; label: string; value: string }[] = [
    { step: 'here', label: 'Here for', value: INTENTS.find((o) => o.id === profile.intent)?.label ?? 'Not added' },
    { step: 'topics', label: 'Likes talking about', value: profile.topics.length ? profile.topics.join(', ') : 'Not added' },
    { step: 'pace', label: 'With new people', value: PACES.find((o) => o.id === profile.pace)?.label ?? 'Not added' },
  ]
  const blank = answers.filter((r) => r.value === 'Not added').length
  return (
    <div className="hm">
      <header className="hm-top">
        <span className="wm" aria-label="Pàdé">P<i>à</i>d<i>é</i></span>
      </header>
      <main className="hm-main">
        

        <section className="hm-ticket" aria-label="Your ticket">
          <Ticket profile={profile} when={sess.start} full printed />
        </section>

        <section className="hm-sec" aria-labelledby="hm-det-h">
          <h2 className="hm-h" id="hm-det-h">Your details</h2>
          <Rows list={rows} onEdit={onEdit} />
        </section>

        <section className="hm-sec" aria-labelledby="hm-ans-h">
          <h2 className="hm-h" id="hm-ans-h">Your answers</h2>
          <p className="hm-sub">{blank > 0 ? `${blank} still blank. Private, and only used to decide who you meet.` : 'Private. Only used to decide who you meet.'}</p>
          <Rows list={answers} onEdit={onEdit} />
        </section>

        <nav className="hm-links" aria-label="More">
          <button type="button" onClick={() => onEdit('ticket')}>Share my ticket</button>
          <button type="button" onClick={onSignOut}>Sign out</button>
        </nav>
      </main>
    </div>
  )
}
