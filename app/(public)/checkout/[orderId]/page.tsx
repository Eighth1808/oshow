import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatFCFA } from '@/lib/fees'
import { formatDateTime } from '@/lib/utils'
import CheckoutClient from '@/components/checkout/CheckoutClient'

export default async function CheckoutPage({
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

  if (!order) {
    redirect('/')
  }

  // If already paid, redirect to success
  if (order.status === 'paid') {
    redirect(`/checkout/${order.id}/success`)
  }

  // If expired or cancelled
  if (order.status === 'expired' || order.status === 'cancelled') {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="card">
          <div className="text-5xl">❌</div>
          <h1 className="mt-4 text-xl font-bold text-gray-900">Commande expirée</h1>
          <p className="mt-2 text-gray-500">
            Cette commande a expiré. Veuillez recommencer votre achat.
          </p>
          <a href={`/e/${order.event?.slug}`} className="btn-primary mt-6 inline-block">
            Retour à l&apos;événement
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="card">
        <h1 className="text-xl font-bold text-gray-900">Finaliser votre commande</h1>

        {order.event && (
          <div className="mt-4 flex gap-4 rounded-lg bg-gray-50 p-4">
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
        )}

        <div className="mt-6 space-y-3 border-t border-gray-100 pt-4">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Commande</span>
            <span className="font-mono">{order.order_number}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>Sous-total</span>
            <span>{formatFCFA(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>Frais de service</span>
            <span>{formatFCFA(order.platform_fee)}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-gray-900">
            <span>Total</span>
            <span>{formatFCFA(order.total)}</span>
          </div>
        </div>

        <CheckoutClient orderId={order.id} total={order.total} />
      </div>
    </div>
  )
}
