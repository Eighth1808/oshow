import { createBrowserClient } from '@supabase/ssr'

function clean(s: string) {
  return s.replace(/[^\x20-\x7E]/g, '').trim()
}

export function createClient() {
  return createBrowserClient(
    clean(process.env.NEXT_PUBLIC_SUPABASE_URL!),
    clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  )
}
