import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ScannerView from './ScannerView'

export default async function ScanPage({
  params,
}: {
  params: { eventId: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?redirect=/scan/${params.eventId}`)
  }

  const admin = createAdminClient()

  const { data: event } = await admin
    .from('events')
    .select('id, title, starts_at, venue_name, tickets_sold, total_check_ins, organization_id, organization:organizations(owner_id)')
    .eq('id', params.eventId)
    .single()

  if (!event) {
    redirect('/dashboard')
  }

  const org = event.organization as any
  if (org.owner_id !== user.id) {
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      redirect('/dashboard')
    }
  }

  return (
    <ScannerView
      eventId={event.id}
      eventTitle={event.title}
      initialStats={{
        totalTickets: event.tickets_sold || 0,
        checkedIn: event.total_check_ins || 0,
      }}
    />
  )
}
