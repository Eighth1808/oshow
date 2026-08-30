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

  const { count: totalEvents } = await admin
    .from('events')
    .select('id', { count: 'exact', head: true })

  const { count: publishedEvents } = await admin
    .from('events')
    .select('id', { count: 'exact', head: true })
    .in('status', ['published', 'live'])

  const { count: totalOrganizers } = await admin
    .from('organizations')
    .select('id', { count: 'exact', head: true })

  const { count: totalUsers } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })

  const { count: totalOrders } = await admin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .in('status', ['paid', 'confirmed'])

  const { data: revenueData } = await admin
    .from('orders')
    .select('platform_fee')
    .in('status', ['paid', 'confirmed'])

  const platformRevenue = (revenueData || []).reduce(
    (sum, o) => sum + (o.platform_fee || 0), 0
  )

  const { data: totalSalesData } = await admin
    .from('orders')
    .select('total')
    .in('status', ['paid', 'confirmed'])

  const totalSales = (totalSalesData || []).reduce(
    (sum, o) => sum + (o.total || 0), 0
  )

  const { count: pendingPayouts } = await admin
    .from('payouts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')

  const { count: totalTicketsSold } = await admin
    .from('tickets')
    .select('id', { count: 'exact', head: true })
    .in('status', ['valid', 'used'])

  const { data: recentEvents } = await admin
    .from('events')
    .select('id, title, status, starts_at, tickets_sold, total_revenue, created_at, organization:organizations(name)')
    .order('created_at', { ascending: false })
    .limit(10)

  return NextResponse.json({
    totalEvents: totalEvents || 0,
    publishedEvents: publishedEvents || 0,
    totalOrganizers: totalOrganizers || 0,
    totalUsers: totalUsers || 0,
    totalOrders: totalOrders || 0,
    platformRevenue,
    totalSales,
    pendingPayouts: pendingPayouts || 0,
    totalTicketsSold: totalTicketsSold || 0,
    recentEvents: recentEvents || [],
  })
}
