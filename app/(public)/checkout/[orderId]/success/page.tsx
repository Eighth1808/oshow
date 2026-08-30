import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatFCFA } from '@/lib/fees'
import { formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import TicketList from '@/components/checkout/TicketList'

export default async function CheckoutSuccessPage({
  params,
}: {
  params: { orderId: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const admin = createAdminClient()

  const { data: order } = await admin
    .from('orders')
    .select(`
      *,
      event:events(id, title, slug, cover_image_url, starts_at, venue_name, venue_address)
    `)
    .eq('id', params.orderId)
    .eq('buyer_id', user.id)
    .single()

  if (!order || order.status !== 'paid') {
    redirect('/')
  }

  const { data: tickets } = await admin
    .from('tickets')
    .select('*')
    .eq('order_id', order.id)
    .order('created_at', { ascending: true })

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
          ✓
        </div>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Paiement confirmé !</h1>
        <p className="mt-2 text-gray-500">
          Commande <span className="font-mono font-medium">{order.order_number}</span>
        </p>
      </div>

      {order.event && (
        <div className="mt-6 card">
          <div className="flex gap-4">
            {order.event.cover_image_url && (
              <img
                src={order.event.cover_image_url}
                alt={order.event.title}
                className="h-20 w-20 rounded-lg object-cover"
              />
            )}
            <div>
              <h2 className="font-medium text-gray-900">{order.event.title}</h2>
              <p className="mt-1 text-sm text-gray-500">
                {formatDateTime(order.event.starts_at)}
              </p>
              {order.event.venue_name && (
                <p className="text-sm text-gray-500">{order.event.venue_name}</p>
              )}
            </div>
          </div>
          <div className="mt-4 border-t border-gray-100 pt-4 text-sm text-gray-500">
            <div className="flex justify-between">
              <span>Total payé</span>
              <span className="font-medium text-gray-900">{formatFCFA(order.total)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6">
        <h2 className="text-lg font-bold text-gray-900">
          {tickets && tickets.length > 1 ? 'Tes billets' : 'Ton billet'}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Présente le QR code à l&apos;entrée de l&apos;événement.
        </p>

        {tickets && tickets.length > 0 && (
          <TicketList
            tickets={tickets}
            eventTitle={order.event?.title || ''}
            eventDate={order.event?.starts_at || ''}
            venueName={order.event?.venue_name || ''}
          />
        )}
      </div>

      <div className="mt-8 flex gap-3">
        <Link href="/dashboard" className="btn-outline flex-1 text-center">
          Mes billets
        </Link>
        <Link href="/" className="btn-ghost flex-1 text-center">
          Accueil
        </Link>
      </div>
    </div>
  )
}
