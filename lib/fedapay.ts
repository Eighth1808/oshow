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

function clean(s: string) {
  return s.replace(/[^ -~]/g, '').trim();
}

export function createFedaPayClient(config: FedaPayConfig) {
  const baseUrl = FEDAPAY_BASE_URL[config.environment];
  const secretKey = clean(config.secretKey);

  async function request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${secretKey}`,
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
    const txResponse = await request<Record<string, unknown>>('POST', '/transactions', {
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

    const transaction = (
      (txResponse as { v1?: { transaction?: FedaPayTransaction } }).v1?.transaction
      || (txResponse as { 'v1/transaction'?: FedaPayTransaction })['v1/transaction']
      || (txResponse as { transaction?: FedaPayTransaction }).transaction
    ) as FedaPayTransaction;

    if (!transaction?.id) {
      throw new Error(`FedaPay: unexpected response structure: ${JSON.stringify(txResponse).slice(0, 300)}`);
    }

    const tokenResponse = await request<Record<string, unknown>>('POST', `/transactions/${transaction.id}/token`, {});

    const token = (
      (tokenResponse as { token?: string; url?: string }).url
        ? tokenResponse as unknown as FedaPayTokenResult
        : (tokenResponse as { v1?: { token?: FedaPayTokenResult } }).v1?.token
          || (tokenResponse as { 'v1/token'?: FedaPayTokenResult })['v1/token']
    ) as FedaPayTokenResult;

    if (!token?.url) {
      throw new Error(`FedaPay: unexpected token response: ${JSON.stringify(tokenResponse).slice(0, 300)}`);
    }

    return { transaction, token };
  }

  async function getTransaction(transactionId: number): Promise<TransactionStatus> {
    const response = await request<Record<string, unknown>>('GET', `/transactions/${transactionId}`);
    const tx = (
      (response as { v1?: { transaction?: TransactionStatus } }).v1?.transaction
      || (response as { 'v1/transaction'?: TransactionStatus })['v1/transaction']
      || (response as { transaction?: TransactionStatus }).transaction
    ) as TransactionStatus;
    if (!tx) throw new Error(`FedaPay: could not parse transaction response`);
    return tx;
  }

  // ----------------------------------------
  // PAYOUTS: Pay organizers after events
  // ----------------------------------------

  function extractPayout(response: Record<string, unknown>): FedaPayPayout {
    const payout = (
      (response as { v1?: { payout?: FedaPayPayout } }).v1?.payout
      || (response as { 'v1/payout'?: FedaPayPayout })['v1/payout']
      || (response as { payout?: FedaPayPayout }).payout
    ) as FedaPayPayout;
    if (!payout) throw new Error(`FedaPay: could not parse payout response`);
    return payout;
  }

  async function createPayout(req: PayoutRequest): Promise<FedaPayPayout> {
    const mode = TOGO_MODES[req.mode] || req.mode;

    const response = await request<Record<string, unknown>>('POST', '/payouts', {
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

    return extractPayout(response);
  }

  async function startPayout(payoutId: number): Promise<FedaPayPayout> {
    const response = await request<Record<string, unknown>>('PUT', `/payouts/${payoutId}/start`, {});
    return extractPayout(response);
  }

  async function getPayoutStatus(payoutId: number): Promise<FedaPayPayout> {
    const response = await request<Record<string, unknown>>('GET', `/payouts/${payoutId}`);
    return extractPayout(response);
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
