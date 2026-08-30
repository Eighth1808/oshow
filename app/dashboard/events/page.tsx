import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatFCFA } from '@/lib/fees'
import { formatDate } from '@/lib/utils'

async function getMyEvents(userId: string) {
  const supabase = createClient()

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_id', userId)
    .single()

  if (!org) return []

  const { data } = await supabase
    .from('events')
    .select('id, title, slug, status, starts_at, tickets_sold, total_tickets, total_revenue, cover_image_url, category')
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false })

  return data || []
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  published: 'bg-green-50 text-green-700',
  live: 'bg-primary-50 text-primary-700',
  ended: 'bg-yellow-50 text-yellow-700',
  settled: 'bg-blue-50 text-blue-700',
  cancelled: 'bg-red-50 text-red-700',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  published: 'Publié',
  live: 'En cours',
  ended: 'Terminé',
  settled: 'Réglé',
  cancelled: 'Annulé',
}

export default async function EventsListPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const events = await getMyEvents(user.id)

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Mes événements</h1>
        <Link href="/dashboard/events/new" className="btn-primary !py-2 !px-4 !text-sm">
          + Nouvel événement
        </Link>
      </div>

      {events.length > 0 ? (
        <div className="mt-6 space-y-3">
          {events.map((event: any) => (
            <Link
              key={event.id}
              href={`/dashboard/events/${event.id}`}
              className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 transition-colors hover:border-primary-200 hover:shadow-sm"
            >
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-primary-50 text-2xl">
                🎫
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 truncate">{event.title}</p>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[event.status] || STATUS_STYLES.draft}`}>
                    {STATUS_LABELS[event.status] || event.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {formatDate(event.starts_at, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-gray-900">
                  {event.tickets_sold || 0}/{event.total_tickets || 0} billets
                </p>
                <p className="text-sm text-gray-500">{formatFCFA(event.total_revenue || 0)}</p>
              </div>
              <svg className="h-5 w-5 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-xl border-2 border-dashed border-gray-200 py-16 text-center">
          <div className="text-5xl">🎪</div>
          <p className="mt-4 text-lg font-medium text-gray-600">
            Pas encore d&apos;événement
          </p>
          <p className="mt-2 text-sm text-gray-400">
            Crée ton premier événement et commence à vendre des billets.
          </p>
          <Link href="/dashboard/events/new" className="btn-primary mt-6">
            Créer un événement
          </Link>
        </div>
      )}
    </div>
  )
}
