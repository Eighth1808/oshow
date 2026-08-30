import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import EventCard from '@/components/events/EventCard'
import HomeCategories from '@/components/events/HomeCategories'

async function getFeaturedEvents() {
  try {
    const supabase = createClient()
    const { data } = await supabase
      .from('events')
      .select(`
        id, slug, title, cover_image_url, starts_at, venue_name, venue_city, category, is_free, is_featured,
        ticket_types (price)
      `)
      .eq('status', 'published')
      .eq('is_featured', true)
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .limit(6)

    return (data || []).map((event: any) => ({
      ...event,
      min_price: event.ticket_types?.length
        ? Math.min(...event.ticket_types.map((t: any) => t.price))
        : 0,
    }))
  } catch {
    return []
  }
}

async function getUpcomingEvents() {
  try {
    const supabase = createClient()
    const { data } = await supabase
      .from('events')
      .select(`
        id, slug, title, cover_image_url, starts_at, venue_name, venue_city, category, is_free,
        ticket_types (price)
      `)
      .eq('status', 'published')
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .limit(12)

    return (data || []).map((event: any) => ({
      ...event,
      min_price: event.ticket_types?.length
        ? Math.min(...event.ticket_types.map((t: any) => t.price))
        : 0,
    }))
  } catch {
    return []
  }
}

export default async function HomePage() {
  const [featuredEvents, upcomingEvents] = await Promise.all([
    getFeaturedEvents(),
    getUpcomingEvents(),
  ])

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-500 via-primary-600 to-primary-800">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:py-28">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Ton événement.
              <br />
              <span className="text-accent-400">Ton public.</span>
            </h1>
            <p className="mt-6 text-lg text-primary-100 sm:text-xl">
              Découvre les meilleurs événements à Lomé. Concerts, soirées, conférences
              — achète tes billets en Flooz ou T-Money.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/events" className="btn-accent !px-8 !py-3.5 !text-base">
                Explorer les événements
              </Link>
              <Link href="/dashboard/events/new" className="inline-flex items-center justify-center rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 hover:bg-white/10">
                Organiser un événement
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Category browsing */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <HomeCategories />
      </section>

      {/* Featured Events */}
      {featuredEvents.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-12">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              À la une 🔥
            </h2>
            <Link href="/events" className="text-sm font-medium text-primary-500 hover:text-primary-600">
              Voir tout &rarr;
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredEvents.map((event: any) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Events */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            Prochains événements
          </h2>
          <Link href="/events" className="text-sm font-medium text-primary-500 hover:text-primary-600">
            Voir tout &rarr;
          </Link>
        </div>
        {upcomingEvents.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.map((event: any) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
            <p className="text-4xl">🎉</p>
            <p className="mt-4 text-lg font-medium text-gray-600">
              Aucun événement pour le moment
            </p>
            <p className="mt-2 text-sm text-gray-400">
              Reviens bientôt ou crée ton propre événement !
            </p>
            <Link href="/dashboard/events/new" className="btn-primary mt-6">
              Créer un événement
            </Link>
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="bg-primary-500">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Tu organises des événements ?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-primary-100">
            Crée ton événement gratuitement, vends tes billets en Flooz et T-Money,
            et reçois tes paiements directement sur ton mobile money.
          </p>
          <Link href="/dashboard/events/new" className="btn-accent mt-8 !px-8 !py-3.5 !text-base">
            Commencer gratuitement
          </Link>
        </div>
      </section>
    </>
  )
}
