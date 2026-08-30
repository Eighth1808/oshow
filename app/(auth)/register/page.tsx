'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/'
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      setLoading(false)
      return
    }

    const supabase = createClient()

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const formattedPhone = phone ? `+228${phone}` : null
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        phone: formattedPhone,
        full_name: fullName,
        email,
        role: 'attendee',
      })

      if (profileError) {
        console.error('Profile insert failed:', profileError.message)
      }
    }

    router.push(redirectTo)
    router.refresh()
  }

  const loginHref = redirectTo !== '/'
    ? `/login?redirect=${encodeURIComponent(redirectTo)}`
    : '/login'

  return (
    <div className="w-full max-w-sm">
      <div className="card">
        <h1 className="text-center text-xl font-bold text-gray-900">Créer un compte</h1>
        <p className="mt-2 text-center text-sm text-gray-500">
          Remplis tes informations pour commencer
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="mt-6 space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
              Nom complet
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Kofi Mensah"
              className="input-field mt-1"
              required
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kofi@email.com"
              className="input-field mt-1"
              required
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Numéro de téléphone <span className="text-gray-400">(optionnel)</span>
            </label>
            <div className="mt-1 flex items-center gap-2">
              <span className="flex h-12 items-center rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">
                +228
              </span>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="90 12 34 56"
                className="input-field !py-3"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 caractères"
              className="input-field mt-1"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !fullName || !email || !password}
            className="btn-primary w-full"
          >
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-gray-500">
        Déjà un compte ?{' '}
        <Link href={loginHref} className="font-medium text-primary-500 hover:text-primary-600">
          Se connecter
        </Link>
      </p>
    </div>
  )
}
