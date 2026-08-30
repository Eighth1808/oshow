import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
  }

  const { data: payouts } = await admin
    .from('payouts')
    .select(`
      *,
      organization:organizations(id, name, mobile_money_number, mobile_money_provider, owner_id),
      event:events(id, title, status, ends_at, tickets_sold, total_revenue)
    `)
    .order('created_at', { ascending: false })

  return NextResponse.json({ payouts: payouts || [] })
}
