'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatFCFA, calculateFees } from '@/lib/fees'
import type { TicketType } from '@/types'

interface TicketSelectorProps {
  eventId: string
  ticketTypes: TicketType[]
  maxPerOrder: number
}

export default function TicketSelector({ eventId, ticketTypes, maxPerOrder }: TicketSelectorProps) {
  const router = useRouter()
  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(ticketTypes.map((t) => [t.id, 0]))
  )
  const [loading, setLoading] = useState(false)
  const [phone, setPhone] = useState('')

  const totalQuantity = Object.values(quantities).reduce((sum, q) => sum + q, 0)

  const totalBreakdown = ticketTypes.reduce(
    (acc, tt) => {
      const qty = quantities[tt.id] || 0
      if (qty === 0) return acc
      const fees = calculateFees(tt.price, qty)
      return {
        subtotal: acc.subtotal + fees.subtotal,
        platformFee: acc.platformFee + fees.totalPlatformFee,
        total: acc.total + fees.buyerTotal,
      }
    },
    { subtotal: 0, platformFee: 0, total: 0 }
  )

  function updateQuantity(ticketTypeId: string, delta: number) {
    setQuantities((prev) => {
      const current = prev[ticketTypeId] || 0
      const tt = ticketTypes.find((t) => t.id === ticketTypeId)
      if (!tt) return prev

      const available = tt.quantity - tt.quantity_sold
      const newQty = Math.max(0, Math.min(current + delta, available, tt.max_per_order))
      const newTotal = totalQuantity - current + newQty
      if (newTotal > maxPerOrder) return prev

      return { ...prev, [ticketTypeId]: newQty }
    })
  }

  async function handleCheckout() {
    const rawPhone = phone.replace(/\s/g, '')
    if (!rawPhone || rawPhone.length < 8) {
      alert('Entre ton numéro de téléphone pour le paiement mobile.')
      return
    }

    setLoading(true)
    const items = ticketTypes
      .filter((tt) => (quantities[tt.id] || 0) > 0)
      .map((tt) => ({
        ticketTypeId: tt.id,
        quantity: quantities[tt.id],
      }))

    try {
      const res = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, items, buyerPhone: rawPhone }),
      })

      if (res.status === 401) {
        router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
        return
      }

      let data
      try {
        data = await res.json()
      } catch {
        const text = await res.text().catch(() => '')
        console.error('API returned non-JSON:', res.status, text.slice(0, 200))
        alert(`Erreur serveur (${res.status}). Réessaie dans un instant.`)
        setLoading(false)
        return
      }

      if (!res.ok) {
        alert(data.error || 'Erreur lors de la commande')
        setLoading(false)
        return
      }
      if (data.redirectUrl) {
        if (data.redirectUrl.startsWith('http')) {
          window.location.href = data.redirectUrl
        } else {
          router.push(data.redirectUrl)
        }
      }
    } catch (err) {
      console.error('Checkout error:', err)
      alert(`Erreur: ${err instanceof Error ? err.message : 'Vérifie ta connexion'}`)
      setLoading(false)
    }
  }

  return (
    <div className="mt-4 space-y-4">
      {ticketTypes.map((tt) => {
        const available = tt.quantity - tt.quantity_sold
        const soldOut = available <= 0
        const qty = quantities[tt.id] || 0

        return (
          <div
            key={tt.id}
            className={`rounded-xl border p-4 transition-colors ${
              soldOut ? 'border-gray-100 bg-gray-50 opacity-60' : 'border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-gray-900">{tt.name}</h3>
                {tt.description && (
                  <p className="mt-1 text-xs text-gray-500">{tt.description}</p>
                )}
              </div>
              <span className="font-bold text-gray-900">
                {tt.price === 0 ? 'Gratuit' : formatFCFA(tt.price)}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {soldOut ? 'Épuisé' : `${available} restants`}
              </span>
              {!soldOut && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => updateQuantity(tt.id, -1)}
                    disabled={qty === 0}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-30"
                  >
                    -
                  </button>
                  <span className="w-6 text-center font-medium">{qty}</span>
                  <button
                    onClick={() => updateQuantity(tt.id, 1)}
                    disabled={qty >= Math.min(available, tt.max_per_order)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-primary-500 text-primary-500 transition-colors hover:bg-primary-50 disabled:opacity-30"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })}

      {totalQuantity > 0 && (
        <div className="space-y-3 border-t border-gray-100 pt-4">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Sous-total</span>
            <span>{formatFCFA(totalBreakdown.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>Frais de service</span>
            <span>{formatFCFA(totalBreakdown.platformFee)}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-gray-900">
            <span>Total</span>
            <span>{formatFCFA(totalBreakdown.total)}</span>
          </div>

          <div>
            <label htmlFor="checkout-phone" className="block text-sm font-medium text-gray-700">
              Numéro Flooz / T-Money
            </label>
            <div className="mt-1 flex items-center gap-2">
              <span className="flex h-11 items-center rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">
                +228
              </span>
              <input
                id="checkout-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, ''))}
                placeholder="90 12 34 56"
                className="input-field !py-2.5"
                required
              />
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={loading || !phone.replace(/\s/g, '')}
            className="btn-accent w-full !py-3.5"
          >
            {loading ? 'Chargement...' : `Payer — ${formatFCFA(totalBreakdown.total)}`}
          </button>
        </div>
      )}
    </div>
  )
}
