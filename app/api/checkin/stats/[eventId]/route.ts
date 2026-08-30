import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { eventId } = params

  const { data: event } = await admin
    .from('events')
    .select('id, title, tickets_sold, total_check_ins, organization_id')
    .eq('id', eventId)
    .single()

  if (!event) {
    return NextResponse.json({ error: 'Événement non trouvé' }, { status: 404 })
  }

  const { data: recentScans } = await admin
    .from('check_ins')
    .select(`
      id, result, scanned_at,
      ticket:tickets(ticket_code, holder_name, ticket_type_name)
    `)
    .eq('event_id', eventId)
    .order('scanned_at', { ascending: false })
    .limit(20)

  const { count: successCount } = await admin
    .from('check_ins')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('result', 'success')

  return NextResponse.json({
    eventTitle: event.title,
    totalTickets: event.tickets_sold,
    checkedIn: successCount || 0,
    remaining: (event.tickets_sold || 0) - (successCount || 0),
    recentScans: recentScans || [],
  })
}
