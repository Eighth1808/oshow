import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { processPayoutApproval, validatePayoutEligibility, calculatePayout } from '@/lib/payouts'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const { id: payoutId } = params

  const { data: payout } = await admin
    .from('payouts')
    .select(`
      *,
      organization:organizations(id, name, is_verified, mobile_money_number, mobile_money_provider, owner_id),
      event:events(id, title, status, ends_at)
    `)
    .eq('id', payoutId)
    .single()

  if (!payout) {
    return NextResponse.json({ error: 'Versement non trouvé' }, { status: 404 })
  }

  if (payout.status !== 'pending') {
    return NextResponse.json({
      error: `Ce versement est déjà en statut "${payout.status}"`,
    }, { status: 400 })
  }

  const org = payout.organization as any
  const event = payout.event as any

  if (event) {
    const eligibilityError = validatePayoutEligibility(
      event,
      org,
      { status: payout.status as any },
    )
    if (eligibilityError) {
      return NextResponse.json({ error: eligibilityError }, { status: 400 })
    }
  }

  if (!org.mobile_money_number) {
    return NextResponse.json({
      error: "L'organisateur n'a pas de numéro Mobile Money enregistré",
    }, { status: 400 })
  }

  const paymentMode = process.env.PAYMENT_MODE || 'live'

  if (paymentMode === 'mock') {
    await admin
      .from('payouts')
      .update({
        status: 'completed',
        payment_reference: `MOCK_${Date.now()}`,
        processed_at: new Date().toISOString(),
      })
      .eq('id', payoutId)

    if (event) {
      await admin
        .from('events')
        .update({ status: 'settled' })
        .eq('id', event.id)
    }

    return NextResponse.json({
      success: true,
      mock: true,
      message: 'Versement approuvé (mode test)',
    })
  }

  const result = await processPayoutApproval({
    payoutId,
    organizerShare: payout.net_amount,
    recipientPhone: org.mobile_money_number,
    recipientName: org.name,
    provider: org.mobile_money_provider,
    payoutNumber: payout.payout_number,
    eventTitle: event?.title || 'Multi-événement',
    fedapayConfig: {
      secretKey: process.env.FEDAPAY_SECRET_KEY!,
      publicKey: process.env.FEDAPAY_PUBLIC_KEY!,
      environment: (process.env.FEDAPAY_ENV as 'sandbox' | 'live') || 'sandbox',
    },
  })

  if (result.success) {
    await admin
      .from('payouts')
      .update({
        status: 'processing',
        payment_reference: result.transactionId,
      })
      .eq('id', payoutId)

    return NextResponse.json({
      success: true,
      message: 'Versement en cours de traitement via FedaPay',
      transactionId: result.transactionId,
    })
  }

  await admin
    .from('payouts')
    .update({
      status: 'failed',
      notes: result.error,
    })
    .eq('id', payoutId)

  return NextResponse.json({
    success: false,
    error: result.error,
  }, { status: 500 })
}
