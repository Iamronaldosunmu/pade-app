import { useEffect, useState } from 'react'
import { remoteEnabled } from '../lib/supabase'
import { contactUrl, fetchPeople, NETWORK, SAMPLE_PEOPLE, type Person } from './people'
import './people.css'

const met = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' })

export function People({ onMessage, onSeeFridays }: { onMessage: (personId: string) => void; onSeeFridays: () => void }) {
  const [list, setList] = useState<Person[] | null>(remoteEnabled ? null : SAMPLE_PEOPLE)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (!remoteEnabled) return
    let live = true
    fetchPeople().then((l) => live && setList(l)).catch(() => live && setFailed(true))
    return () => { live = false }
  }, [])

  return (
    <main className="pp">
      <h1 className="pp-h">People you connected with</h1>
      {!remoteEnabled && <p className="pp-sample">Sample people, so you can see how this will look.</p>}
      {failed && <p className="pp-empty" role="alert">Could not load your people. Check your connection and try again.</p>}
      {list === null && !failed && <p className="pp-empty" aria-busy="true">Loading…</p>}
      {list?.length === 0 && (
        <p className="pp-empty">Nobody here yet. After a Friday, the people you both wanted to keep talking to will show up here, with a way to reach them.</p>
      )}
      {list?.length === 0 && <button type="button" className="empty-cta" onClick={onSeeFridays}>See the Fridays</button>}
      <ul className="pp-list">
        {list?.map((x) => (
          <li key={x.id} className="pp-card">
            <div className="pp-top">
              {x.photo ? <img className="pp-av" src={x.photo} alt="" /> : <span className="pp-av pp-init" aria-hidden="true">{x.name.slice(0, 1).toUpperCase()}</span>}
              <div className="pp-who">
                <h2>{x.name}<span>{x.age}</span></h2>
                <p>{x.area} · {x.work}</p>
              </div>
            </div>
            {x.takes[0] && <p className="pp-take">“{x.takes[0]}”</p>}
            <div className="pp-foot">
              <span className="pp-date">{met(x.metOn)}</span>
              <div className="pp-acts">
                <a className="pp-say ghost" href={contactUrl(x.contactKind, x.handle)} target="_blank" rel="noopener noreferrer" aria-label={`Open ${x.name} on ${NETWORK[x.contactKind]}`}>{NETWORK[x.contactKind]}</a>
                <button type="button" className="pp-msg" onClick={() => onMessage(x.id)}>Message</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
