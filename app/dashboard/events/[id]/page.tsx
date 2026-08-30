import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatFCFA } from '@/lib/fees'
import { formatDate, formatTime } from '@/lib/utils'
import EventForm from '@/components/dashboard/EventForm'
import EventActions from '@/components/dashboard/EventActions'

interface EventManagePageProps {
  params: { id: string }
  searchParams: { edit?: string }
}

async function getEvent(eventId: string, userId: string) {
  const supabase = createClient()

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_id', userId)
    .single()

  if (!org) return null

  const { data } = await supabase
    .from('events')
    .select(`
      *,
      ticket_types (*),
      organization:organizations (id, name)
    `)
    .eq('id', eventId)
    .eq('organization_id', org.id)
    .single()

  return data
}

export default async function EventManagePage({ params, searchParams }: EventManagePageProps) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const event = await getEvent(params.id, user.id)
  if (!event) notFound()

  const isEditing = searchParams.edit === 'true'

  if (isEditing) {
    return (
      <div>
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/events/${params.id}`} className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Modifier l&apos;événement</h1>
        </div>
        <div className="mt-6">
          <EventForm
            organizationId={event.organization_id}
            initialData={event}
            eventId={params.id}
          />
        </div>
      </div>
    )
  }

  const ticketTypes = event.ticket_types || []
  const totalQuantity = ticketTypes.reduce((s: number, t: any) => s + t.quantity, 0)
  const totalSold = ticketTypes.reduce((s: number, t: any) => s + t.quantity_sold, 0)

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/events" className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 truncate">{event.title}</h1>
          <StatusBadge status={event.status} />
        </div>
        <div className="flex gap-2">
          <Link
            href={`/scan/${params.id}`}
            className="btn-ghost !py-2 !px-3 !text-sm"
          >
            Scanner
          </Link>
          <Link
            href={`/e/${event.slug}`}
            target="_blank"
            className="btn-ghost !py-2 !px-3 !text-sm"
          >
            Voir la page
          </Link>
          <Link
            href={`/dashboard/events/${params.id}?edit=true`}
            className="btn-outline !py-2 !px-3 !text-sm"
          >
            Modifier
          </Link>
          <EventActions eventId={params.id} status={event.status} />
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <div className="card">
          <p className="text-sm text-gray-500">Billets vendus</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{totalSold}/{totalQuantity}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Revenus</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatFCFA(event.total_revenue || 0)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Check-ins</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{event.total_check_ins || 0}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Date</p>
          <p className="mt-1 text-lg font-bold text-gray-900">{formatDate(event.starts_at, { month: 'short', day: 'numeric' })}</p>
          <p className="text-sm text-gray-500">{formatTime(event.starts_at)}</p>
        </div>
      </div>

      {/* Ticket types breakdown */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Types de billets</h2>
        <div className="mt-4 space-y-3">
          {ticketTypes.map((tt: any) => {
            const pct = tt.quantity > 0 ? (tt.quantity_sold / tt.quantity) * 100 : 0
            return (
              <div key={tt.id} className="rounded-xl border border-gray-100 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{tt.name}</p>
                    <p className="text-sm text-gray-500">
                      {tt.price === 0 ? 'Gratuit' : formatFCFA(tt.price)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {tt.quantity_sold}/{tt.quantity}
                    </p>
                    <p className="text-xs text-gray-400">{Math.round(pct)}% vendus</p>
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-primary-500 transition-all"
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Event details */}
      <div className="mt-8 card">
        <h2 className="text-lg font-semibold text-gray-900">Détails</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Catégorie</dt>
            <dd className="font-medium text-gray-900 capitalize">{event.category}</dd>
          </div>
          {event.venue_name && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Lieu</dt>
              <dd className="font-medium text-gray-900">{event.venue_name}, {event.venue_city}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-gray-500">Début</dt>
            <dd className="font-medium text-gray-900">{formatDate(event.starts_at)} {formatTime(event.starts_at)}</dd>
          </div>
          {event.ends_at && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Fin</dt>
              <dd className="font-medium text-gray-900">{formatDate(event.ends_at)} {formatTime(event.ends_at)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-gray-500">Lien public</dt>
            <dd className="font-medium text-primary-500">/e/{event.slug}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    published: 'bg-green-50 text-green-700',
    live: 'bg-primary-50 text-primary-700',
    ended: 'bg-yellow-50 text-yellow-700',
    settled: 'bg-blue-50 text-blue-700',
    cancelled: 'bg-red-50 text-red-700',
  }
  const labels: Record<string, string> = {
    draft: 'Brouillon',
    published: 'Publié',
    live: 'En cours',
    ended: 'Terminé',
    settled: 'Réglé',
    cancelled: 'Annulé',
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] || styles.draft}`}>
      {labels[status] || status}
    </span>
  )
}
