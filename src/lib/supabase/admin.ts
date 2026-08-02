import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from './config'

export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY en el servidor.')
  return createSupabaseClient(getSupabaseConfig().url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
