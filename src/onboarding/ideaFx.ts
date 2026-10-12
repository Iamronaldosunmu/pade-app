/** How "Need an idea?" swaps the text. Several are kept so they can be compared; the app uses one. */
export type IdeaFx = 'blur' | 'words' | 'type' | 'roll' | 'decode'

export const IDEA_FX: { id: IdeaFx; label: string; note: string }[] = [
  { id: 'blur', label: 'Blur', note: 'The old line blurs away, the new one comes into focus.' },
  { id: 'words', label: 'Words', note: 'The new line rises in one word at a time.' },
  { id: 'type', label: 'Type', note: 'The old line is wiped, the new one is typed out.' },
  { id: 'roll', label: 'Roll', note: 'The old line rolls up and out, the new one rolls in from below.' },
  { id: 'decode', label: 'Decode', note: 'Letters shuffle and settle into the new line, with a faint light sweep.' },
]

export const DEFAULT_FX: IdeaFx = 'blur'
const KEY = 'pade.ideafx'

export function loadFx(): IdeaFx {
  try {
    const v = localStorage.getItem(KEY)
    if (IDEA_FX.some((f) => f.id === v)) return v as IdeaFx
  } catch { /* storage blocked */ }
  return DEFAULT_FX
}
export function saveFx(fx: IdeaFx) {
  try { localStorage.setItem(KEY, fx) } catch { /* storage blocked */ }
}
