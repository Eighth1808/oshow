import { NextRequest, NextResponse } from 'next/server'
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

  const { data: events } = await admin
    .from('events')
    .select(`
      id, title, slug, status, category, starts_at, ends_at,
      venue_name, venue_city, is_free, is_featured,
      tickets_sold, total_revenue, total_check_ins,
      created_at, published_at,
      organization:organizations(id, name, is_verified)
    `)
    .order('created_at', { ascending: false })

  return NextResponse.json({ events: events || [] })
}

export async function PATCH(request: NextRequest) {
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

  const body = await request.json()
  const { eventId, status, is_featured } = body

  if (!eventId) {
    return NextResponse.json({ error: 'ID événement requis' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (status) updates.status = status
  if (typeof is_featured === 'boolean') updates.is_featured = is_featured

  const { error } = await admin
    .from('events')
    .update(updates)
    .eq('id', eventId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
