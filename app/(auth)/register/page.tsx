'use client'

import { Suspense, useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const COUNTRY_CODES = [
  { code: '+228', country: 'TG', flag: '🇹🇬', label: 'Togo' },
  { code: '+233', country: 'GH', flag: '🇬🇭', label: 'Ghana' },
  { code: '+229', country: 'BJ', flag: '🇧🇯', label: 'Bénin' },
  { code: '+234', country: 'NG', flag: '🇳🇬', label: 'Nigeria' },
  { code: '+225', country: 'CI', flag: '🇨🇮', label: "Côte d'Ivoire" },
  { code: '+226', country: 'BF', flag: '🇧🇫', label: 'Burkina Faso' },
  { code: '+227', country: 'NE', flag: '🇳🇪', label: 'Niger' },
  { code: '+221', country: 'SN', flag: '🇸🇳', label: 'Sénégal' },
  { code: '+223', country: 'ML', flag: '🇲🇱', label: 'Mali' },
  { code: '+224', country: 'GN', flag: '🇬🇳', label: 'Guinée' },
  { code: '+237', country: 'CM', flag: '🇨🇲', label: 'Cameroun' },
  { code: '+242', country: 'CG', flag: '🇨🇬', label: 'Congo' },
  { code: '+243', country: 'CD', flag: '🇨🇩', label: 'RD Congo' },
  { code: '+241', country: 'GA', flag: '🇬🇦', label: 'Gabon' },
  { code: '+33', country: 'FR', flag: '🇫🇷', label: 'France' },
  { code: '+32', country: 'BE', flag: '🇧🇪', label: 'Belgique' },
  { code: '+41', country: 'CH', flag: '🇨🇭', label: 'Suisse' },
  { code: '+1', country: 'US', flag: '🇺🇸', label: 'États-Unis' },
  { code: '+44', country: 'GB', flag: '🇬🇧', label: 'Royaume-Uni' },
  { code: '+49', country: 'DE', flag: '🇩🇪', label: 'Allemagne' },
]

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
  const [countryCode, setCountryCode] = useState('+228')
  const [codeDropdownOpen, setCodeDropdownOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCodeDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selectedCountry = COUNTRY_CODES.find(c => c.code === countryCode) || COUNTRY_CODES[0]

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
    const appUrl = window.location.origin

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${appUrl}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const formattedPhone = phone ? `${countryCode}${phone}` : null
      await supabase.from('profiles').upsert({
        id: data.user.id,
        phone: formattedPhone,
        full_name: fullName,
        email,
        role: 'attendee',
      })
    }

    if (data.session) {
      router.push(redirectTo)
      router.refresh()
    } else {
      setEmailSent(true)
    }
  }

  const loginHref = redirectTo !== '/'
    ? `/login?redirect=${encodeURIComponent(redirectTo)}`
    : '/login'

  if (emailSent) {
    return (
      <div className="w-full max-w-sm">
        <div className="card text-center">
          <div className="text-5xl">📧</div>
          <h1 className="mt-4 text-xl font-bold text-gray-900">Vérifie ton email</h1>
          <p className="mt-2 text-sm text-gray-500">
            Un lien de confirmation a été envoyé à <strong>{email}</strong>.
            Clique dessus pour activer ton compte.
          </p>
          <p className="mt-4 text-xs text-gray-400">
            Tu seras automatiquement redirigé après confirmation.
          </p>
        </div>
      </div>
    )
  }

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
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setCodeDropdownOpen(!codeDropdownOpen)}
                  className="flex h-12 items-center gap-1.5 rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <span>{selectedCountry.flag}</span>
                  <span>{selectedCountry.code}</span>
                  <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {codeDropdownOpen && (
                  <div className="absolute left-0 top-full z-50 mt-1 max-h-60 w-56 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                    {COUNTRY_CODES.map((c) => (
                      <button
                        key={c.code + c.country}
                        type="button"
                        onClick={() => {
                          setCountryCode(c.code)
                          setCodeDropdownOpen(false)
                        }}
                        className={`flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 ${
                          countryCode === c.code ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                        }`}
                      >
                        <span>{c.flag}</span>
                        <span className="flex-1 text-left">{c.label}</span>
                        <span className="text-gray-400">{c.code}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
            <div className="relative mt-1">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 caractères"
                className="input-field !pr-10"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>
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
