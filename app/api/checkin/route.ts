import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await request.json()
  const { ticketCode, eventId } = body

  if (!ticketCode || !eventId) {
    return NextResponse.json({ error: 'Code billet et événement requis' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: ticket, error: ticketError } = await admin
    .from('tickets')
    .select(`
      *,
      event:events(id, title, organization_id, status),
      order:orders(order_number, buyer_name, status)
    `)
    .eq('ticket_code', ticketCode)
    .single()

  if (ticketError || !ticket) {
    await admin.from('check_ins').insert({
      ticket_id: null,
      event_id: eventId,
      scanned_by: user.id,
      result: 'invalid',
      device_info: request.headers.get('user-agent'),
    }).select().maybeSingle()

    return NextResponse.json({
      success: false,
      result: 'invalid',
      message: 'Billet non trouvé',
      ticket: null,
    })
  }

  if (ticket.event_id !== eventId) {
    await admin.from('check_ins').insert({
      ticket_id: ticket.id,
      event_id: eventId,
      scanned_by: user.id,
      result: 'wrong_event',
      device_info: request.headers.get('user-agent'),
    })

    return NextResponse.json({
      success: false,
      result: 'wrong_event',
      message: 'Ce billet est pour un autre événement',
      ticket: {
        code: ticket.ticket_code,
        holderName: ticket.holder_name,
        ticketType: ticket.ticket_type_name,
        status: ticket.status,
        checkedInAt: ticket.checked_in_at,
      },
    })
  }

  if (ticket.status === 'used') {
    await admin.from('check_ins').insert({
      ticket_id: ticket.id,
      event_id: eventId,
      scanned_by: user.id,
      result: 'already_used',
      device_info: request.headers.get('user-agent'),
    })

    return NextResponse.json({
      success: false,
      result: 'already_used',
      message: `Déjà scanné le ${new Date(ticket.checked_in_at).toLocaleString('fr-FR')}`,
      ticket: {
        code: ticket.ticket_code,
        holderName: ticket.holder_name,
        ticketType: ticket.ticket_type_name,
        status: ticket.status,
        checkedInAt: ticket.checked_in_at,
      },
    })
  }

  if (ticket.status !== 'valid') {
    await admin.from('check_ins').insert({
      ticket_id: ticket.id,
      event_id: eventId,
      scanned_by: user.id,
      result: 'invalid',
      device_info: request.headers.get('user-agent'),
    })

    return NextResponse.json({
      success: false,
      result: 'invalid',
      message: `Billet ${ticket.status === 'cancelled' ? 'annulé' : 'non valide'}`,
      ticket: {
        code: ticket.ticket_code,
        holderName: ticket.holder_name,
        ticketType: ticket.ticket_type_name,
        status: ticket.status,
        checkedInAt: ticket.checked_in_at,
      },
    })
  }

  const now = new Date().toISOString()

  await admin
    .from('tickets')
    .update({
      status: 'used',
      checked_in_at: now,
      checked_in_by: user.id,
    })
    .eq('id', ticket.id)

  const { data: currentEvent } = await admin
    .from('events')
    .select('total_check_ins')
    .eq('id', eventId)
    .single()

  await admin
    .from('events')
    .update({ total_check_ins: (currentEvent?.total_check_ins || 0) + 1 })
    .eq('id', eventId)

  await admin.from('check_ins').insert({
    ticket_id: ticket.id,
    event_id: eventId,
    scanned_by: user.id,
    result: 'success',
    device_info: request.headers.get('user-agent'),
  })

  return NextResponse.json({
    success: true,
    result: 'success',
    message: 'Entrée validée',
    ticket: {
      code: ticket.ticket_code,
      holderName: ticket.holder_name,
      ticketType: ticket.ticket_type_name,
      status: 'used',
      checkedInAt: now,
    },
  })
}
