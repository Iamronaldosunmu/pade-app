import { emptyProfile, type Profile } from './types'

export type StepId = 'welcome' | 'name' | 'age' | 'area' | 'work' | 'takes' | 'contact' | 'photo' | 'ticket'
export const STEPS: StepId[] = ['welcome', 'name', 'age', 'area', 'work', 'takes', 'contact', 'photo', 'ticket']

export const SAVE_KEY = 'pade.onboarding.v1'

/** Where the person got to, so a refresh or a return visit picks up on the same screen with their answers. */
export function loadProgress(): { i: number; p: Profile } {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null') as { i?: number; p?: Partial<Profile> } | null
    if (raw && typeof raw.i === 'number' && raw.i >= 0 && raw.p && typeof raw.p === 'object') {
      // a signed-in profile is needed for anything past the welcome screen
      if (raw.i > 0 && !raw.p.provider) return { i: 0, p: emptyProfile }
      return { i: Math.min(raw.i, STEPS.length - 1), p: { ...emptyProfile, ...raw.p, hasPhoto: !!raw.p.photo } }
    }
  } catch { /* storage blocked or corrupt: start fresh */ }
  return { i: 0, p: emptyProfile }
}

/** Has this device finished signing up? Then it lands on the home screen instead of the form. */
export function loadSignedUp(): { profile: Profile } | null {
  const { i, p } = loadProgress()
  return i === STEPS.length - 1 && p.provider && p.name ? { profile: p } : null
}
export function clearProgress() { try { localStorage.removeItem(SAVE_KEY) } catch { /* private mode */ } }
