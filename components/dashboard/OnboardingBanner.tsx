'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils'

export default function OnboardingBanner() {
  const router = useRouter()
  const [step, setStep] = useState<'intro' | 'form'>('intro')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [mobileProvider, setMobileProvider] = useState<'flooz' | 'tmoney'>('flooz')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setError('Session expirée. Reconnecte-toi.')
      setLoading(false)
      return
    }

    await supabase
      .from('profiles')
      .update({ role: 'organizer' })
      .eq('id', user.id)

    const slug = slugify(name) + '-' + Math.random().toString(36).slice(2, 6)

    const { error: orgError } = await supabase
      .from('organizations')
      .insert({
        owner_id: user.id,
        name,
        slug,
        phone: phone || null,
        mobile_money_number: phone || null,
        mobile_money_provider: mobileProvider,
      })

    if (orgError) {
      setError(orgError.message)
      setLoading(false)
      return
    }

    router.refresh()
  }

  if (step === 'intro') {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <div className="text-5xl">🎪</div>
        <h1 className="mt-6 text-2xl font-bold text-gray-900">
          Bienvenue sur O Show !
        </h1>
        <p className="mt-3 text-gray-500">
          Pour créer et gérer des événements, tu dois d&apos;abord créer ton profil organisateur.
        </p>
        <button
          onClick={() => setStep('form')}
          className="btn-primary mt-8"
        >
          Devenir organisateur
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900">Créer ton organisation</h1>
      <p className="mt-2 text-gray-500">
        C&apos;est le nom qui apparaîtra sur tes événements.
      </p>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      <form onSubmit={handleCreateOrg} className="mt-6 space-y-4">
        <div>
          <label htmlFor="orgName" className="block text-sm font-medium text-gray-700">
            Nom de l&apos;organisation
          </label>
          <input
            id="orgName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Mon Entreprise Events"
            className="input-field mt-1"
            required
          />
        </div>

        <div>
          <label htmlFor="orgPhone" className="block text-sm font-medium text-gray-700">
            Numéro Mobile Money (pour les paiements)
          </label>
          <div className="mt-1 flex items-center gap-2">
            <span className="flex h-12 items-center rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">
              +228
            </span>
            <input
              id="orgPhone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="90 12 34 56"
              className="input-field !py-3"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Opérateur Mobile Money
          </label>
          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={() => setMobileProvider('flooz')}
              className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${
                mobileProvider === 'flooz'
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              Flooz (Moov)
            </button>
            <button
              type="button"
              onClick={() => setMobileProvider('tmoney')}
              className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${
                mobileProvider === 'tmoney'
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              T-Money (Togocom)
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !name}
          className="btn-primary w-full"
        >
          {loading ? 'Création...' : 'Créer mon organisation'}
        </button>
      </form>
    </div>
  )
}
