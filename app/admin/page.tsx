'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatFCFA } from '@/lib/fees'

interface AdminStats {
  totalEvents: number
  publishedEvents: number
  totalOrganizers: number
  totalUsers: number
  totalOrders: number
  platformRevenue: number
  totalSales: number
  pendingPayouts: number
  totalTicketsSold: number
  recentEvents: Array<{
    id: string
    title: string
    status: string
    starts_at: string
    tickets_sold: number
    total_revenue: number
    created_at: string
    organization: { name: string } | null
  }>
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color || 'text-gray-900'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: 'bg-gray-100 text-gray-600' },
  published: { label: 'Publié', color: 'bg-blue-100 text-blue-700' },
  live: { label: 'En cours', color: 'bg-green-100 text-green-700' },
  ended: { label: 'Terminé', color: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'Annulé', color: 'bg-red-100 text-red-700' },
  settled: { label: 'Réglé', color: 'bg-purple-100 text-purple-700' },
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Tableau de bord</h2>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Revenu plateforme"
          value={formatFCFA(stats.platformRevenue)}
          color="text-green-600"
        />
        <StatCard
          label="Volume total"
          value={formatFCFA(stats.totalSales)}
        />
        <StatCard
          label="Billets vendus"
          value={String(stats.totalTicketsSold)}
        />
        <StatCard
          label="Commandes"
          value={String(stats.totalOrders)}
        />
        <StatCard
          label="Événements"
          value={String(stats.totalEvents)}
          sub={`${stats.publishedEvents} actif${stats.publishedEvents !== 1 ? 's' : ''}`}
        />
        <StatCard
          label="Organisateurs"
          value={String(stats.totalOrganizers)}
        />
        <StatCard
          label="Utilisateurs"
          value={String(stats.totalUsers)}
        />
        <StatCard
          label="Versements en attente"
          value={String(stats.pendingPayouts)}
          color={stats.pendingPayouts > 0 ? 'text-amber-600' : 'text-gray-900'}
        />
      </div>

      {/* Quick links */}
      {stats.pendingPayouts > 0 && (
        <Link
          href="/admin/payouts"
          className="block rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 hover:bg-amber-100"
        >
          {stats.pendingPayouts} versement{stats.pendingPayouts !== 1 ? 's' : ''} en attente d'approbation →
        </Link>
      )}

      {/* Recent events */}
      <div>
        <h3 className="mb-3 text-lg font-semibold text-gray-900">Derniers événements</h3>
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-4 py-3 font-medium text-gray-500">Événement</th>
                <th className="px-4 py-3 font-medium text-gray-500">Organisateur</th>
                <th className="px-4 py-3 font-medium text-gray-500">Statut</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-right">Billets</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-right">Revenu</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentEvents.map((event) => {
                const status = STATUS_LABELS[event.status] || STATUS_LABELS.draft
                return (
                  <tr key={event.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{event.title}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(event.starts_at).toLocaleDateString('fr-FR')}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {event.organization?.name || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {event.tickets_sold}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {formatFCFA(event.total_revenue)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
