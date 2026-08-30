'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export default function Header() {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<{ full_name: string | null; role: string } | null>(null)
  const [hasOrg, setHasOrg] = useState(false)
  const [loading, setLoading] = useState(true)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()

    async function loadUser() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        setUser(authUser)

        if (authUser) {
          const [profileRes, orgRes] = await Promise.all([
            supabase.from('profiles').select('full_name, role').eq('id', authUser.id).single(),
            supabase.from('organizations').select('id').eq('owner_id', authUser.id).limit(1),
          ])
          setProfile(profileRes.data)
          setHasOrg((orgRes.data?.length ?? 0) > 0)
        }
      } catch {
        // Auth check failed — show logged-out state
      } finally {
        setLoading(false)
      }
    }

    loadUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) {
        setProfile(null)
        setHasOrg(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setHasOrg(false)
    setUserMenuOpen(false)
    setMenuOpen(false)
    router.push('/')
    router.refresh()
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-bold text-primary-500">O</span>
          <span className="text-xl font-bold text-gray-900">Show</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/events" className="text-sm font-medium text-gray-600 transition-colors hover:text-primary-500">
            Événements
          </Link>

          {!loading && user ? (
            <>
              <Link href="/mes-billets" className="text-sm font-medium text-gray-600 transition-colors hover:text-primary-500">
                Mes billets
              </Link>
              {hasOrg && (
                <Link href="/dashboard" className="text-sm font-medium text-gray-600 transition-colors hover:text-primary-500">
                  Dashboard
                </Link>
              )}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-200"
                >
                  {initials}
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl border border-gray-100 bg-white py-2 shadow-lg">
                    <div className="border-b border-gray-100 px-4 py-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{profile?.full_name || 'Mon compte'}</p>
                    </div>
                    <Link
                      href="/mes-billets"
                      className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Mes billets
                    </Link>
                    {hasOrg ? (
                      <Link
                        href="/dashboard"
                        className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Dashboard organisateur
                      </Link>
                    ) : (
                      <Link
                        href="/dashboard"
                        className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Devenir organisateur
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                      Déconnexion
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : !loading ? (
            <>
              <Link href="/login" className="btn-outline !py-2 !px-4 !text-sm">
                Connexion
              </Link>
              <Link href="/dashboard/events/new" className="btn-primary !py-2 !px-4 !text-sm">
                Créer un événement
              </Link>
            </>
          ) : null}
        </nav>

        {/* Mobile menu button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 md:hidden"
          aria-label="Menu"
        >
          {menuOpen ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-gray-100 bg-white px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            <Link
              href="/events"
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
              onClick={() => setMenuOpen(false)}
            >
              Événements
            </Link>

            {!loading && user ? (
              <>
                <Link
                  href="/mes-billets"
                  className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                  onClick={() => setMenuOpen(false)}
                >
                  Mes billets
                </Link>
                {hasOrg ? (
                  <Link
                    href="/dashboard"
                    className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    Dashboard organisateur
                  </Link>
                ) : (
                  <Link
                    href="/dashboard"
                    className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    Devenir organisateur
                  </Link>
                )}
                <div className="my-2 border-t border-gray-100" />
                <div className="flex items-center gap-3 px-4 py-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                    {initials}
                  </div>
                  <span className="text-sm font-medium text-gray-900 truncate">{profile?.full_name || 'Mon compte'}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="rounded-lg px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Déconnexion
                </button>
              </>
            ) : !loading ? (
              <>
                <Link
                  href="/login"
                  className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                  onClick={() => setMenuOpen(false)}
                >
                  Connexion
                </Link>
                <Link
                  href="/dashboard/events/new"
                  className="btn-primary mt-2"
                  onClick={() => setMenuOpen(false)}
                >
                  Créer un événement
                </Link>
              </>
            ) : null}
          </nav>
        </div>
      )}
    </header>
  )
}
