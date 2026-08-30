'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [orgName, setOrgName] = useState('')
  const [orgPhone, setOrgPhone] = useState('')
  const [mobileProvider, setMobileProvider] = useState<'flooz' | 'tmoney'>('flooz')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile) {
        setFullName(profile.full_name)
        setEmail(profile.email || '')
      }

      const { data: org } = await supabase
        .from('organizations')
        .select('*')
        .eq('owner_id', user.id)
        .single()

      if (org) {
        setOrgName(org.name)
        setOrgPhone(org.mobile_money_number || '')
        setMobileProvider(org.mobile_money_provider || 'flooz')
      }

      setLoading(false)
    }
    load()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: fullName, email: email || null })
      .eq('id', user.id)

    if (profileError) {
      setError(profileError.message)
      setSaving(false)
      return
    }

    const { error: orgError } = await supabase
      .from('organizations')
      .update({
        name: orgName,
        mobile_money_number: orgPhone || null,
        mobile_money_provider: mobileProvider,
      })
      .eq('owner_id', user.id)

    if (orgError) {
      setError(orgError.message)
      setSaving(false)
      return
    }

    setSuccess('Paramètres enregistrés')
    setSaving(false)
    router.refresh()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>

      {error && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
      {success && <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-600">{success}</div>}

      <form onSubmit={handleSave} className="mt-6 space-y-8">
        <section className="card space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Profil</h2>
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">Nom complet</label>
            <input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field mt-1" required />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field mt-1" placeholder="kofi@email.com" />
          </div>
        </section>

        <section className="card space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Organisation</h2>
          <div>
            <label htmlFor="orgName" className="block text-sm font-medium text-gray-700">Nom</label>
            <input id="orgName" type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} className="input-field mt-1" required />
          </div>
          <div>
            <label htmlFor="orgPhone" className="block text-sm font-medium text-gray-700">Numéro Mobile Money</label>
            <input id="orgPhone" type="tel" value={orgPhone} onChange={(e) => setOrgPhone(e.target.value.replace(/\D/g, ''))} placeholder="90123456" className="input-field mt-1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Opérateur</label>
            <div className="mt-2 flex gap-3">
              <button type="button" onClick={() => setMobileProvider('flooz')}
                className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium ${mobileProvider === 'flooz' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600'}`}>
                Flooz
              </button>
              <button type="button" onClick={() => setMobileProvider('tmoney')}
                className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium ${mobileProvider === 'tmoney' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600'}`}>
                T-Money
              </button>
            </div>
          </div>
        </section>

        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </form>
    </div>
  )
}
