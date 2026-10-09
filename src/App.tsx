import { useState } from 'react'
import { SessionScreen } from './session/SessionScreen'
import './app.css'

const SPEEDS = [
  { label: 'Real time', value: 1 },
  { label: '10× faster', value: 10 },
  { label: '30× faster', value: 30 },
]

export default function App() {
  const [round, setRound] = useState<{ seed: number; speed: number } | null>(null)
  const [speed, setSpeed] = useState(10)

  if (round) return <SessionScreen key={round.seed} seed={round.seed} speed={round.speed} onExit={() => setRound(null)} />

  return (
    <main className="lobby">
      <p className="wm" aria-label="Pàdé">P<i>à</i>d<i>é</i></p>
      <h1>Practice round</h1>
      <p className="lede">One five-minute call with a simulated partner. The buzzer works only when the screen turns red.</p>
      <div className="speeds" role="group" aria-label="Round speed">
        {SPEEDS.map((s) => (
          <button key={s.value} aria-pressed={speed === s.value} onClick={() => setSpeed(s.value)}>{s.label}</button>
        ))}
      </div>
      <button className="go" onClick={() => setRound({ seed: Math.floor(Math.random() * 1e6), speed })}>Start</button>
    </main>
  )
}
