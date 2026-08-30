import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatFCFA } from '@/lib/fees'
import { formatDate, formatTime } from '@/lib/utils'

export const metadata = {
  title: 'Mes billets — O Show',
}

async function getMyTickets(userId: string) {
  const supabase = createClient()

  const { data: tickets } = await supabase
    .from('tickets')
    .select(`
      id, ticket_code, ticket_type_name, price_paid, status, checked_in_at, qr_data,
      event:events(id, slug, title, cover_image_url, starts_at, ends_at, venue_name, venue_city, status),
      order:orders(order_number)
    `)
    .eq('holder_id', userId)
    .order('created_at', { ascending: false })

  return tickets || []
}

export default async function MesBilletsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/mes-billets')
  }

  const tickets = await getMyTickets(user.id)

  const upcomingTickets = tickets.filter((t: any) => {
    const event = t.event as any
    return event && ['published', 'live'].includes(event.status) && t.status === 'valid'
  })

  const pastTickets = tickets.filter((t: any) => {
    const event = t.event as any
    return !event || event.status === 'ended' || t.status === 'used' || t.status === 'cancelled'
  })

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Mes billets</h1>
      <p className="mt-1 text-sm text-gray-500">
        Retrouve tous tes billets achetés sur O Show
      </p>

      {tickets.length === 0 ? (
        <div className="mt-12 rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
          <p className="text-4xl">🎫</p>
          <p className="mt-4 text-lg font-medium text-gray-600">
            Aucun billet pour le moment
          </p>
          <p className="mt-2 text-sm text-gray-400">
            Explore les événements et achète ton premier billet !
          </p>
          <Link href="/events" className="btn-primary mt-6 inline-block">
            Explorer les événements
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {upcomingTickets.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                À venir ({upcomingTickets.length})
              </h2>
              <div className="space-y-4">
                {upcomingTickets.map((ticket: any) => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))}
              </div>
            </section>
          )}

          {pastTickets.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold text-gray-500">
                Passés ({pastTickets.length})
              </h2>
              <div className="space-y-4">
                {pastTickets.map((ticket: any) => (
                  <TicketCard key={ticket.id} ticket={ticket} past />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function TicketCard({ ticket, past }: { ticket: any; past?: boolean }) {
  const event = ticket.event as any
  const statusStyles: Record<string, string> = {
    valid: 'bg-green-100 text-green-700',
    used: 'bg-amber-100 text-amber-700',
    cancelled: 'bg-red-100 text-red-700',
  }
  const statusLabels: Record<string, string> = {
    valid: 'Valide',
    used: 'Utilisé',
    cancelled: 'Annulé',
  }

  return (
    <Link
      href={`/t/${ticket.ticket_code}`}
      className={`block rounded-xl border transition-shadow hover:shadow-md ${
        past ? 'border-gray-100 opacity-70' : 'border-gray-200'
      }`}
    >
      <div className="flex gap-4 p-4">
        {event?.cover_image_url ? (
          <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg">
            <img
              src={event.cover_image_url}
              alt={event.title}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-lg bg-primary-50">
            <span className="text-2xl">🎉</span>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-gray-900 truncate">
              {event?.title || 'Événement'}
            </h3>
            <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[ticket.status] || statusStyles.valid}`}>
              {statusLabels[ticket.status] || ticket.status}
            </span>
          </div>

          {event?.starts_at && (
            <p className="mt-1 text-sm text-gray-500">
              {formatDate(event.starts_at)} {formatTime(event.starts_at)}
            </p>
          )}

          <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
            <span className="font-mono">{ticket.ticket_code}</span>
            <span>{ticket.ticket_type_name}</span>
            <span>{ticket.price_paid === 0 ? 'Gratuit' : formatFCFA(ticket.price_paid)}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
