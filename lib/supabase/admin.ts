import { createClient } from '@supabase/supabase-js'

function stripBOM(s: string) {
  return s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s
}

export function createAdminClient() {
  const url = stripBOM(process.env.NEXT_PUBLIC_SUPABASE_URL!).trim()
  const key = stripBOM(process.env.SUPABASE_SERVICE_ROLE_KEY!).trim()
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
