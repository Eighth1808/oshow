import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  const { code } = params
  const admin = createAdminClient()

  const { data: ticket, error } = await admin
    .from('tickets')
    .select(`
      *,
      event:events(id, title, slug, cover_image_url, starts_at, venue_name, venue_address),
      order:orders(order_number, buyer_name, buyer_email)
    `)
    .eq('ticket_code', code)
    .single()

  if (error || !ticket) {
    return NextResponse.json({
      valid: false,
      error: 'Billet non trouvé',
    }, { status: 404 })
  }

  return NextResponse.json({
    valid: ticket.status === 'valid',
    ticket: {
      code: ticket.ticket_code,
      status: ticket.status,
      holderName: ticket.holder_name,
      ticketTypeName: ticket.ticket_type_name,
      pricePaid: ticket.price_paid,
      checkedInAt: ticket.checked_in_at,
      event: ticket.event,
      orderNumber: ticket.order?.order_number,
    },
  })
}
