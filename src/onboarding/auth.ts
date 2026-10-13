import { supabase } from '../lib/supabase'

export type Provider = 'google' | 'email'

export const PROVIDERS: { id: Provider; label: string }[] = [
  { id: 'google', label: 'Google' },
  { id: 'email', label: 'email' },
]

const here = () => window.location.origin + window.location.pathname

/** Sends the browser to Google. Resolves only in local mode; with a real backend the page navigates away and comes back signed in. */
export async function signInWithGoogle(): Promise<'local' | 'redirecting'> {
  if (!supabase) { await new Promise((r) => setTimeout(r, 900)); return 'local' }
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: here() } })
  if (error) throw error
  return 'redirecting'
}

/** Emails a one-tap sign-in link. In local mode it just pretends, so the preview flows. */
export async function sendEmailLink(email: string): Promise<'local' | 'sent'> {
  if (!supabase) { await new Promise((r) => setTimeout(r, 900)); return 'local' }
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: here() } })
  if (error) throw error
  return 'sent'
}

export const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())

export async function signOutRemote() { await supabase?.auth.signOut() }

export const firstName = (full: string) => full.trim().split(/\s+/)[0] ?? ''
