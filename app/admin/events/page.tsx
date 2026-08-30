'use client'

import { useState, useEffect } from 'react'
import { formatFCFA } from '@/lib/fees'

interface AdminEvent {
  id: string
  title: string
  slug: string
  status: string
  category: string
  starts_at: string
  ends_at: string | null
  venue_name: string | null
  venue_city: string
  is_free: boolean
  is_featured: boolean
  tickets_sold: number
  total_revenue: number
  total_check_ins: number
  created_at: string
  published_at: string | null
  organization: { id: string; name: string; is_verified: boolean } | null
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: 'bg-gray-100 text-gray-600' },
  published: { label: 'Publié', color: 'bg-blue-100 text-blue-700' },
  live: { label: 'En cours', color: 'bg-green-100 text-green-700' },
  ended: { label: 'Terminé', color: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'Annulé', color: 'bg-red-100 text-red-700' },
  settled: { label: 'Réglé', color: 'bg-purple-100 text-purple-700' },
}

const STATUS_OPTIONS = ['draft', 'published', 'live', 'ended', 'cancelled', 'settled']

export default function AdminEvents() {
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/events')
      .then((r) => r.json())
      .then((data) => setEvents(data.events || []))
      .finally(() => setLoading(false))
  }, [])

  async function handleStatusChange(eventId: string, newStatus: string) {
    setActionLoading(eventId)
    try {
      const res = await fetch('/api/admin/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, status: newStatus }),
      })
      if (res.ok) {
        setEvents((prev) =>
          prev.map((e) => e.id === eventId ? { ...e, status: newStatus } : e)
        )
      }
    } finally {
      setActionLoading(null)
    }
  }

  async function handleToggleFeatured(eventId: string, featured: boolean) {
    setActionLoading(eventId)
    try {
      const res = await fetch('/api/admin/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, is_featured: featured }),
      })
      if (res.ok) {
        setEvents((prev) =>
          prev.map((e) => e.id === eventId ? { ...e, is_featured: featured } : e)
        )
      }
    } finally {
      setActionLoading(null)
    }
  }

  const filtered = filter === 'all' ? events : events.filter((e) => e.status === filter)

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
        <h2 className="text-xl font-bold text-gray-900">Événements</h2>
        <p className="text-sm text-gray-500">{events.length} événement{events.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            filter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Tous ({events.length})
        </button>
        {STATUS_OPTIONS.map((s) => {
          const count = events.filter((e) => e.status === s).length
          if (count === 0) return null
          const st = STATUS_LABELS[s]
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === s ? 'bg-gray-900 text-white' : `${st.color} hover:opacity-80`
              }`}
            >
              {st.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Events table */}
      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="px-4 py-3 font-medium text-gray-500">Événement</th>
              <th className="px-4 py-3 font-medium text-gray-500">Organisateur</th>
              <th className="px-4 py-3 font-medium text-gray-500">Statut</th>
              <th className="px-4 py-3 font-medium text-gray-500 text-right">Billets</th>
              <th className="px-4 py-3 font-medium text-gray-500 text-right">Revenu</th>
              <th className="px-4 py-3 font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((event) => {
              const status = STATUS_LABELS[event.status] || STATUS_LABELS.draft
              const isLoading = actionLoading === event.id
              return (
                <tr key={event.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {event.is_featured && (
                        <span className="text-amber-500" title="Mis en avant">★</span>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{event.title}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(event.starts_at).toLocaleDateString('fr-FR')} — {event.venue_city}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-600">{event.organization?.name || '—'}</span>
                      {event.organization?.is_verified && (
                        <svg className="h-3.5 w-3.5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={event.status}
                      disabled={isLoading}
                      onChange={(e) => handleStatusChange(event.id, e.target.value)}
                      className={`rounded-lg border-0 px-2 py-1 text-xs font-medium ${status.color}`}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{STATUS_LABELS[s].label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {event.tickets_sold}
                    {event.total_check_ins > 0 && (
                      <span className="text-xs text-gray-400"> ({event.total_check_ins} entrés)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {event.is_free ? 'Gratuit' : formatFCFA(event.total_revenue)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleFeatured(event.id, !event.is_featured)}
                      disabled={isLoading}
                      className={`rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
                        event.is_featured
                          ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                      title={event.is_featured ? 'Retirer de la une' : 'Mettre en avant'}
                    >
                      {event.is_featured ? '★ En vedette' : '☆ Mettre en avant'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-8 text-center text-sm text-gray-500">
            Aucun événement trouvé
          </div>
        )}
      </div>
    </div>
  )
}
