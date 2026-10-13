import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

export const currentSession = async (): Promise<Session | null> => (supabase ? (await supabase.auth.getSession()).data.session : null)
export const currentUserId = async () => (await currentSession())?.user.id ?? null
