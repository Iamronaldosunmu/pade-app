import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { remoteEnabled } from '../lib/supabase'
import { contactUrl, NETWORK, type Person } from '../people/people'
import { Avatar } from './Avatar'
import { blockPerson, cleanMessage, dayLabel, fetchThread, layoutThread, listenForMessages, markRead, MAX_LEN, openers, reportPerson, SAMPLE_THREADS, sendMessage, whenLabel, type Chat, type Msg } from './chats'

const REPLIES = ['Ha, that is fair.', 'Okay now I am curious. Tell me more?', 'Saturday could work. What time were you thinking?', 'You are funnier in text than I expected.']

interface Props {
  me: string | null
  person: Chat
  info?: Person
  onBack: () => void
  onRead: () => void
  onSent: (body: string) => void
}

export function Thread({ me, person, info, onBack, onRead, onSent }: Props) {
  const [msgs, setMsgs] = useState<Msg[]>(remoteEnabled ? [] : SAMPLE_THREADS[person.personId] ?? [])
  const [loaded, setLoaded] = useState(!remoteEnabled)
  const [draft, setDraft] = useState('')
  const [err, setErr] = useState('')
  const [typing, setTyping] = useState(false)
  const [menu, setMenu] = useState<'closed' | 'open' | 'report' | 'done'>('closed')
  const [newBelow, setNewBelow] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const field = useRef<HTMLTextAreaElement>(null)
  const atBottom = useRef(true)
  const replyAt = useRef(0)

  useEffect(() => {
    if (!me) { onRead(); return }
    let live = true
    fetchThread(me, person.personId)
      .then((l) => { if (live) { setMsgs(l); setLoaded(true); void markRead(me, person.personId); onRead() } })
      .catch(() => { if (live) { setLoaded(true); setErr('Could not load this conversation.') } })
    const stop = listenForMessages(me, (m) => {
      if (m.from !== person.personId) return
      setMsgs((l) => (l.some((x) => x.id === m.id) ? l : [...l, m]))
      void markRead(me, person.personId)
    })
    return () => { live = false; stop() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, person.personId])
  useEffect(() => { onRead() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const count = msgs.length
  const lastMine = msgs[msgs.length - 1]?.mine ?? false
  // stay at the bottom while you are there; otherwise offer a way back down
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    if (atBottom.current || lastMine) { el.scrollTop = el.scrollHeight; setNewBelow(false) } else if (count > 0) setNewBelow(true)
  }, [count, lastMine, typing])
  const onScroll = () => {
    const el = box.current
    if (!el) return
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    if (atBottom.current) setNewBelow(false)
  }
  const toBottom = () => box.current?.scrollTo({ top: box.current.scrollHeight, behavior: 'smooth' })

  const rows = useMemo(() => layoutThread(msgs), [msgs])

  const deliver = async (id: string, body: string) => {
    try {
      const m = me ? await sendMessage(me, person.personId, body) : { id, mine: true, body, at: new Date().toISOString() }
      setMsgs((l) => l.map((x) => (x.id === id ? m : x)))
      onSent(body)
      if (!me) {
        // preview only: a sample person answers so the typing indicator and incoming bubble can be seen
        window.setTimeout(() => setTyping(true), 500)
        window.setTimeout(() => {
          setTyping(false)
          const reply = REPLIES[replyAt.current++ % REPLIES.length] ?? ''
          setMsgs((l) => [...l, { id: `r${Date.now()}`, mine: false, body: reply, at: new Date().toISOString() }])
        }, 2300)
      }
    } catch {
      setMsgs((l) => l.map((x) => (x.id === id ? { ...x, status: 'failed' } : x)))
    }
  }
  const send = (e?: React.FormEvent) => {
    e?.preventDefault()
    const body = cleanMessage(draft)
    if (!body) return
    const id = `p${Date.now()}`
    setErr(''); setDraft('')
    setMsgs((l) => [...l, { id, mine: true, body, at: new Date().toISOString(), status: 'sending' }])
    void deliver(id, body)
  }
  const retry = (m: Msg) => {
    setMsgs((l) => l.map((x) => (x.id === m.id ? { ...x, status: 'sending' } : x)))
    void deliver(m.id, m.body)
  }
  const block = async () => { if (me) await blockPerson(me, person.personId).catch(() => {}); setMenu('done') }
  const report = async (reason: string) => { if (me) await reportPerson(me, person.personId, reason).catch(() => {}); setMenu('done') }
  const pickOpener = (t: string) => { setDraft(t); field.current?.focus() }

  const metOn = info ? dayLabel(info.metOn) : ''
  const left = MAX_LEN - draft.length

  return (
    <section className="th" aria-label={`Conversation with ${person.name}`}>
      <header className="th-top">
        <button type="button" className="th-back" onClick={onBack} aria-label="Back to chats">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
        </button>
        <Avatar c={person} size={46} />
        <div className="th-who">
          <h1>{person.name}</h1>
          {info && <p>Met {metOn}</p>}
        </div>
        {info && (
          <a className="th-net" href={contactUrl(info.contactKind, info.handle)} target="_blank" rel="noopener noreferrer" aria-label={`Open ${person.name} on ${NETWORK[info.contactKind]}`}>{NETWORK[info.contactKind]}</a>
        )}
        <button type="button" className="th-more" aria-label="Block or report" aria-expanded={menu !== 'closed'} onClick={() => setMenu(menu === 'closed' ? 'open' : 'closed')}>
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

      <div className="th-msgs" ref={box} onScroll={onScroll} role="log" aria-live="polite" aria-busy={!loaded}>
        <div className="th-intro">
          <Avatar c={person} size={84} />
          <h2>{person.name}{info && <span>{info.age}</span>}</h2>
          {info && <p className="th-line">{info.work} · {info.area}</p>}
          {info?.takes[0] && <p className="th-take">“{info.takes[0]}”</p>}
          {info && <p className="th-met">You met on {metOn}</p>}
        </div>
        {rows.map((r) =>
          r.kind === 'day' ? (
            <p key={r.key} className="th-day">{r.label}</p>
          ) : (
            <div key={r.key} className={`th-row${r.msg.mine ? ' mine' : ''}${r.first ? ' first' : ''}${r.last ? ' last' : ''}`}>
              <p className={`th-b${r.msg.status ? ` ${r.msg.status}` : ''}`}>{r.msg.body}</p>
              {r.msg.status === 'failed' ? (
                <button type="button" className="th-retry" onClick={() => retry(r.msg)}>Not sent. Tap to try again</button>
              ) : r.last && <time className="th-t">{r.msg.status === 'sending' ? 'Sending…' : whenLabel(r.msg.at)}</time>}
            </div>
          ),
        )}
        {typing && <div className="th-row last first"><p className="th-b th-typing" aria-label={`${person.name} is typing`}><i /><i /><i /></p></div>}
      </div>
      {newBelow && <button type="button" className="th-new" onClick={toBottom}>New message</button>}

      {err && <p className="th-err" role="alert">{err}</p>}
      {loaded && msgs.length === 0 && (
        <div className="th-open" role="group" aria-label="Ways to start">
          {openers(info?.takes[0]).map((t) => <button key={t} type="button" onClick={() => pickOpener(t)}>{t}</button>)}
        </div>
      )}
      <form className="th-form" onSubmit={send}>
        <label className="sr" htmlFor="th-in">Message {person.name}</label>
        <div className="th-box">
          <textarea id="th-in" ref={field} rows={1} maxLength={MAX_LEN} placeholder={`Message ${person.name}`} value={draft} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); e.currentTarget.form?.requestSubmit() } }} />
          {left < 150 && <span className="th-left" aria-live="polite">{left}</span>}
          <button type="submit" aria-disabled={!cleanMessage(draft)} aria-label="Send">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
          </button>
        </div>
      </form>
    </section>
  )
}
