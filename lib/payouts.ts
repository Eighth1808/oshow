/**
 * O Show — Payout Processing Service
 *
 * Handles the complete flow of paying organizers after their events.
 *
 * WHO CALLS THIS:
 *   The admin panel at /admin/payouts. When an admin clicks "Approve Payout",
 *   it calls processPayoutApproval(). Everything else is automated from there.
 *
 * THE FULL FLOW:
 *   1. Event ends → event status changes to "ended"
 *   2. 48 hours pass (hold period for refund protection)
 *   3. System creates a payout record in Supabase (status: "pending")
 *   4. Admin sees pending payouts in /admin/payouts
 *   5. Admin reviews: correct event? correct amount? organizer verified?
 *   6. Admin clicks "Approve"
 *   7. processPayoutApproval() runs:
 *      a. Creates a FedaPay Payout
 *      b. Starts the payout (triggers transfer)
 *      c. Updates payout status to "processing"
 *      d. Polls FedaPay until transfer completes (or fails)
 *      e. Updates payout status to "completed" (or "failed")
 *      f. Updates event status to "settled"
 *
 * SAFETY RULES:
 *   - Never auto-approve payouts. Always require admin click.
 *   - Never process a payout twice (check status in DB first).
 *   - Log everything for audit trail.
 */

import { createFedaPayClient, generatePayoutTransactionId } from './fedapay';

import type { Payout, Organization, Event, PayoutStatus } from '../types';

// ============================================
// TYPES
// ============================================

interface PayoutCalculation {
  eventId: string;
  organizationId: string;
  totalCollected: number;
  platformFees: number;
  organizerShare: number;
  ticketsSold: number;
}

interface PayoutResult {
  success: boolean;
  payoutId: string;
  status: PayoutStatus;
  transactionId: string | null;
  error: string | null;
}

// ============================================
// STEP 1: Calculate what the organizer is owed
// ============================================

export function calculatePayout(
  orders: Array<{ subtotal: number; platform_fee: number; status: string }>
): { organizerShare: number; platformFees: number; totalCollected: number } {
  const completedOrders = orders.filter(
    (o) => o.status === 'paid' || o.status === 'confirmed'
  );

  const totalCollected = completedOrders.reduce(
    (sum, o) => sum + o.subtotal + o.platform_fee,
    0
  );
  const platformFees = completedOrders.reduce(
    (sum, o) => sum + o.platform_fee,
    0
  );
  const organizerShare = completedOrders.reduce(
    (sum, o) => sum + o.subtotal,
    0
  );

  return { organizerShare, platformFees, totalCollected };
}

// ============================================
// STEP 2: Check if payout is eligible
// ============================================

export function validatePayoutEligibility(
  event: Pick<Event, 'status' | 'ends_at'>,
  organization: Pick<Organization, 'is_verified' | 'mobile_money_number' | 'mobile_money_provider'>,
  existingPayout: Pick<Payout, 'status'> | null,
  holdPeriodHours: number = 48
): string | null {
  if (event.status !== 'ended' && event.status !== 'settled') {
    return 'Event has not ended yet. Payout can only be processed after the event.';
  }

  if (event.ends_at) {
    const endsAt = new Date(event.ends_at);
    const holdExpires = new Date(endsAt.getTime() + holdPeriodHours * 60 * 60 * 1000);
    if (new Date() < holdExpires) {
      const hoursLeft = Math.ceil((holdExpires.getTime() - Date.now()) / (60 * 60 * 1000));
      return `Hold period not over. ${hoursLeft} hours remaining before payout can be processed.`;
    }
  }

  if (!organization.mobile_money_number) {
    return 'Organizer has no mobile money number on file. They need to add one in their settings.';
  }

  if (!['flooz', 'tmoney'].includes(organization.mobile_money_provider)) {
    return `Invalid mobile money provider: ${organization.mobile_money_provider}. Must be flooz or tmoney.`;
  }

  if (existingPayout) {
    if (existingPayout.status === 'completed') {
      return 'This payout has already been completed.';
    }
    if (existingPayout.status === 'processing') {
      return 'This payout is currently being processed. Check the transfer status instead.';
    }
  }

  return null;
}

// ============================================
// STEP 3: Process the payout
// ============================================

export async function processPayoutApproval(options: {
  payoutId: string;
  organizerShare: number;
  recipientPhone: string;
  recipientName: string;
  provider: 'flooz' | 'tmoney';
  payoutNumber: string;
  eventTitle: string;
  fedapayConfig: {
    secretKey: string;
    publicKey: string;
    environment: 'sandbox' | 'live';
  };
}): Promise<PayoutResult> {
  const {
    payoutId,
    organizerShare,
    recipientPhone,
    recipientName,
    provider,
    payoutNumber,
    eventTitle,
    fedapayConfig,
  } = options;

  const fedapay = createFedaPayClient(fedapayConfig);
  const transactionId = generatePayoutTransactionId(payoutId);

  try {
    const mode = provider === 'flooz' ? 'moov' : 'togocom';

    const payout = await fedapay.createPayout({
      amount: organizerShare,
      currency: 'XOF',
      recipientPhone,
      recipientName,
      mode: mode as 'mtn' | 'moov' | 'togocom',
      reason: `O Show Payout — ${eventTitle} (${payoutNumber})`,
    });

    await fedapay.startPayout(payout.id);

    return {
      success: true,
      payoutId,
      status: 'processing',
      transactionId: String(payout.id),
      error: null,
    };
  } catch (err) {
    return {
      success: false,
      payoutId,
      status: 'failed',
      transactionId,
      error: `Transfer failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}

// ============================================
// STEP 4: Confirm delivery
// ============================================

export async function checkPayoutDelivery(options: {
  fedapayPayoutId: number;
  fedapayConfig: {
    secretKey: string;
    publicKey: string;
    environment: 'sandbox' | 'live';
  };
}): Promise<{
  delivered: boolean;
  status: PayoutStatus;
  error: string | null;
}> {
  const fedapay = createFedaPayClient(options.fedapayConfig);

  try {
    const result = await fedapay.getPayoutStatus(options.fedapayPayoutId);

    switch (result.status) {
      case 'sent':
        return { delivered: true, status: 'completed', error: null };

      case 'pending':
        return { delivered: false, status: 'processing', error: null };

      case 'failed':
        return {
          delivered: false,
          status: 'failed',
          error: 'Transfer failed. Review and retry.',
        };

      default:
        return { delivered: false, status: 'processing', error: null };
    }
  } catch (err) {
    return {
      delivered: false,
      status: 'processing',
      error: `Status check failed: ${err instanceof Error ? err.message : 'Unknown error'}. Will retry.`,
    };
  }
}
