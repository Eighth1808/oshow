import { notFound } from 'next/navigation'
import Image from 'next/image'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { formatFCFA } from '@/lib/fees'
import { formatDate, formatTime } from '@/lib/utils'
import { buildEventWhatsAppUrl, buildEventFacebookUrl } from '@/lib/qr'
import TicketSelector from '@/components/events/TicketSelector'
import ShareButtons from '@/components/events/ShareButtons'
import { EVENT_CATEGORY_LABELS, type EventCategory } from '@/types'

interface EventPageProps {
  params: { slug: string }
}

async function getEvent(slug: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('events')
    .select(`
      *,
      organization:organizations (id, name, slug, logo_url, is_verified),
      ticket_types (*)
    `)
    .eq('slug', slug)
    .in('status', ['published', 'live'])
    .single()

  return data
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const event = await getEvent(params.slug)
  if (!event) return { title: 'Événement non trouvé' }

  const minPrice = event.ticket_types?.length
    ? Math.min(...event.ticket_types.map((t: any) => t.price))
    : 0

  return {
    title: event.title,
    description: event.short_description || `${event.title} — ${formatDate(event.starts_at)}`,
    openGraph: {
      title: event.title,
      description: `${event.is_free ? 'Gratuit' : `À partir de ${formatFCFA(minPrice)}`} — ${formatDate(event.starts_at)}`,
      images: event.cover_image_url ? [{ url: event.cover_image_url }] : [],
      type: 'website',
    },
  }
}

export default async function EventPage({ params }: EventPageProps) {
  const event = await getEvent(params.slug)
  if (!event) notFound()

  const minPrice = event.ticket_types?.length
    ? Math.min(...event.ticket_types.map((t: any) => t.price))
    : 0

  const sortedTicketTypes = [...(event.ticket_types || [])].sort(
    (a: any, b: any) => a.sort_order - b.sort_order
  )

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Cover Image */}
      <div className="relative aspect-[21/9] overflow-hidden rounded-2xl bg-gray-100 sm:aspect-[3/1]">
        {event.cover_image_url ? (
          <Image
            src={event.cover_image_url}
            alt={event.title}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary-400 to-primary-600">
            <span className="text-6xl">🎉</span>
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Event Details */}
        <div className="lg:col-span-2">
          <span className="badge-primary mb-4 capitalize">
            {EVENT_CATEGORY_LABELS[event.category as EventCategory] || event.category}
          </span>

          <h1 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">
            {event.title}
          </h1>

          {/* Date & Location */}
          <div className="mt-6 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-500">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">{formatDate(event.starts_at)}</p>
                <p className="text-sm text-gray-500">
                  {formatTime(event.starts_at)}
                  {event.ends_at && ` — ${formatTime(event.ends_at)}`}
                  {event.doors_open_at && ` (Portes: ${formatTime(event.doors_open_at)})`}
                </p>
              </div>
            </div>

            {event.venue_name && (
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-500">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{event.venue_name}</p>
                  {event.venue_address && (
                    <p className="text-sm text-gray-500">{event.venue_address}, {event.venue_city}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Organizer */}
          {event.organization && (
            <div className="mt-8 flex items-center gap-3 rounded-xl border border-gray-100 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-lg font-bold text-primary-500">
                {event.organization.logo_url ? (
                  <Image
                    src={event.organization.logo_url}
                    alt={event.organization.name}
                    width={48}
                    height={48}
                    className="rounded-full object-cover"
                  />
                ) : (
                  event.organization.name[0]
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900">{event.organization.name}</p>
                  {event.organization.is_verified && (
                    <svg className="h-4 w-4 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <p className="text-sm text-gray-500">Organisateur</p>
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-gray-900">À propos</h2>
              <div className="prose prose-gray mt-4 max-w-none whitespace-pre-wrap text-gray-600">
                {event.description}
              </div>
            </div>
          )}

          {/* Share */}
          <div className="mt-8">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Partager</h2>
            <ShareButtons
              eventSlug={event.slug}
              eventTitle={event.title}
              eventDate={formatDate(event.starts_at)}
              price={event.is_free ? 'Gratuit' : `${formatFCFA(minPrice)}`}
            />
          </div>
        </div>

        {/* Ticket Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900">Billets</h2>
              {sortedTicketTypes.length > 0 ? (
                <TicketSelector
                  eventId={event.id}
                  ticketTypes={sortedTicketTypes}
                  maxPerOrder={event.max_tickets_per_order}
                />
              ) : (
                <p className="mt-4 text-sm text-gray-500">
                  Billets bientôt disponibles
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
