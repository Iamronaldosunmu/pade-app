import { useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { fetchProfile } from './db/profiles'
import { Fridays } from './home/Fridays'
import { Me } from './home/Me'
import { People } from './people/People'
import { firstName, signOutRemote, type Provider } from './onboarding/auth'
import { Onboarding } from './onboarding/Onboarding'
import { clearProgress, loadProgress, loadSignedUp, SAVE_KEY, STEPS, type StepId } from './onboarding/progress'
import type { Profile } from './onboarding/types'
import { supabase, remoteEnabled } from './lib/supabase'
import './app.css'

type Tab = 'fridays' | 'people' | 'me'
type View = { kind: 'onboarding' } | { kind: 'home' } | { kind: 'edit'; step: StepId }

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'fridays', label: 'Fridays', icon: <><rect x="3.5" y="5" width="17" height="15" rx="3.5" /><path d="M8 3v4M16 3v4M3.5 10h17" /></> },
  { id: 'people', label: 'People', icon: <><circle cx="9" cy="9" r="3.4" /><path d="M2.8 19.5c.6-3.3 3-5 6.2-5s5.6 1.7 6.2 5" /><path d="M16 6.2a3.2 3.2 0 0 1 0 5.6M18.4 14.9c1.6.7 2.6 2.1 2.9 4.3" /></> },
  { id: 'me', label: 'Me', icon: <><circle cx="12" cy="8.5" r="3.8" /><path d="M4.5 20c.8-4 3.6-6 7.5-6s6.7 2 7.5 6" /></> },
]

const store = (i: number, p: Profile) => { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ i, p })) } catch { /* private mode */ } }

export default function App() {
  const [view, setView] = useState<View>(() => (loadSignedUp() ? { kind: 'home' } : { kind: 'onboarding' }))
  const [tab, setTab] = useState<Tab>('fridays')
  const [round, setRound] = useState(0) // bumps to remount a fresh form after signing in or out
  const [ready, setReady] = useState(!remoteEnabled)
  const userId = useRef<string | null>(null)
  const [uid, setUid] = useState<string | null>(null)

  // With a real backend, the account decides what you see: a saved profile means home, otherwise carry on signing up.
  useEffect(() => {
    if (!supabase) return
    const sync = async (session: Session | null) => {
      userId.current = session?.user.id ?? null
      setUid(userId.current)
      if (!session) {
        if (loadProgress().i > 0) { clearProgress(); setRound((n) => n + 1); setView({ kind: 'onboarding' }) }
        setReady(true)
        return
      }
      const provider: Provider = session.user.app_metadata.provider === 'google' ? 'google' : 'email'
      try {
        const saved = await fetchProfile(session.user.id, provider)
        if (saved) {
          store(STEPS.length - 1, saved)
          setView({ kind: 'home' })
        } else {
          const { i, p } = loadProgress()
          const given = firstName(String(session.user.user_metadata?.full_name ?? ''))
          store(Math.max(i, 1), { ...p, provider, name: p.name || given })
          setView({ kind: 'onboarding' })
        }
        setRound((n) => n + 1)
      } catch { /* offline: keep what is on this device */ }
      setReady(true)
    }
    void supabase.auth.getSession().then(({ data }) => sync(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') void sync(null)
      else if (event === 'SIGNED_IN' && session && session.user.id !== userId.current) void sync(session)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const home = () => setView({ kind: 'home' })
  const signedUp = view.kind === 'home' ? loadSignedUp() : null
  if (!ready) return <div className="app-onb" aria-busy="true" />
  return (
    <div className="app-onb">
      {view.kind === 'edit' && <Onboarding key={view.step} edit={view.step} onExit={home} onHome={home} />}
      {signedUp ? (
        <>
          {tab === 'fridays' && <Fridays profile={signedUp.profile} userId={uid} />}
          {tab === 'people' && <People />}
          {tab === 'me' && <Me profile={signedUp.profile} onEdit={(step) => setView({ kind: 'edit', step })} onSignOut={() => { void signOutRemote(); clearProgress(); setTab('fridays'); setRound((n) => n + 1); setView({ kind: 'onboarding' }) }} />}
          <nav className="tabs" aria-label="Main">
            <span className="tabs-pill" aria-hidden="true" style={{ transform: `translateX(${TABS.findIndex((t) => t.id === tab) * 100}%)` }} />
            {TABS.map((t) => (
              <button key={t.id} type="button" aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{t.icon}</svg>
                <span>{t.label}</span>
              </button>
            ))}
          </nav>
        </>
      ) : (
        view.kind !== 'edit' && <Onboarding key={round} onHome={home} />
      )}
    </div>
  )
}
