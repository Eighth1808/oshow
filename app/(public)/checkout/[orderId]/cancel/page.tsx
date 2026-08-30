import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

export default async function CheckoutCancelPage({
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
    .select('*, event:events(slug, title)')
    .eq('id', params.orderId)
    .eq('buyer_id', user.id)
    .single()

  if (!order) {
    redirect('/')
  }

  // Mark as cancelled if still pending
  if (order.status === 'pending') {
    await admin
      .from('orders')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', order.id)
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <div className="card">
        <div className="text-5xl">😔</div>
        <h1 className="mt-4 text-xl font-bold text-gray-900">Paiement annulé</h1>
        <p className="mt-2 text-gray-500">
          Ton paiement a été annulé. Aucun montant n&apos;a été débité.
        </p>
        <div className="mt-6 flex gap-3">
          {order.event?.slug && (
            <Link
              href={`/e/${order.event.slug}`}
              className="btn-primary flex-1"
            >
              Réessayer
            </Link>
          )}
          <Link href="/" className="btn-outline flex-1">
            Accueil
          </Link>
        </div>
      </div>
    </div>
  )
}
