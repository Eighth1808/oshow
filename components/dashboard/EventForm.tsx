'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils'
import { EVENT_CATEGORY_LABELS, type EventCategory } from '@/types'
import TicketTierForm from './TicketTierForm'

interface TicketTier {
  id: string
  name: string
  price: number | ''
  quantity: number | ''
  description: string
}

interface EventFormProps {
  organizationId: string
  initialData?: any
  eventId?: string
}

export default function EventForm({ organizationId, initialData, eventId }: EventFormProps) {
  const router = useRouter()
  const isEditing = !!eventId

  const [title, setTitle] = useState(initialData?.title || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [shortDescription, setShortDescription] = useState(initialData?.short_description || '')
  const [category, setCategory] = useState<EventCategory>(initialData?.category || 'autre')
  const [venueName, setVenueName] = useState(initialData?.venue_name || '')
  const [venueAddress, setVenueAddress] = useState(initialData?.venue_address || '')
  const [venueCity, setVenueCity] = useState(initialData?.venue_city || 'Lomé')
  const [isOnline, setIsOnline] = useState(initialData?.is_online || false)
  const [onlineUrl, setOnlineUrl] = useState(initialData?.online_url || '')
  const [startsAt, setStartsAt] = useState(initialData?.starts_at?.slice(0, 16) || '')
  const [endsAt, setEndsAt] = useState(initialData?.ends_at?.slice(0, 16) || '')
  const [doorsOpenAt, setDoorsOpenAt] = useState(initialData?.doors_open_at?.slice(0, 16) || '')
  const [isFree, setIsFree] = useState(initialData?.is_free || false)
  const [maxPerOrder, setMaxPerOrder] = useState<number | ''>(initialData?.max_tickets_per_order || '')
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState(initialData?.cover_image_url || '')

  const [ticketTiers, setTicketTiers] = useState<TicketTier[]>(
    initialData?.ticket_types?.map((t: any) => ({
      id: t.id,
      name: t.name,
      price: t.price,
      quantity: t.quantity,
      description: t.description || '',
    })) || [
      { id: crypto.randomUUID(), name: 'Standard', price: '', quantity: '', description: '' },
    ]
  )

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setCoverImage(file)
      setCoverPreview(URL.createObjectURL(file))
    }
  }

  function addTier() {
    setTicketTiers([
      ...ticketTiers,
      { id: crypto.randomUUID(), name: '', price: '', quantity: '', description: '' },
    ])
  }

  function removeTier(id: string) {
    if (ticketTiers.length <= 1) return
    setTicketTiers(ticketTiers.filter((t) => t.id !== id))
  }

  function updateTier(id: string, updates: Partial<TicketTier>) {
    setTicketTiers(ticketTiers.map((t) => (t.id === id ? { ...t, ...updates } : t)))
  }

  async function handleSubmit(e: React.FormEvent, publish: boolean = false) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Session expirée'); setLoading(false); return }

    let coverUrl = initialData?.cover_image_url || null

    if (coverImage) {
      const ext = coverImage.name.split('.').pop()
      const path = `events/${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(path, coverImage)

      if (uploadError) {
        setError(`Erreur upload: ${uploadError.message}`)
        setLoading(false)
        return
      }

      const { data: urlData } = supabase.storage.from('images').getPublicUrl(path)
      coverUrl = urlData.publicUrl
    }

    const slug = isEditing
      ? initialData.slug
      : slugify(title) + '-' + Math.random().toString(36).slice(2, 6)

    const totalTickets = ticketTiers.reduce((sum, t) => sum + (t.quantity || 0), 0)

    const eventData = {
      organization_id: organizationId,
      created_by: user.id,
      title,
      slug,
      description: description || null,
      short_description: shortDescription || null,
      category,
      cover_image_url: coverUrl,
      venue_name: isOnline ? null : venueName || null,
      venue_address: isOnline ? null : venueAddress || null,
      venue_city: isOnline ? null : venueCity,
      is_online: isOnline,
      online_url: isOnline ? onlineUrl || null : null,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      doors_open_at: doorsOpenAt ? new Date(doorsOpenAt).toISOString() : null,
      is_free: isFree,
      max_tickets_per_order: maxPerOrder || 10,
      total_tickets: totalTickets,
      status: publish ? 'published' : 'draft',
      published_at: publish ? new Date().toISOString() : null,
    }

    let savedEventId = eventId

    if (isEditing) {
      const { error: updateError } = await supabase
        .from('events')
        .update(eventData)
        .eq('id', eventId)

      if (updateError) {
        setError(updateError.message)
        setLoading(false)
        return
      }
    } else {
      const { data: newEvent, error: insertError } = await supabase
        .from('events')
        .insert(eventData)
        .select('id')
        .single()

      if (insertError) {
        setError(insertError.message)
        setLoading(false)
        return
      }

      savedEventId = newEvent.id
    }

    if (isEditing) {
      await supabase
        .from('ticket_types')
        .delete()
        .eq('event_id', eventId)
    }

    const ticketTypesData = ticketTiers.map((tier, index) => ({
      event_id: savedEventId,
      name: tier.name,
      description: tier.description || null,
      price: isFree ? 0 : (tier.price || 0),
      quantity: tier.quantity || 0,
      sort_order: index,
    }))

    const { error: tierError } = await supabase
      .from('ticket_types')
      .insert(ticketTypesData)

    if (tierError) {
      setError(tierError.message)
      setLoading(false)
      return
    }

    router.push(`/dashboard/events/${savedEventId}`)
    router.refresh()
  }

  return (
    <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-8">
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}

      {/* Basic Info */}
      <section className="card space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Informations générales</h2>

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Titre de l&apos;événement *
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Concert Toofan à Lomé"
            className="input-field mt-1"
            required
          />
        </div>

        <div>
          <label htmlFor="shortDesc" className="block text-sm font-medium text-gray-700">
            Description courte
          </label>
          <input
            id="shortDesc"
            type="text"
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            placeholder="Le duo togolais en concert live !"
            className="input-field mt-1"
            maxLength={500}
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description complète
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Décris ton événement en détail..."
            className="input-field mt-1"
            rows={5}
          />
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">
            Catégorie
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as EventCategory)}
            className="input-field mt-1"
          >
            {Object.entries(EVENT_CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Image de couverture</label>
          <div className="mt-1">
            {coverPreview ? (
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg bg-gray-100">
                <img src={coverPreview} alt="Couverture" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => { setCoverImage(null); setCoverPreview('') }}
                  className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-12 transition-colors hover:border-primary-400">
                <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="mt-2 text-sm text-gray-500">Cliquer pour ajouter une image</span>
                <input type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
              </label>
            )}
          </div>
        </div>
      </section>

      {/* Date & Location */}
      <section className="card space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Date et lieu</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="startsAt" className="block text-sm font-medium text-gray-700">
              Début *
            </label>
            <input
              id="startsAt"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="input-field mt-1"
              required
            />
          </div>
          <div>
            <label htmlFor="endsAt" className="block text-sm font-medium text-gray-700">
              Fin
            </label>
            <input
              id="endsAt"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="input-field mt-1"
            />
          </div>
        </div>

        <div>
          <label htmlFor="doorsOpen" className="block text-sm font-medium text-gray-700">
            Ouverture des portes
          </label>
          <input
            id="doorsOpen"
            type="datetime-local"
            value={doorsOpenAt}
            onChange={(e) => setDoorsOpenAt(e.target.value)}
            className="input-field mt-1"
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            id="isOnline"
            type="checkbox"
            checked={isOnline}
            onChange={(e) => setIsOnline(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
          />
          <label htmlFor="isOnline" className="text-sm font-medium text-gray-700">
            Événement en ligne
          </label>
        </div>

        {isOnline ? (
          <div>
            <label htmlFor="onlineUrl" className="block text-sm font-medium text-gray-700">
              Lien de l&apos;événement
            </label>
            <input
              id="onlineUrl"
              type="url"
              value={onlineUrl}
              onChange={(e) => setOnlineUrl(e.target.value)}
              placeholder="https://zoom.us/j/..."
              className="input-field mt-1"
            />
          </div>
        ) : (
          <>
            <div>
              <label htmlFor="venueName" className="block text-sm font-medium text-gray-700">
                Nom du lieu
              </label>
              <input
                id="venueName"
                type="text"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="Palais des Congrès"
                className="input-field mt-1"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="venueAddress" className="block text-sm font-medium text-gray-700">
                  Adresse
                </label>
                <input
                  id="venueAddress"
                  type="text"
                  value={venueAddress}
                  onChange={(e) => setVenueAddress(e.target.value)}
                  placeholder="Boulevard de la Marina"
                  className="input-field mt-1"
                />
              </div>
              <div>
                <label htmlFor="venueCity" className="block text-sm font-medium text-gray-700">
                  Ville
                </label>
                <input
                  id="venueCity"
                  type="text"
                  value={venueCity}
                  onChange={(e) => setVenueCity(e.target.value)}
                  className="input-field mt-1"
                />
              </div>
            </div>
          </>
        )}
      </section>

      {/* Tickets */}
      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Billets</h2>
          <div className="flex items-center gap-3">
            <input
              id="isFree"
              type="checkbox"
              checked={isFree}
              onChange={(e) => setIsFree(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
            />
            <label htmlFor="isFree" className="text-sm font-medium text-gray-700">
              Événement gratuit
            </label>
          </div>
        </div>

        <div className="space-y-4">
          {ticketTiers.map((tier, index) => (
            <TicketTierForm
              key={tier.id}
              tier={tier}
              index={index}
              isFree={isFree}
              canRemove={ticketTiers.length > 1}
              onUpdate={(updates) => updateTier(tier.id, updates)}
              onRemove={() => removeTier(tier.id)}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={addTier}
          className="btn-outline w-full !border-dashed"
        >
          + Ajouter un type de billet
        </button>

        <div>
          <label htmlFor="maxPerOrder" className="block text-sm font-medium text-gray-700">
            Maximum de billets par commande
          </label>
          <input
            id="maxPerOrder"
            type="number"
            min={1}
            max={50}
            value={maxPerOrder}
            onChange={(e) => setMaxPerOrder(e.target.value === '' ? '' : parseInt(e.target.value))}
            placeholder="10"
            className="input-field mt-1 w-32"
          />
        </div>
      </section>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={loading} className="btn-outline">
          {loading ? 'Enregistrement...' : (isEditing ? 'Enregistrer' : 'Enregistrer comme brouillon')}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={(e) => handleSubmit(e, true)}
          className="btn-primary"
        >
          {loading ? 'Publication...' : (isEditing ? 'Publier les modifications' : 'Publier l\'événement')}
        </button>
      </div>
    </form>
  )
}
