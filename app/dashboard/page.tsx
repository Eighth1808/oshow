import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatFCFA } from '@/lib/fees'
import { formatDate } from '@/lib/utils'
import OnboardingBanner from '@/components/dashboard/OnboardingBanner'

async function getDashboardData(userId: string) {
  const supabase = createClient()

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_id', userId)
    .single()

  if (!org) return null

  const [eventsRes, ordersRes, payoutsRes] = await Promise.all([
    supabase
      .from('events')
      .select('id, title, slug, status, starts_at, tickets_sold, total_revenue, cover_image_url')
      .eq('organization_id', org.id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('orders')
      .select('id, order_number, total, status, created_at, buyer_name')
      .eq('organization_id', org.id)
      .in('status', ['paid', 'confirmed'])
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('payouts')
      .select('id, amount, status')
      .eq('organization_id', org.id)
      .eq('status', 'pending'),
  ])

  const events = eventsRes.data || []
  const totalTickets = events.reduce((sum, e) => sum + (e.tickets_sold || 0), 0)
  const totalRevenue = events.reduce((sum, e) => sum + (e.total_revenue || 0), 0)
  const activeEvents = events.filter((e) => ['published', 'live'].includes(e.status)).length

  return {
    events,
    recentOrders: ordersRes.data || [],
    stats: {
      totalEvents: events.length,
      activeEvents,
      totalTickets,
      totalRevenue,
      pendingPayouts: payoutsRes.data?.length || 0,
    },
  }
}

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const data = await getDashboardData(user.id)

  if (!data) {
    return <OnboardingBanner />
  }

  const { events, recentOrders, stats } = data

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Événements" value={stats.totalEvents} sub={`${stats.activeEvents} actifs`} />
        <StatCard label="Billets vendus" value={stats.totalTickets} />
        <StatCard label="Revenus" value={formatFCFA(stats.totalRevenue)} />
        <StatCard label="Paiements en attente" value={stats.pendingPayouts} />
      </div>

      {/* Recent Events */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Mes événements</h2>
          <Link href="/dashboard/events" className="text-sm font-medium text-primary-500 hover:text-primary-600">
            Voir tout &rarr;
          </Link>
        </div>
        {events.length > 0 ? (
          <div className="mt-4 space-y-3">
            {events.map((event: any) => (
              <Link
                key={event.id}
                href={`/dashboard/events/${event.id}`}
                className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 transition-colors hover:border-primary-200"
              >
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary-50 text-xl">
                  {event.cover_image_url ? '🎫' : '🎉'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{event.title}</p>
                  <p className="text-sm text-gray-500">{formatDate(event.starts_at, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{event.tickets_sold || 0} billets</p>
                  <StatusBadge status={event.status} />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border-2 border-dashed border-gray-200 py-8 text-center">
            <p className="text-gray-500">Aucun événement</p>
            <Link href="/dashboard/events/new" className="btn-primary mt-4">
              Créer un événement
            </Link>
          </div>
        )}
      </div>

      {/* Recent Orders */}
      {recentOrders.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">Dernières commandes</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="pb-3 font-medium">Commande</th>
                  <th className="pb-3 font-medium">Client</th>
                  <th className="pb-3 font-medium">Montant</th>
                  <th className="pb-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order: any) => (
                  <tr key={order.id} className="border-b border-gray-50">
                    <td className="py-3 font-medium text-gray-900">{order.order_number}</td>
                    <td className="py-3 text-gray-600">{order.buyer_name || '—'}</td>
                    <td className="py-3 font-medium text-gray-900">{formatFCFA(order.total)}</td>
                    <td className="py-3 text-gray-500">{formatDate(order.created_at, { month: 'short', day: 'numeric' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
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
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] || styles.draft}`}>
      {labels[status] || status}
    </span>
  )
}
