/**
 * O Show — FedaPay Integration
 *
 * FedaPay handles two sides of the money flow:
 *
 * COLLECTING (buyer → O Show):
 *   Flooz (Moov), T-Money (Togocom), and card payments.
 *   Full amount lands in O Show's FedaPay merchant account.
 *
 * PAYING OUT (O Show → organizer):
 *   Payout API sends money from O Show's FedaPay balance
 *   directly to the organizer's Flooz or T-Money number.
 *
 * COLLECTION FLOW:
 *   1. Buyer picks tickets → order created in Supabase (status: pending)
 *   2. Backend creates a FedaPay Transaction → returns checkout URL
 *   3. Buyer completes payment (Flooz PIN, T-Money PIN, or card)
 *   4. FedaPay sends webhook (callback) to /api/webhooks/fedapay
 *   5. Backend verifies transaction status via API
 *   6. Order updated to "paid", tickets generated with QR codes
 *
 * PAYOUT FLOW:
 *   1. Event ends → 48-hour hold period starts
 *   2. Admin reviews payout in /admin/payouts
 *   3. Admin clicks "Approve" → backend creates a FedaPay Payout
 *   4. FedaPay sends money to organizer's mobile money number
 *   5. Backend checks payout status to confirm delivery
 *   6. Payout record updated to "completed" in Supabase
 */

const FEDAPAY_BASE_URL = {
  sandbox: 'https://sandbox-api.fedapay.com/v1',
  live: 'https://api.fedapay.com/v1',
} as const;

// ============================================
// CONFIGURATION
// ============================================

interface FedaPayConfig {
  secretKey: string;
  publicKey: string;
  environment: 'sandbox' | 'live';
  callbackUrl?: string;
  returnUrl?: string;
  cancelUrl?: string;
}

// ============================================
// COLLECTION TYPES (buyer → O Show)
// ============================================

interface PaymentRequest {
  amount: number;
  currency: string;
  description: string;
  customerFirstName: string;
  customerLastName: string;
  customerPhone: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
  callbackUrl?: string;
  returnUrl?: string;
}

interface FedaPayTransaction {
  id: number;
  reference: string;
  amount: number;
  status: string;
  currency: { iso: string };
  mode: string;
  token: string;
  created_at: string;
  updated_at: string;
}

interface FedaPayTokenResult {
  token: string;
  url: string;
}

interface TransactionStatus {
  id: number;
  reference: string;
  amount: number;
  status: 'pending' | 'approved' | 'declined' | 'canceled' | 'refunded' | 'transferred';
  mode: string;
  customer: {
    firstname: string;
    lastname: string;
    email: string;
    phone_number: { number: string; country: string };
  };
  created_at: string;
}

// ============================================
// PAYOUT TYPES (O Show → organizer)
// ============================================

interface PayoutRequest {
  amount: number;
  currency: string;
  recipientPhone: string;
  recipientName: string;
  mode: 'mtn' | 'moov' | 'togocom';
  reason: string;
}

interface FedaPayPayout {
  id: number;
  reference: string;
  amount: number;
  status: 'pending' | 'sent' | 'failed';
  mode: string;
  created_at: string;
}

// ============================================
// TOGO MOBILE MONEY MODES
// ============================================

const TOGO_MODES: Record<string, string> = {
  flooz: 'moov',
  tmoney: 'togocom',
};

// ============================================
// CLIENT
// ============================================

export function createFedaPayClient(config: FedaPayConfig) {
  const baseUrl = FEDAPAY_BASE_URL[config.environment];

  async function request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${config.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`FedaPay ${method} ${path} failed (${response.status}): ${errorBody}`);
    }

    return response.json();
  }

  // ----------------------------------------
  // COLLECTION: Buyer pays for tickets
  // ----------------------------------------

  async function createTransaction(req: PaymentRequest): Promise<{ transaction: FedaPayTransaction; token: FedaPayTokenResult }> {
    const txResponse = await request<{ v1: { transaction: FedaPayTransaction } }>('POST', '/transactions', {
      description: req.description,
      amount: req.amount,
      currency: { iso: req.currency },
      callback_url: req.callbackUrl || config.callbackUrl || '',
      return_url: req.returnUrl || config.returnUrl || '',
      customer: {
        firstname: req.customerFirstName,
        lastname: req.customerLastName,
        email: req.customerEmail || '',
        phone_number: {
          number: req.customerPhone,
          country: 'TG',
        },
      },
      metadata: req.metadata || {},
    });

    const transaction = txResponse.v1.transaction;

    const tokenResponse = await request<{ token: string; url: string }>('POST', `/transactions/${transaction.id}/token`, {});

    return {
      transaction,
      token: tokenResponse,
    };
  }

  async function getTransaction(transactionId: number): Promise<TransactionStatus> {
    const response = await request<{ v1: { transaction: TransactionStatus } }>('GET', `/transactions/${transactionId}`);
    return response.v1.transaction;
  }

  // ----------------------------------------
  // PAYOUTS: Pay organizers after events
  // ----------------------------------------

  async function createPayout(req: PayoutRequest): Promise<FedaPayPayout> {
    const mode = TOGO_MODES[req.mode] || req.mode;

    const response = await request<{ v1: { payout: FedaPayPayout } }>('POST', '/payouts', {
      amount: req.amount,
      currency: { iso: req.currency },
      mode,
      customer: {
        firstname: req.recipientName,
        lastname: '',
        phone_number: {
          number: req.recipientPhone,
          country: 'TG',
        },
      },
    });

    return response.v1.payout;
  }

  async function startPayout(payoutId: number): Promise<FedaPayPayout> {
    const response = await request<{ v1: { payout: FedaPayPayout } }>('PUT', `/payouts/${payoutId}/start`, {});
    return response.v1.payout;
  }

  async function getPayoutStatus(payoutId: number): Promise<FedaPayPayout> {
    const response = await request<{ v1: { payout: FedaPayPayout } }>('GET', `/payouts/${payoutId}`);
    return response.v1.payout;
  }

  // ----------------------------------------
  // HELPERS
  // ----------------------------------------

  function mapPaymentMode(fedaMode: string): 'flooz' | 'tmoney' | 'card' {
    const mode = fedaMode.toLowerCase();
    if (mode.includes('moov') || mode.includes('flooz')) return 'flooz';
    if (mode.includes('togocom') || mode.includes('tmoney') || mode.includes('t-money')) return 'tmoney';
    return 'card';
  }

  return {
    createTransaction,
    getTransaction,
    createPayout,
    startPayout,
    getPayoutStatus,
    mapPaymentMode,
  };
}

// ============================================
// ID GENERATORS
// ============================================

export function generatePaymentTransactionId(orderId: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const short = orderId.replace(/-/g, '').substring(0, 8).toUpperCase();
  return `OSHOW_${short}_${ts}`;
}

export function generatePayoutTransactionId(payoutId: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const short = payoutId.replace(/-/g, '').substring(0, 8).toUpperCase();
  return `PAYOUT_${short}_${ts}`;
}
