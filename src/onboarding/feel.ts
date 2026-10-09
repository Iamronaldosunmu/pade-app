const KEY = 'pade.sound'
let ctx: AudioContext | null = null

export function soundOn(): boolean {
  try { return localStorage.getItem(KEY) !== 'off' } catch { return true }
}
export function setSound(on: boolean) {
  try { localStorage.setItem(KEY, on ? 'on' : 'off') } catch { /* private mode */ }
}

export function haptic(ms: number | number[] = 12) {
  try { navigator.vibrate?.(ms) } catch { /* unsupported */ }
}

/** A tiny sine blip. Quiet on purpose; skipped when sound is off. */
export function tone(freq: number, ms = 90, gain = 0.04) {
  if (!soundOn()) return
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx ??= new AC()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.value = freq
    g.gain.setValueAtTime(gain, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms / 1000)
    o.connect(g).connect(ctx.destination)
    o.start()
    o.stop(ctx.currentTime + ms / 1000)
  } catch { /* audio blocked */ }
}

export const tick = () => { haptic(8); tone(660, 60) }
export const thud = () => { haptic([20, 30, 20]); tone(180, 140, 0.06) }
export const chime = () => { haptic(18); tone(784, 120); setTimeout(() => tone(1175, 180), 90) }
export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
