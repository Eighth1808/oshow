'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { formatFCFA } from '@/lib/fees'

interface CheckoutClientProps {
  orderId: string
  total: number
}

export default function CheckoutClient({ orderId, total }: CheckoutClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [timeLeft, setTimeLeft] = useState(900) // 15 min

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          router.push(`/checkout/${orderId}/cancel`)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [orderId, router])

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  async function handlePay() {
    setLoading(true)
    // In mock mode, the order is already paid by the initiate endpoint.
    // This page is only reached in live mode when FedaPay redirects back.
    router.push(`/checkout/${orderId}/success`)
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-lg bg-amber-50 p-3 text-center text-sm text-amber-700">
        Temps restant: {minutes}:{seconds.toString().padStart(2, '0')}
      </div>

      <button
        onClick={handlePay}
        disabled={loading}
        className="btn-accent w-full !py-3.5 text-lg"
      >
        {loading ? 'Redirection...' : `Payer ${formatFCFA(total)}`}
      </button>

      <p className="text-center text-xs text-gray-400">
        Paiement sécurisé par Mobile Money (Flooz / T-Money)
      </p>
    </div>
  )
}
