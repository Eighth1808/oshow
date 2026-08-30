'use client'

import { useState, useEffect } from 'react'
import { formatFCFA } from '@/lib/fees'

interface AdminPayout {
  id: string
  payout_number: string
  amount: number
  fee_deducted: number
  net_amount: number
  status: string
  payment_method: string | null
  payment_reference: string | null
  notes: string | null
  processed_at: string | null
  created_at: string
  organization: {
    id: string
    name: string
    mobile_money_number: string | null
    mobile_money_provider: string | null
  } | null
  event: {
    id: string
    title: string
    status: string
    ends_at: string | null
    tickets_sold: number
    total_revenue: number
  } | null
}

const PAYOUT_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-amber-100 text-amber-700' },
  processing: { label: 'En cours', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Terminé', color: 'bg-green-100 text-green-700' },
  failed: { label: 'Échoué', color: 'bg-red-100 text-red-700' },
}

export default function AdminPayouts() {
  const [payouts, setPayouts] = useState<AdminPayout[]>([])
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    loadPayouts()
  }, [])

  function loadPayouts() {
    setLoading(true)
    fetch('/api/admin/payouts')
      .then((r) => r.json())
      .then((data) => setPayouts(data.payouts || []))
      .finally(() => setLoading(false))
  }

  async function handleApprove(payoutId: string) {
    if (!confirm('Confirmer l\'approbation de ce versement ? L\'argent sera envoyé à l\'organisateur.')) {
      return
    }

    setApproving(payoutId)
    try {
      const res = await fetch(`/api/admin/payouts/${payoutId}/approve`, {
        method: 'POST',
      })
      const data = await res.json()

      if (data.success) {
        setPayouts((prev) =>
          prev.map((p) =>
            p.id === payoutId
              ? { ...p, status: data.mock ? 'completed' : 'processing', payment_reference: data.transactionId || null }
              : p
          )
        )
        alert(data.message)
      } else {
        alert(`Erreur: ${data.error}`)
      }
    } catch {
      alert('Erreur réseau')
    } finally {
      setApproving(null)
    }
  }

  const filtered = filter === 'all' ? payouts : payouts.filter((p) => p.status === filter)
  const pendingCount = payouts.filter((p) => p.status === 'pending').length

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Versements</h2>
        <button
          onClick={loadPayouts}
          className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
        >
          Actualiser
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {['all', 'pending', 'processing', 'completed', 'failed'].map((s) => {
          const count = s === 'all' ? payouts.length : payouts.filter((p) => p.status === s).length
          if (count === 0 && s !== 'all') return null
          const st = s === 'all' ? { label: 'Tous', color: '' } : PAYOUT_STATUS[s]
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === s ? 'bg-gray-900 text-white' : s === 'all' ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : `${st.color} hover:opacity-80`
              }`}
            >
              {st.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Payouts list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl bg-white py-12 text-center shadow-sm">
          <p className="text-gray-500">Aucun versement trouvé</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((payout) => {
            const status = PAYOUT_STATUS[payout.status] || PAYOUT_STATUS.pending
            const isExpanded = expandedId === payout.id
            const isApproving = approving === payout.id

            return (
              <div
                key={payout.id}
                className="overflow-hidden rounded-xl bg-white shadow-sm"
              >
                {/* Main row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : payout.id)}
                  className="flex w-full items-center gap-4 px-4 py-4 text-left hover:bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{payout.payout_number}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-gray-500">
                      {payout.organization?.name} — {payout.event?.title || 'Multi-événement'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{formatFCFA(payout.net_amount)}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(payout.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <svg
                    className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Montant brut</p>
                        <p className="font-medium">{formatFCFA(payout.amount)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Frais déduits</p>
                        <p className="font-medium">{formatFCFA(payout.fee_deducted)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Montant net</p>
                        <p className="font-bold text-green-600">{formatFCFA(payout.net_amount)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Mode de paiement</p>
                        <p className="font-medium">
                          {payout.organization?.mobile_money_provider?.toUpperCase() || '—'}
                          {payout.organization?.mobile_money_number && (
                            <span className="ml-1 text-gray-400">({payout.organization.mobile_money_number})</span>
                          )}
                        </p>
                      </div>
                      {payout.event && (
                        <>
                          <div>
                            <p className="text-gray-500">Billets vendus</p>
                            <p className="font-medium">{payout.event.tickets_sold}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Revenu événement</p>
                            <p className="font-medium">{formatFCFA(payout.event.total_revenue)}</p>
                          </div>
                        </>
                      )}
                      {payout.payment_reference && (
                        <div className="col-span-2">
                          <p className="text-gray-500">Référence</p>
                          <p className="font-mono text-xs">{payout.payment_reference}</p>
                        </div>
                      )}
                      {payout.notes && (
                        <div className="col-span-2">
                          <p className="text-gray-500">Notes</p>
                          <p className="text-red-600">{payout.notes}</p>
                        </div>
                      )}
                    </div>

                    {payout.status === 'pending' && (
                      <button
                        onClick={() => handleApprove(payout.id)}
                        disabled={isApproving}
                        className="mt-4 w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                      >
                        {isApproving ? 'Traitement en cours...' : 'Approuver le versement'}
                      </button>
                    )}

                    {payout.status === 'failed' && (
                      <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                        Le versement a échoué. Vérifiez le numéro Mobile Money et réessayez.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
