import { navigate } from '../lib/transition'
import { useCallback, useEffect, useState } from 'react'
import { remoteEnabled } from '../lib/supabase'
import { fetchPeople, SAMPLE_PEOPLE, type Person } from '../people/people'
import { Avatar } from './Avatar'
import { fetchChats, listenForMessages, SAMPLE_CHATS, whenLabel, type Chat } from './chats'
import { Thread } from './Thread'
import './chats.css'

interface Props {
  userId: string | null
  /** Open this person's conversation straight away (from the People tab). */
  openWith: string | null
  onOpenChange: (open: boolean) => void
  onUnread: (n: number) => void
  onSeeFridays: () => void
}

export function Chats({ userId, openWith, onOpenChange, onUnread, onSeeFridays }: Props) {
  const [chats, setChats] = useState<Chat[] | null>(remoteEnabled ? null : SAMPLE_CHATS)
  const [open, setOpen] = useState<string | null>(openWith)
  const [failed, setFailed] = useState(false)
  const [people, setPeople] = useState<Person[]>(remoteEnabled ? [] : SAMPLE_PEOPLE)
  useEffect(() => { if (remoteEnabled) fetchPeople().then(setPeople).catch(() => {}) }, [])

  const load = useCallback(() => {
    if (!remoteEnabled) return
    fetchChats().then((l) => { setChats(l); setFailed(false) }).catch(() => setFailed(true))
  }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => { onOpenChange(open !== null) }, [open, onOpenChange])
  useEffect(() => { onUnread((chats ?? []).reduce((n, c) => n + c.unread, 0)) }, [chats, onUnread])
  // new messages refresh the inbox
  useEffect(() => (userId ? listenForMessages(userId, () => load()) : undefined), [userId, load])

  const person = chats?.find((c) => c.personId === open)
  const sorted = [...(chats ?? [])].sort((a, b) => (b.lastAt || '').localeCompare(a.lastAt || ''))
  return (
    <div className={`ch-wrap${person ? ' open' : ''}`}>
      <main className="ch">
        <h1 className="ch-h">Chats</h1>
        {!remoteEnabled && <p className="ch-note">Sample conversations, so you can see how this will look.</p>}
        {failed && <p className="ch-empty" role="alert">Could not load your chats. Check your connection and try again.</p>}
        {chats === null && !failed && <p className="ch-empty" aria-busy="true">Loading…</p>}
        {chats?.length === 0 && <p className="ch-empty">No chats yet. After a Friday, the people you both wanted to keep talking to show up here.</p>}
        {chats?.length === 0 && <button type="button" className="empty-cta" onClick={onSeeFridays}>See the Fridays</button>}
        <ul className="ch-list">
          {sorted.map((c) => (
            <li key={c.personId}>
              <button type="button" className={`ch-row${c.unread ? ' new' : ''}${c.personId === open ? ' on' : ''}`} aria-current={c.personId === open ? 'true' : undefined} onClick={() => navigate('drill-in', () => setOpen(c.personId))}>
                <Avatar c={c} />
                <span className="ch-mid">
                  <b>{c.name}</b>
                  <span className="ch-prev">{c.lastBody ? `${c.lastMine ? 'You: ' : ''}${c.lastBody}` : 'Say hello'}</span>
                </span>
                <span className="ch-meta">
                  <time>{whenLabel(c.lastAt)}</time>
                  {c.unread > 0 && <i className="ch-dot" aria-label={`${c.unread} unread`} />}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </main>
      <div className="th-pane">
        {person ? (
          <Thread key={person.personId} me={userId} person={person} info={people.find((x) => x.id === person.personId)} onBack={() => { navigate('drill-out', () => setOpen(null)); load() }} onRead={() => setChats((l) => l && l.map((c) => (c.personId === open ? { ...c, unread: 0 } : c)))} onSent={(body) => setChats((l) => l && l.map((c) => (c.personId === open ? { ...c, lastBody: body, lastAt: new Date().toISOString(), lastMine: true } : c)))} />
        ) : (
          <p className="th-none">Pick a conversation to start talking.</p>
        )}
      </div>
    </div>
  )
}
