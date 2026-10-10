export type Provider = 'google' | 'instagram' | 'x'

export interface Identity {
  provider: Provider
  /** Display name the provider gave us, used to prefill the name step. */
  name: string
  /** Handle on that network, when the provider has one. */
  handle: string
}

export const PROVIDERS: { id: Provider; label: string }[] = [
  { id: 'google', label: 'Google' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'x', label: 'X' },
]

/**
 * Prototype stand-in for OAuth. It waits a moment, then returns an identity with no name or handle (nothing is invented).
 * The real version redirects to the provider and reads the profile back (Supabase Auth).
 */
export function signIn(provider: Provider): Promise<Identity> {
  const sample: Record<Provider, Identity> = {
    google: { provider, name: '', handle: '' },
    instagram: { provider, name: '', handle: '' },
    x: { provider, name: '', handle: '' },
  }
  return new Promise((resolve) => setTimeout(() => resolve(sample[provider]), 1400))
}

export const firstName = (full: string) => full.trim().split(/\s+/)[0] ?? ''
