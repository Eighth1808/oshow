import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateFees, generateOrderNumber, generateTicketCode } from '@/lib/fees'
import { buildQRPayload } from '@/lib/qr'
import { createFedaPayClient, generatePaymentTransactionId } from '@/lib/fedapay'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const body = await request.json()
  const { eventId, items } = body as {
    eventId: string
    items: Array<{ ticketTypeId: string; quantity: number }>
  }

  if (!eventId || !items?.length) {
    return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Fetch event and ticket types
  const { data: event } = await admin
    .from('events')
    .select('id, title, slug, organization_id, status, max_tickets_per_order, is_free')
    .eq('id', eventId)
    .in('status', ['published', 'live'])
    .single()

  if (!event) {
    return NextResponse.json({ error: 'Événement non trouvé' }, { status: 404 })
  }

  const { data: ticketTypes } = await admin
    .from('ticket_types')
    .select('*')
    .eq('event_id', eventId)

  if (!ticketTypes) {
    return NextResponse.json({ error: 'Types de billets non trouvés' }, { status: 404 })
  }

  // Validate quantities and calculate totals
  let subtotal = 0
  let totalPlatformFee = 0
  let totalQuantity = 0
  const orderItems: Array<{
    ticketType: typeof ticketTypes[0]
    quantity: number
    fees: ReturnType<typeof calculateFees>
  }> = []

  for (const item of items) {
    const tt = ticketTypes.find((t) => t.id === item.ticketTypeId)
    if (!tt) {
      return NextResponse.json({ error: `Billet inconnu: ${item.ticketTypeId}` }, { status: 400 })
    }

    const available = tt.quantity - tt.quantity_sold
    if (item.quantity > available) {
      return NextResponse.json({ error: `${tt.name}: seulement ${available} disponibles` }, { status: 400 })
    }

    if (item.quantity > tt.max_per_order) {
      return NextResponse.json({ error: `${tt.name}: max ${tt.max_per_order} par commande` }, { status: 400 })
    }

    totalQuantity += item.quantity
    const fees = calculateFees(tt.price, item.quantity)
    subtotal += fees.subtotal
    totalPlatformFee += fees.totalPlatformFee
    orderItems.push({ ticketType: tt, quantity: item.quantity, fees })
  }

  if (totalQuantity > event.max_tickets_per_order) {
    return NextResponse.json({ error: `Maximum ${event.max_tickets_per_order} billets par commande` }, { status: 400 })
  }

  // Fetch buyer profile
  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, phone, email')
    .eq('id', user.id)
    .single()

  // Create order
  const orderNumber = generateOrderNumber()
  const total = subtotal + totalPlatformFee
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

  const { data: order, error: orderError } = await admin
    .from('orders')
    .insert({
      order_number: orderNumber,
      event_id: eventId,
      buyer_id: user.id,
      organization_id: event.organization_id,
      subtotal,
      platform_fee: totalPlatformFee,
      promo_discount: 0,
      total,
      currency: 'XOF',
      status: 'pending',
      buyer_name: profile?.full_name || null,
      buyer_phone: profile?.phone || null,
      buyer_email: profile?.email || null,
      expires_at: expiresAt,
    })
    .select('id')
    .single()

  if (orderError || !order) {
    return NextResponse.json({ error: 'Erreur création commande' }, { status: 500 })
  }

  const isMock = process.env.PAYMENT_MODE === 'mock'

  if (isMock || event.is_free) {
    // Mock payment: immediately mark as paid and generate tickets
    await admin
      .from('orders')
      .update({
        status: 'paid',
        payment_method: event.is_free ? 'free' : 'flooz',
        payment_reference: isMock ? `MOCK_${orderNumber}` : null,
        paid_at: new Date().toISOString(),
      })
      .eq('id', order.id)

    // Generate tickets
    const ticketsToInsert = []
    for (const item of orderItems) {
      for (let i = 0; i < item.quantity; i++) {
        const ticketCode = generateTicketCode()
        ticketsToInsert.push({
          ticket_code: ticketCode,
          qr_data: buildQRPayload(ticketCode),
          order_id: order.id,
          event_id: eventId,
          ticket_type_id: item.ticketType.id,
          holder_id: user.id,
          holder_name: profile?.full_name || null,
          holder_phone: profile?.phone || null,
          ticket_type_name: item.ticketType.name,
          price_paid: item.ticketType.price,
          status: 'valid',
        })
      }
    }

    await admin.from('tickets').insert(ticketsToInsert)

    // Update ticket_types sold counts
    for (const item of orderItems) {
      await admin
        .from('ticket_types')
        .update({ quantity_sold: item.ticketType.quantity_sold + item.quantity })
        .eq('id', item.ticketType.id)
    }

    // Update event aggregates
    await admin
      .from('events')
      .update({
        tickets_sold: (await admin.from('tickets').select('id', { count: 'exact' }).eq('event_id', eventId)).count || 0,
        total_revenue: subtotal,
      })
      .eq('id', eventId)

    return NextResponse.json({
      orderId: order.id,
      orderNumber,
      mock: true,
      redirectUrl: `/checkout/${order.id}/success`,
    })
  }

  // Live payment: FedaPay
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://oshow.tg'
  const fedaEnv = (process.env.FEDAPAY_ENV === 'live' ? 'live' : 'sandbox') as 'sandbox' | 'live'

  const fedapay = createFedaPayClient({
    secretKey: process.env.FEDAPAY_SECRET_KEY!,
    publicKey: process.env.FEDAPAY_PUBLIC_KEY!,
    environment: fedaEnv,
    callbackUrl: `${appUrl}/api/webhooks/fedapay`,
    returnUrl: `${appUrl}/checkout/${order.id}/success`,
    cancelUrl: `${appUrl}/checkout/${order.id}/cancel`,
  })

  const description = orderItems
    .map((i) => `${i.quantity}x ${i.ticketType.name}`)
    .join(', ')

  const nameParts = (profile?.full_name || 'Client').split(' ')
  const firstName = nameParts[0]
  const lastName = nameParts.slice(1).join(' ') || firstName

  const { transaction, token } = await fedapay.createTransaction({
    amount: total,
    currency: 'XOF',
    description: `${description} — ${event.title}`,
    customerFirstName: firstName,
    customerLastName: lastName,
    customerPhone: profile?.phone || '',
    customerEmail: profile?.email || undefined,
    metadata: { orderId: order.id, eventId },
  })

  // Save payment reference (FedaPay transaction ID)
  await admin
    .from('orders')
    .update({ payment_reference: String(transaction.id) })
    .eq('id', order.id)

  return NextResponse.json({
    orderId: order.id,
    orderNumber,
    mock: false,
    redirectUrl: token.url,
  })
}
