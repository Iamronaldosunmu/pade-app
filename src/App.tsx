import { useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { fetchProfile } from './db/profiles'
import { Home } from './home/Home'
import { People } from './people/People'
import { firstName, signOutRemote, type Provider } from './onboarding/auth'
import { Onboarding } from './onboarding/Onboarding'
import { clearProgress, loadProgress, loadSignedUp, SAVE_KEY, STEPS, type StepId } from './onboarding/progress'
import type { Profile } from './onboarding/types'
import { supabase, remoteEnabled } from './lib/supabase'
import './app.css'

type Tab = 'home' | 'people'
type View = { kind: 'onboarding' } | { kind: 'home' } | { kind: 'edit'; step: StepId }

const store = (i: number, p: Profile) => { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ i, p })) } catch { /* private mode */ } }

export default function App() {
  const [view, setView] = useState<View>(() => (loadSignedUp() ? { kind: 'home' } : { kind: 'onboarding' }))
  const [tab, setTab] = useState<Tab>('home')
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
          {tab === 'home' ? (
            <Home profile={signedUp.profile} userId={uid} onEdit={(step) => setView({ kind: 'edit', step })} onSignOut={() => { void signOutRemote(); clearProgress(); setTab('home'); setRound((n) => n + 1); setView({ kind: 'onboarding' }) }} />
          ) : <People />}
          <nav className="tabs" aria-label="Main">
            <button type="button" aria-current={tab === 'home' ? 'page' : undefined} onClick={() => setTab('home')}>Home</button>
            <button type="button" aria-current={tab === 'people' ? 'page' : undefined} onClick={() => setTab('people')}>People</button>
          </nav>
        </>
      ) : (
        view.kind !== 'edit' && <Onboarding key={round} onHome={home} />
      )}
    </div>
  )
}
