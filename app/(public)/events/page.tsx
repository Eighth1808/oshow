import { createClient } from '@/lib/supabase/server'
import EventCard from '@/components/events/EventCard'
import EventsFilter from '@/components/events/EventsFilter'
import type { Metadata } from 'next'
import type { EventCategory } from '@/types'

export const metadata: Metadata = {
  title: 'Événements',
  description: 'Découvre les prochains événements à Lomé — concerts, soirées, conférences et plus.',
}

interface EventsPageProps {
  searchParams: { category?: string; q?: string }
}

async function getEvents(category?: string, query?: string) {
  const supabase = createClient()

  let qb = supabase
    .from('events')
    .select(`
      id, slug, title, cover_image_url, starts_at, venue_name, venue_city, category, is_free,
      ticket_types (price)
    `)
    .eq('status', 'published')
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })

  if (category) {
    qb = qb.eq('category', category)
  }

  if (query) {
    qb = qb.ilike('title', `%${query}%`)
  }

  const { data } = await qb.limit(50)

  return (data || []).map((event: any) => ({
    ...event,
    min_price: event.ticket_types?.length
      ? Math.min(...event.ticket_types.map((t: any) => t.price))
      : 0,
  }))
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const events = await getEvents(searchParams.category, searchParams.q)
  const selectedCategory = (searchParams.category as EventCategory) || null

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900">Événements</h1>
      <p className="mt-2 text-gray-500">Découvre les prochains événements à Lomé</p>

      <div className="mt-6">
        <EventsFilter initialCategory={selectedCategory} initialQuery={searchParams.q} />
      </div>

      <div className="mt-8">
        {events.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event: any) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
            <p className="text-4xl">🔍</p>
            <p className="mt-4 text-lg font-medium text-gray-600">
              Aucun événement trouvé
            </p>
            <p className="mt-2 text-sm text-gray-400">
              Essaie avec d&apos;autres filtres ou reviens plus tard.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
