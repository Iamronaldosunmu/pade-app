import { useState } from 'react'
import { SessionScreen } from './session/SessionScreen'
import { Onboarding } from './onboarding/Onboarding'
import './app.css'

export default function App() {
  const [round, setRound] = useState<{ seed: number } | null>(null)
  return (
    <>
      {/* Stays mounted so the ticket survives a practice call. */}
      <div className="app-onb" hidden={round !== null}>
        <Onboarding onPractice={() => setRound({ seed: Math.floor(Math.random() * 1e6) })} />
      </div>
      {round && <SessionScreen key={round.seed} seed={round.seed} speed={10} onExit={() => setRound(null)} />}
    </>
  )
}
