import { useCallback, useEffect, useRef, useState } from 'react'
import { remoteEnabled } from '../lib/supabase'
import { blockPerson, cleanMessage, fetchChats, fetchThread, listenForMessages, markRead, MAX_LEN, reportPerson, SAMPLE_CHATS, SAMPLE_THREADS, sendMessage, whenLabel, type Chat, type Msg } from './chats'
import './chats.css'

const Avatar = ({ c, big }: { c: Pick<Chat, 'name' | 'photo'>; big?: boolean }) =>
  c.photo ? <img className={`ch-av${big ? ' big' : ''}`} src={c.photo} alt="" /> : <span className={`ch-av ch-init${big ? ' big' : ''}`} aria-hidden="true">{c.name.slice(0, 1).toUpperCase()}</span>

interface Props {
  userId: string | null
  /** Open this person's conversation straight away (from the People tab). */
  openWith: string | null
  onOpenChange: (open: boolean) => void
  onUnread: (n: number) => void
}

export function Chats({ userId, openWith, onOpenChange, onUnread }: Props) {
  const [chats, setChats] = useState<Chat[] | null>(remoteEnabled ? null : SAMPLE_CHATS)
  const [open, setOpen] = useState<string | null>(openWith)
  const [failed, setFailed] = useState(false)

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
  if (open && person) {
    return <Thread me={userId} person={person} onBack={() => { setOpen(null); load() }} onRead={() => setChats((l) => l && l.map((c) => (c.personId === open ? { ...c, unread: 0 } : c)))} onSent={(body) => setChats((l) => l && l.map((c) => (c.personId === open ? { ...c, lastBody: body, lastAt: new Date().toISOString(), lastMine: true } : c)))} />
  }

  const sorted = [...(chats ?? [])].sort((a, b) => (b.lastAt || '').localeCompare(a.lastAt || ''))
  return (
    <main className="ch">
      <h1 className="ch-h">Chats</h1>
      {!remoteEnabled && <p className="ch-note">Sample conversations, so you can see how this will look.</p>}
      {failed && <p className="ch-empty" role="alert">Could not load your chats. Check your connection and try again.</p>}
      {chats === null && !failed && <p className="ch-empty" aria-busy="true">Loading…</p>}
      {chats?.length === 0 && <p className="ch-empty">No chats yet. After a Friday, the people you both wanted to keep talking to show up here.</p>}
      <ul className="ch-list">
        {sorted.map((c) => (
          <li key={c.personId}>
            <button type="button" className={`ch-row${c.unread ? ' new' : ''}`} onClick={() => setOpen(c.personId)}>
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
  )
}

function Thread({ me, person, onBack, onRead, onSent }: { me: string | null; person: Chat; onBack: () => void; onRead: () => void; onSent: (body: string) => void }) {
  const [msgs, setMsgs] = useState<Msg[]>(remoteEnabled ? [] : SAMPLE_THREADS[person.personId] ?? [])
  const [draft, setDraft] = useState('')
  const [err, setErr] = useState('')
  const [menu, setMenu] = useState<'closed' | 'open' | 'report' | 'done'>('closed')
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!me) { onRead(); return }
    let live = true
    fetchThread(me, person.personId).then((l) => { if (live) { setMsgs(l); void markRead(me, person.personId); onRead() } }).catch(() => live && setErr('Could not load this conversation.'))
    const stop = listenForMessages(me, (m) => {
      if (m.from !== person.personId) return
      setMsgs((l) => (l.some((x) => x.id === m.id) ? l : [...l, m]))
      void markRead(me, person.personId)
    })
    return () => { live = false; stop() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, person.personId])
  useEffect(() => { onRead() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [msgs.length])

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    const body = cleanMessage(draft)
    if (!body) return
    setErr(''); setDraft('')
    try {
      const m = me ? await sendMessage(me, person.personId, body) : { id: `l${Date.now()}`, mine: true, body, at: new Date().toISOString() }
      setMsgs((l) => [...l, m]); onSent(body)
    } catch { setDraft(body); setErr('Could not send. Check your connection, or they may have blocked messages.') }
  }
  const block = async () => { if (me) await blockPerson(me, person.personId).catch(() => {}); setMenu('done') }
  const report = async (reason: string) => { if (me) await reportPerson(me, person.personId, reason).catch(() => {}); setMenu('done') }

  return (
    <section className="th" aria-label={`Conversation with ${person.name}`}>
      <header className="th-top">
        <button type="button" className="th-back" onClick={onBack} aria-label="Back to chats">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
        </button>
        <Avatar c={person} />
        <h1>{person.name}</h1>
        <button type="button" className="th-more" aria-label="Block or report" aria-expanded={menu === 'open'} onClick={() => setMenu(menu === 'closed' ? 'open' : 'closed')}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
        </button>
      </header>
      {menu !== 'closed' && (
        <div className="th-menu" role="group" aria-label="Safety">
          {menu === 'open' && (<>
            <button type="button" onClick={() => setMenu('report')}>Report {person.name}</button>
            <button type="button" onClick={block}>Block {person.name}</button>
          </>)}
          {menu === 'report' && (<>
            <p>What happened?</p>
            {['Rude or harassing', 'Fake or spam', 'Made me uncomfortable', 'Something else'].map((r) => <button key={r} type="button" onClick={() => report(r)}>{r}</button>)}
          </>)}
          {menu === 'done' && <p role="status">Done. Our team will look at it, and you will not hear from {person.name} again unless you unblock.</p>}
        </div>
      )}
      <div className="th-msgs" role="log" aria-live="polite">
        {msgs.length === 0 && <p className="th-empty">You met {person.name} on a Friday. Say hello.</p>}
        {msgs.map((m) => (
          <p key={m.id} className={`th-b${m.mine ? ' mine' : ''}`}>{m.body}<time>{whenLabel(m.at)}</time></p>
        ))}
        <div ref={end} />
      </div>
      {err && <p className="th-err" role="alert">{err}</p>}
      <form className="th-form" onSubmit={send}>
        <label className="sr" htmlFor="th-in">Message {person.name}</label>
        <textarea id="th-in" rows={1} maxLength={MAX_LEN} placeholder="Write a message" value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); e.currentTarget.form?.requestSubmit() } }} />
        <button type="submit" aria-disabled={!cleanMessage(draft)} aria-label="Send">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
        </button>
      </form>
    </section>
  )
}
