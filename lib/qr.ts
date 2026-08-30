/**
 * O Show — QR Code & Ticket Delivery
 * 
 * QR payload format:
 * oshow://ticket/{ticketCode}
 * 
 * This is scanned by the web-based scanner at /scan/[eventId]
 * which calls /api/tickets/verify/[ticketCode]
 */

// QR code generation uses `qrcode` npm package on the server side
// Scanner uses `html5-qrcode` on the client side

/**
 * Build QR payload for a ticket
 */
export function buildQRPayload(ticketCode: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://oshow.tg';
  return `${baseUrl}/t/${ticketCode}`;
}

/**
 * Build WhatsApp share URL for a ticket
 */
export function buildTicketWhatsAppUrl(
  ticketCode: string,
  eventTitle: string,
  eventDate: string,
  venueName: string
): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://oshow.tg';
  const ticketUrl = `${baseUrl}/t/${ticketCode}`;
  
  const message = [
    `🎫 Mon billet O Show`,
    ``,
    `📌 ${eventTitle}`,
    `📅 ${eventDate}`,
    `📍 ${venueName}`,
    ``,
    `🔗 ${ticketUrl}`,
    ``,
    `Présente ce QR code à l'entrée.`,
  ].join('\n');

  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/**
 * Build WhatsApp share URL for an event (for organizers/attendees to share)
 */
export function buildEventWhatsAppUrl(
  eventSlug: string,
  eventTitle: string,
  eventDate: string,
  price: string
): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://oshow.tg';
  const eventUrl = `${baseUrl}/e/${eventSlug}`;
  
  const message = [
    `🔥 ${eventTitle}`,
    `📅 ${eventDate}`,
    `💰 À partir de ${price}`,
    ``,
    `🎫 Achète ton billet → ${eventUrl}`,
  ].join('\n');

  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/**
 * Build Facebook share URL for an event
 */
export function buildEventFacebookUrl(eventSlug: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://oshow.tg';
  const eventUrl = `${baseUrl}/e/${eventSlug}`;
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(eventUrl)}`;
}

/**
 * Build SMS message for ticket delivery
 */
export function buildTicketSMS(
  ticketCode: string,
  eventTitle: string,
  eventDate: string
): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://oshow.tg';
  return `O Show: Ton billet pour ${eventTitle} (${eventDate}). Code: ${ticketCode}. Lien: ${baseUrl}/t/${ticketCode}`;
}
