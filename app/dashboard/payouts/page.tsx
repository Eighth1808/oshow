import { createClient } from '@/lib/supabase/server'
import { formatFCFA } from '@/lib/fees'
import { formatDate } from '@/lib/utils'

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  processing: 'bg-blue-50 text-blue-700',
  completed: 'bg-green-50 text-green-700',
  failed: 'bg-red-50 text-red-700',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  processing: 'En cours',
  completed: 'Terminé',
  failed: 'Échoué',
}

async function getPayouts(userId: string) {
  const supabase = createClient()

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_id', userId)
    .single()

  if (!org) return []

  const { data } = await supabase
    .from('payouts')
    .select(`
      *,
      event:events (title)
    `)
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false })

  return data || []
}

export default async function PayoutsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const payouts = await getPayouts(user.id)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Paiements</h1>
      <p className="mt-2 text-gray-500">
        Les paiements sont traités 48h après la fin de l&apos;événement.
      </p>

      {payouts.length > 0 ? (
        <div className="mt-6 space-y-3">
          {payouts.map((payout: any) => (
            <div key={payout.id} className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-50 text-lg">
                💰
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">
                  {payout.event?.title || payout.payout_number}
                </p>
                <p className="text-sm text-gray-500">
                  {payout.payout_number} &middot; {formatDate(payout.created_at, { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">{formatFCFA(payout.net_amount)}</p>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[payout.status] || STATUS_STYLES.pending}`}>
                  {STATUS_LABELS[payout.status] || payout.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-xl border-2 border-dashed border-gray-200 py-16 text-center">
          <div className="text-5xl">💰</div>
          <p className="mt-4 text-lg font-medium text-gray-600">
            Aucun paiement
          </p>
          <p className="mt-2 text-sm text-gray-400">
            Les paiements apparaîtront ici après tes premiers événements.
          </p>
        </div>
      )}
    </div>
  )
}
