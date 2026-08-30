import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createFedaPayClient } from '@/lib/fedapay'
import { generateTicketCode } from '@/lib/fees'
import { buildQRPayload } from '@/lib/qr'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { id: transactionId, status, entity } = body

  if (!transactionId || entity !== 'transaction') {
    return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 })
  }

  if (status !== 'approved') {
    return NextResponse.json({ message: 'Payment not approved, ignoring' })
  }

  // Verify transaction status via API
  const fedaEnv = (process.env.FEDAPAY_ENV === 'live' ? 'live' : 'sandbox') as 'sandbox' | 'live'
  const fedapay = createFedaPayClient({
    secretKey: process.env.FEDAPAY_SECRET_KEY!,
    publicKey: process.env.FEDAPAY_PUBLIC_KEY!,
    environment: fedaEnv,
  })

  const transaction = await fedapay.getTransaction(transactionId)

  if (transaction.status !== 'approved') {
    return NextResponse.json({ message: 'Transaction not approved after verification' })
  }

  const admin = createAdminClient()

  const { data: order } = await admin
    .from('orders')
    .select('*, event:events(id, title)')
    .eq('payment_reference', String(transactionId))
    .single()

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  if (order.status === 'paid') {
    return NextResponse.json({ message: 'Already processed' })
  }

  const paymentMethod = fedapay.mapPaymentMode(transaction.mode || 'flooz')

  await admin
    .from('orders')
    .update({
      status: 'paid',
      payment_method: paymentMethod,
      paid_at: new Date().toISOString(),
    })
    .eq('id', order.id)

  const { data: ticketTypes } = await admin
    .from('ticket_types')
    .select('*')
    .eq('event_id', order.event_id)

  if (!ticketTypes) {
    return NextResponse.json({ error: 'Ticket types not found' }, { status: 500 })
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, phone')
    .eq('id', order.buyer_id)
    .single()

  const ticketsToInsert = []
  for (const tt of ticketTypes) {
    if (tt.price === 0) continue
    const possibleCount = Math.floor(order.subtotal / tt.price)
    if (possibleCount <= 0) continue

    for (let i = 0; i < possibleCount; i++) {
      const ticketCode = generateTicketCode()
      ticketsToInsert.push({
        ticket_code: ticketCode,
        qr_data: buildQRPayload(ticketCode),
        order_id: order.id,
        event_id: order.event_id,
        ticket_type_id: tt.id,
        holder_id: order.buyer_id,
        holder_name: profile?.full_name || order.buyer_name,
        holder_phone: profile?.phone || order.buyer_phone,
        ticket_type_name: tt.name,
        price_paid: tt.price,
        status: 'valid',
      })
    }
  }

  if (ticketsToInsert.length > 0) {
    await admin.from('tickets').insert(ticketsToInsert)
  }

  return NextResponse.json({ message: 'OK' })
}
