'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import ScanResultCard from '@/components/scan/ScanResultCard'
import type { ScanResult, CheckInResult } from '@/types'

const QRScanner = dynamic(() => import('@/components/scan/QRScanner'), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center rounded-2xl bg-gray-100">
      <p className="text-sm text-gray-500">Chargement de la caméra...</p>
    </div>
  ),
})

interface ScannerViewProps {
  eventId: string
  eventTitle: string
  initialStats: { totalTickets: number; checkedIn: number }
}

interface ScanLogEntry {
  id: string
  result: CheckInResult
  holderName: string | null
  ticketType: string | null
  time: string
}

export default function ScannerView({ eventId, eventTitle, initialStats }: ScannerViewProps) {
  const [lastResult, setLastResult] = useState<ScanResult | null>(null)
  const [stats, setStats] = useState(initialStats)
  const [scanLog, setScanLog] = useState<ScanLogEntry[]>([])
  const [showScanner, setShowScanner] = useState(true)

  const refreshStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/checkin/stats/${eventId}`)
      if (res.ok) {
        const data = await res.json()
        setStats({ totalTickets: data.totalTickets, checkedIn: data.checkedIn })
      }
    } catch {}
  }, [eventId])

  useEffect(() => {
    const interval = setInterval(refreshStats, 10000)
    return () => clearInterval(interval)
  }, [refreshStats])

  const handleScanResult = useCallback((result: ScanResult) => {
    setLastResult(result)

    if (result.result === 'success') {
      setStats((prev) => ({ ...prev, checkedIn: prev.checkedIn + 1 }))
    }

    setScanLog((prev) => [{
      id: Date.now().toString(),
      result: result.result,
      holderName: result.ticket?.holderName || null,
      ticketType: result.ticket?.ticketType || null,
      time: new Date().toLocaleTimeString('fr-FR'),
    }, ...prev].slice(0, 50))
  }, [])

  const handleDismiss = useCallback(() => {
    setLastResult(null)
  }, [])

  const percentage = stats.totalTickets > 0
    ? Math.round((stats.checkedIn / stats.totalTickets) * 100)
    : 0

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-gray-800 px-4 py-3">
        <Link
          href="/dashboard"
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-800"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="truncate text-sm font-semibold">{eventTitle}</h1>
          <p className="text-xs text-gray-400">Scanner de billets</p>
        </div>
        <button
          onClick={() => setShowScanner(!showScanner)}
          className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300"
        >
          {showScanner ? 'Stats' : 'Scanner'}
        </button>
      </header>

      {/* Stats bar */}
      <div className="border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">{stats.checkedIn}</p>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Entrés</p>
          </div>
          <div className="flex-1 px-4">
            <div className="h-2 overflow-hidden rounded-full bg-gray-800">
              <div
                className="h-full rounded-full bg-green-500 transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <p className="mt-1 text-center text-xs text-gray-500">{percentage}%</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-400">{stats.totalTickets}</p>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Total</p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-lg p-4">
        {showScanner ? (
          <div className="space-y-4">
            {lastResult ? (
              <ScanResultCard result={lastResult} onDismiss={handleDismiss} />
            ) : (
              <QRScanner eventId={eventId} onScanResult={handleScanResult} />
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Live counter */}
            <div className="rounded-xl bg-gray-800 p-6 text-center">
              <p className="text-5xl font-bold text-green-400">{stats.checkedIn}</p>
              <p className="mt-1 text-gray-400">sur {stats.totalTickets} billets</p>
              <p className="text-sm text-gray-500">
                {stats.totalTickets - stats.checkedIn} restant{stats.totalTickets - stats.checkedIn !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Recent scans */}
            <div>
              <h3 className="mb-2 text-sm font-medium text-gray-400">Derniers scans</h3>
              {scanLog.length === 0 ? (
                <p className="text-center text-sm text-gray-600">Aucun scan pour le moment</p>
              ) : (
                <div className="space-y-1">
                  {scanLog.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 rounded-lg bg-gray-800/50 px-3 py-2"
                    >
                      <span className={`h-2 w-2 rounded-full ${
                        entry.result === 'success' ? 'bg-green-400' :
                        entry.result === 'already_used' ? 'bg-amber-400' : 'bg-red-400'
                      }`} />
                      <span className="flex-1 truncate text-sm">
                        {entry.holderName || entry.ticketType || 'Inconnu'}
                      </span>
                      <span className="text-xs text-gray-500">{entry.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-800 bg-gray-950 px-4 py-2 text-center text-[10px] text-gray-600">
        Propulsé par SugiTech
      </div>
    </div>
  )
}
