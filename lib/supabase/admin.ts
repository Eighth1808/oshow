import { createClient } from '@supabase/supabase-js'

// Remove all non-ASCII characters (BOM, zero-width spaces, etc.) from env vars
function clean(s: string) {
  return s.replace(/[^\x20-\x7E]/g, '').trim()
}

export function createAdminClient() {
  const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL!)
  const key = clean(
    (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!
  )
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
