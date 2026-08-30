/**
 * O Show — Fee Calculation Engine
 * 
 * Revenue model: percentage + fixed fee per paid ticket
 * Free events = no fees
 */

export const PLATFORM_CONFIG = {
  feePercentage: 5,        // 5%
  fixedFeeFCFA: 100,       // 100 FCFA per ticket
  currency: 'XOF',
  orderExpiryMinutes: 15,
  maxTicketsPerOrder: 10,
  payoutDelayHours: 48,
} as const;

export interface FeeBreakdown {
  ticketPrice: number;
  quantity: number;
  subtotal: number;
  percentageFee: number;
  fixedFee: number;
  totalPlatformFee: number;
  promoDiscount: number;
  buyerTotal: number;
  organizerReceives: number;
}

/**
 * Calculate fees for a ticket purchase
 */
export function calculateFees(
  ticketPrice: number,
  quantity: number,
  promoDiscount: number = 0
): FeeBreakdown {
  // Free tickets = no fees
  if (ticketPrice === 0) {
    return {
      ticketPrice: 0,
      quantity,
      subtotal: 0,
      percentageFee: 0,
      fixedFee: 0,
      totalPlatformFee: 0,
      promoDiscount: 0,
      buyerTotal: 0,
      organizerReceives: 0,
    };
  }

  const subtotal = ticketPrice * quantity;

  // Per-ticket fees
  const percentageFeePerTicket = Math.ceil(ticketPrice * PLATFORM_CONFIG.feePercentage / 100);
  const fixedFeePerTicket = PLATFORM_CONFIG.fixedFeeFCFA;
  
  const totalPercentageFee = percentageFeePerTicket * quantity;
  const totalFixedFee = fixedFeePerTicket * quantity;
  const totalPlatformFee = totalPercentageFee + totalFixedFee;

  // Promo discount applies to subtotal only, not fees
  const effectiveDiscount = Math.min(promoDiscount, subtotal);

  const buyerTotal = subtotal + totalPlatformFee - effectiveDiscount;
  const organizerReceives = subtotal - effectiveDiscount;

  return {
    ticketPrice,
    quantity,
    subtotal,
    percentageFee: totalPercentageFee,
    fixedFee: totalFixedFee,
    totalPlatformFee,
    promoDiscount: effectiveDiscount,
    buyerTotal,
    organizerReceives,
  };
}

/**
 * Apply promo code to get discount amount
 */
export function calculatePromoDiscount(
  promoType: 'percentage' | 'fixed',
  promoValue: number,
  subtotal: number
): number {
  if (promoType === 'percentage') {
    return Math.ceil(subtotal * promoValue / 100);
  }
  return Math.min(promoValue, subtotal);
}

/**
 * Format FCFA amount for display
 */
export function formatFCFA(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

/**
 * Generate human-readable order number
 */
export function generateOrderNumber(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'OS-';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Generate short ticket code
 */
export function generateTicketCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'OS';
  for (let i = 0; i < 10; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
