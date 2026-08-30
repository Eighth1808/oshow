'use client'

import type { ScanResult } from '@/types'

interface ScanResultCardProps {
  result: ScanResult
  onDismiss: () => void
}

const RESULT_STYLES = {
  success: {
    bg: 'bg-green-50 border-green-200',
    icon: 'text-green-500',
    title: 'text-green-800',
  },
  already_used: {
    bg: 'bg-amber-50 border-amber-200',
    icon: 'text-amber-500',
    title: 'text-amber-800',
  },
  invalid: {
    bg: 'bg-red-50 border-red-200',
    icon: 'text-red-500',
    title: 'text-red-800',
  },
  wrong_event: {
    bg: 'bg-red-50 border-red-200',
    icon: 'text-red-500',
    title: 'text-red-800',
  },
}

export default function ScanResultCard({ result, onDismiss }: ScanResultCardProps) {
  const style = RESULT_STYLES[result.result]

  return (
    <div className={`rounded-xl border-2 p-4 ${style.bg}`}>
      <div className="flex items-start gap-3">
        <div className={`text-3xl ${style.icon}`}>
          {result.result === 'success' ? (
            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : result.result === 'already_used' ? (
            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ) : (
            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>

        <div className="flex-1">
          <p className={`text-lg font-bold ${style.title}`}>
            {result.message}
          </p>
          {result.ticket && (
            <div className="mt-2 space-y-1 text-sm text-gray-700">
              {result.ticket.holderName && (
                <p><span className="font-medium">Nom:</span> {result.ticket.holderName}</p>
              )}
              <p><span className="font-medium">Type:</span> {result.ticket.ticketType}</p>
              <p><span className="font-medium">Code:</span> {result.ticket.code}</p>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={onDismiss}
        className="mt-3 w-full rounded-lg bg-white/80 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-white"
      >
        Scanner un autre billet
      </button>
    </div>
  )
}
