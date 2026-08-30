import { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDateTime } from '@/lib/utils'
import { formatFCFA } from '@/lib/fees'
import TicketQR from '@/components/checkout/TicketQR'
import Link from 'next/link'

interface TicketPageProps {
  params: { ticketCode: string }
}

export async function generateMetadata({ params }: TicketPageProps): Promise<Metadata> {
  const admin = createAdminClient()
  const { data: ticket } = await admin
    .from('tickets')
    .select('ticket_code, ticket_type_name, event:events(title)')
    .eq('ticket_code', params.ticketCode)
    .single()

  if (!ticket) {
    return { title: 'Billet non trouvé — O Show' }
  }

  return {
    title: `Billet ${ticket.ticket_code} — O Show`,
    description: `${ticket.ticket_type_name} pour ${(ticket.event as any)?.title}`,
  }
}

export default async function TicketPage({ params }: TicketPageProps) {
  const admin = createAdminClient()

  const { data: ticket } = await admin
    .from('tickets')
    .select(`
      *,
      event:events(id, title, slug, cover_image_url, starts_at, ends_at, venue_name, venue_address, venue_city, is_online, online_url),
      order:orders(order_number)
    `)
    .eq('ticket_code', params.ticketCode)
    .single()

  if (!ticket) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="card">
          <div className="text-5xl">🎫</div>
          <h1 className="mt-4 text-xl font-bold text-gray-900">Billet non trouvé</h1>
          <p className="mt-2 text-gray-500">
            Ce code de billet est invalide ou n&apos;existe pas.
          </p>
          <Link href="/" className="btn-primary mt-6 inline-block">
            Accueil
          </Link>
        </div>
      </div>
    )
  }

  const isValid = ticket.status === 'valid'
  const isUsed = ticket.status === 'used'

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      {/* Status Banner */}
      {isUsed && (
        <div className="mb-4 rounded-xl bg-amber-50 p-4 text-center">
          <p className="font-medium text-amber-700">Ce billet a déjà été scanné</p>
          {ticket.checked_in_at && (
            <p className="mt-1 text-sm text-amber-600">
              Entrée le {formatDateTime(ticket.checked_in_at)}
            </p>
          )}
        </div>
      )}

      {ticket.status === 'cancelled' && (
        <div className="mb-4 rounded-xl bg-red-50 p-4 text-center">
          <p className="font-medium text-red-700">Ce billet a été annulé</p>
        </div>
      )}

      {/* Ticket Card */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* Event Header */}
        {ticket.event?.cover_image_url && (
          <div className="relative h-40">
            <img
              src={ticket.event.cover_image_url}
              alt={ticket.event.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <h1 className="text-lg font-bold text-white">{ticket.event.title}</h1>
            </div>
          </div>
        )}

        {!ticket.event?.cover_image_url && ticket.event && (
          <div className="bg-primary-600 p-6">
            <h1 className="text-lg font-bold text-white">{ticket.event.title}</h1>
          </div>
        )}

        {/* Event Details */}
        {ticket.event && (
          <div className="space-y-3 border-b border-dashed border-gray-200 p-4">
            <div className="flex items-start gap-3">
              <span className="text-lg">📅</span>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {formatDateTime(ticket.event.starts_at)}
                </p>
              </div>
            </div>

            {ticket.event.venue_name && (
              <div className="flex items-start gap-3">
                <span className="text-lg">📍</span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{ticket.event.venue_name}</p>
                  {ticket.event.venue_address && (
                    <p className="text-xs text-gray-500">{ticket.event.venue_address}</p>
                  )}
                </div>
              </div>
            )}

            {ticket.event.is_online && ticket.event.online_url && (
              <div className="flex items-start gap-3">
                <span className="text-lg">🌐</span>
                <p className="text-sm font-medium text-primary-600">Événement en ligne</p>
              </div>
            )}
          </div>
        )}

        {/* QR Code */}
        <div className="flex flex-col items-center p-6">
          <TicketQR qrData={ticket.qr_data} isValid={isValid} />
          <p className="mt-3 font-mono text-sm font-medium tracking-wider text-gray-700">
            {ticket.ticket_code}
          </p>
        </div>

        {/* Ticket Info */}
        <div className="space-y-2 border-t border-dashed border-gray-200 p-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Type</span>
            <span className="font-medium text-gray-900">{ticket.ticket_type_name}</span>
          </div>
          {ticket.holder_name && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Titulaire</span>
              <span className="font-medium text-gray-900">{ticket.holder_name}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Prix</span>
            <span className="font-medium text-gray-900">
              {ticket.price_paid === 0 ? 'Gratuit' : formatFCFA(ticket.price_paid)}
            </span>
          </div>
          {ticket.order?.order_number && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Commande</span>
              <span className="font-mono text-gray-700">{ticket.order.order_number}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Statut</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              isValid
                ? 'bg-green-100 text-green-700'
                : isUsed
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-red-100 text-red-700'
            }`}>
              {isValid ? 'Valide' : isUsed ? 'Utilisé' : 'Annulé'}
            </span>
          </div>
        </div>

        {/* WhatsApp Share */}
        {isValid && ticket.event && (
          <div className="border-t border-gray-100 p-4">
            <TicketWhatsApp
              ticketCode={ticket.ticket_code}
              eventTitle={ticket.event.title}
              eventDate={ticket.event.starts_at}
              venueName={ticket.event.venue_name || ''}
            />
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-gray-400">
        Présente ce QR code à l&apos;entrée de l&apos;événement.
      </p>
    </div>
  )
}

function TicketWhatsApp({
  ticketCode,
  eventTitle,
  eventDate,
  venueName,
}: {
  ticketCode: string
  eventTitle: string
  eventDate: string
  venueName: string
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://oshow.tg'
  const ticketUrl = `${baseUrl}/t/${ticketCode}`
  const message = [
    `🎫 Mon billet O Show`,
    ``,
    `📌 ${eventTitle}`,
    `📅 ${formatDateTime(eventDate)}`,
    `📍 ${venueName}`,
    ``,
    `🔗 ${ticketUrl}`,
    ``,
    `Présente ce QR code à l'entrée.`,
  ].join('\n')

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 px-4 py-3 font-medium text-white transition-colors hover:bg-green-600"
    >
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.025.506 3.933 1.395 5.608L.05 23.708a.5.5 0 00.606.607l6.1-1.345A11.955 11.955 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.83 0-3.557-.494-5.038-1.357l-.352-.21-3.647.803.818-3.562-.231-.367A9.935 9.935 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
      </svg>
      Envoyer via WhatsApp
    </a>
  )
}
