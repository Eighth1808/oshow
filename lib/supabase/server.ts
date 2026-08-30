import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

function clean(s: string) {
  return s.replace(/[^\x20-\x7E]/g, '').trim()
}

export function createClient() {
  const supabaseUrl = clean(process.env.NEXT_PUBLIC_SUPABASE_URL || '')
  const supabaseKey = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }

  const cookieStore = cookies()

  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component — can't set cookies
          }
        },
      },
    }
  )
}
