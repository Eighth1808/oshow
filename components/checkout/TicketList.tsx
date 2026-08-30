'use client'

import { useEffect, useRef, useState } from 'react'
import { buildTicketWhatsAppUrl } from '@/lib/qr'
import { formatDate } from '@/lib/utils'
import type { Ticket } from '@/types'

interface TicketListProps {
  tickets: Ticket[]
  eventTitle: string
  eventDate: string
  venueName: string
}

export default function TicketList({ tickets, eventTitle, eventDate, venueName }: TicketListProps) {
  return (
    <div className="mt-4 space-y-4">
      {tickets.map((ticket) => (
        <TicketCard
          key={ticket.id}
          ticket={ticket}
          eventTitle={eventTitle}
          eventDate={eventDate}
          venueName={venueName}
        />
      ))}
    </div>
  )
}

function TicketCard({
  ticket,
  eventTitle,
  eventDate,
  venueName,
}: {
  ticket: Ticket
  eventTitle: string
  eventDate: string
  venueName: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [qrReady, setQrReady] = useState(false)

  useEffect(() => {
    async function renderQR() {
      const QRCode = (await import('qrcode')).default
      if (canvasRef.current) {
        await QRCode.toCanvas(canvasRef.current, ticket.qr_data, {
          width: 200,
          margin: 2,
          color: { dark: '#1a1a1a', light: '#ffffff' },
        })
        setQrReady(true)
      }
    }
    renderQR()
  }, [ticket.qr_data])

  const whatsappUrl = buildTicketWhatsAppUrl(
    ticket.ticket_code,
    eventTitle,
    formatDate(eventDate),
    venueName
  )

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-dashed border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-900">
            {ticket.ticket_type_name}
          </span>
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
            Valide
          </span>
        </div>
        {ticket.holder_name && (
          <p className="mt-1 text-sm text-gray-500">{ticket.holder_name}</p>
        )}
      </div>

      <div className="flex flex-col items-center p-6">
        <canvas ref={canvasRef} className={qrReady ? '' : 'hidden'} />
        {!qrReady && (
          <div className="flex h-[200px] w-[200px] items-center justify-center">
            <span className="text-sm text-gray-400">Chargement...</span>
          </div>
        )}
        <p className="mt-3 font-mono text-sm font-medium tracking-wider text-gray-700">
          {ticket.ticket_code}
        </p>
      </div>

      <div className="flex border-t border-gray-100">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium text-green-600 transition-colors hover:bg-green-50"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.025.506 3.933 1.395 5.608L.05 23.708a.5.5 0 00.606.607l6.1-1.345A11.955 11.955 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.83 0-3.557-.494-5.038-1.357l-.352-.21-3.647.803.818-3.562-.231-.367A9.935 9.935 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
          </svg>
          Envoyer via WhatsApp
        </a>
        <a
          href={`/t/${ticket.ticket_code}`}
          className="flex flex-1 items-center justify-center gap-2 border-l border-gray-100 py-3 text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50"
        >
          Voir le billet
        </a>
      </div>
    </div>
  )
}
