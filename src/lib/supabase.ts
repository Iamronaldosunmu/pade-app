import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * The real backend, only when both public settings are present. Without them the app runs in local mode
 * (everything stays on this device) so the preview and tests keep working.
 */
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null
export const remoteEnabled = supabase !== null
