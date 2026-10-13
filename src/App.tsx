import { useState } from 'react'
import { Home } from './home/Home'
import { Onboarding } from './onboarding/Onboarding'
import { clearProgress, loadSignedUp, type StepId } from './onboarding/progress'
import './app.css'

type View = { kind: 'onboarding' } | { kind: 'home' } | { kind: 'edit'; step: StepId }

export default function App() {
  const [view, setView] = useState<View>(() => (loadSignedUp() ? { kind: 'home' } : { kind: 'onboarding' }))
  const [round, setRound] = useState(0) // bumps to remount a fresh form after signing out
  const home = () => setView({ kind: 'home' })
  const signedUp = view.kind === 'home' ? loadSignedUp() : null
  return (
    <div className="app-onb">
      {view.kind === 'edit' && <Onboarding key={view.step} edit={view.step} onExit={home} onHome={home} />}
      {signedUp ? (
        <Home profile={signedUp.profile} onEdit={(step) => setView({ kind: 'edit', step })} onSignOut={() => { clearProgress(); setRound((n) => n + 1); setView({ kind: 'onboarding' }) }} />
      ) : (
        view.kind !== 'edit' && <Onboarding key={round} onHome={home} />
      )}
    </div>
  )
}
