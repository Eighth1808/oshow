/**
 * O Show — Core TypeScript Types
 */

// ============================================
// ENUMS
// ============================================

export type UserRole = 'attendee' | 'organizer' | 'admin';
export type EventStatus = 'draft' | 'published' | 'live' | 'ended' | 'cancelled' | 'settled';
export type OrderStatus = 'pending' | 'paid' | 'confirmed' | 'cancelled' | 'refunded' | 'expired';
export type TicketStatus = 'valid' | 'used' | 'cancelled' | 'refunded';
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type PaymentMethod = 'flooz' | 'tmoney' | 'card' | 'free';
export type PromoType = 'percentage' | 'fixed';
export type CheckInResult = 'success' | 'already_used' | 'invalid' | 'wrong_event';

export type EventCategory =
  | 'concert'
  | 'conference'
  | 'soiree'
  | 'festival'
  | 'mariage'
  | 'sport'
  | 'formation'
  | 'spectacle'
  | 'religieux'
  | 'corporate'
  | 'autre';

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  concert: 'Concert',
  conference: 'Conférence',
  soiree: 'Soirée',
  festival: 'Festival',
  mariage: 'Mariage',
  sport: 'Sport',
  formation: 'Formation',
  spectacle: 'Spectacle',
  religieux: 'Religieux',
  corporate: 'Corporate',
  autre: 'Autre',
};

// ============================================
// DATABASE MODELS
// ============================================

export interface Profile {
  id: string;
  phone: string;
  full_name: string;
  email: string | null;
  role: UserRole;
  avatar_url: string | null;
  city: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  is_verified: boolean;
  mobile_money_number: string | null;
  mobile_money_provider: PaymentMethod;
  total_events: number;
  total_tickets_sold: number;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  organization_id: string;
  created_by: string;
  title: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  category: EventCategory;
  cover_image_url: string | null;
  gallery_urls: string[];
  venue_name: string | null;
  venue_address: string | null;
  venue_city: string;
  venue_latitude: number | null;
  venue_longitude: number | null;
  is_online: boolean;
  online_url: string | null;
  starts_at: string;
  ends_at: string | null;
  doors_open_at: string | null;
  timezone: string;
  status: EventStatus;
  is_free: boolean;
  is_featured: boolean;
  requires_approval: boolean;
  max_tickets_per_order: number;
  total_tickets: number;
  tickets_sold: number;
  total_revenue: number;
  total_check_ins: number;
  og_image_url: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketType {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  price: number;
  quantity: number;
  quantity_sold: number;
  max_per_order: number;
  sales_start_at: string | null;
  sales_end_at: string | null;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface PromoCode {
  id: string;
  event_id: string;
  code: string;
  type: PromoType;
  value: number;
  max_uses: number | null;
  times_used: number;
  min_order_amount: number;
  applies_to_ticket_type_id: string | null;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  event_id: string;
  buyer_id: string;
  organization_id: string;
  subtotal: number;
  platform_fee: number;
  promo_discount: number;
  total: number;
  currency: string;
  promo_code_id: string | null;
  status: OrderStatus;
  payment_method: PaymentMethod | null;
  payment_reference: string | null;
  payment_metadata: Record<string, unknown> | null;
  buyer_name: string | null;
  buyer_phone: string | null;
  buyer_email: string | null;
  expires_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: string;
  ticket_code: string;
  qr_data: string;
  order_id: string;
  event_id: string;
  ticket_type_id: string;
  holder_id: string;
  holder_name: string | null;
  holder_phone: string | null;
  ticket_type_name: string | null;
  price_paid: number;
  status: TicketStatus;
  checked_in_at: string | null;
  checked_in_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CheckIn {
  id: string;
  ticket_id: string;
  event_id: string;
  scanned_by: string;
  result: CheckInResult;
  scanned_at: string;
  device_info: string | null;
}

export interface Payout {
  id: string;
  organization_id: string;
  event_id: string | null;
  amount: number;
  fee_deducted: number;
  net_amount: number;
  status: PayoutStatus;
  payment_method: PaymentMethod | null;
  payment_reference: string | null;
  payout_number: string;
  notes: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// FRONTEND / API TYPES
// ============================================

export interface EventWithOrganization extends Event {
  organization: Pick<Organization, 'id' | 'name' | 'slug' | 'logo_url' | 'is_verified'>;
  ticket_types: TicketType[];
}

export interface CartItem {
  ticketTypeId: string;
  ticketTypeName: string;
  price: number;
  quantity: number;
}

export interface CheckoutSession {
  orderId: string;
  orderNumber: string;
  items: CartItem[];
  subtotal: number;
  platformFee: number;
  promoDiscount: number;
  total: number;
  expiresAt: string;
}

export interface ScanResult {
  success: boolean;
  result: CheckInResult;
  ticket: {
    code: string;
    holderName: string;
    ticketType: string;
    status: TicketStatus;
    checkedInAt: string | null;
  } | null;
  message: string;
}

export interface DashboardStats {
  totalEvents: number;
  activeEvents: number;
  totalTicketsSold: number;
  totalRevenue: number;
  pendingPayouts: number;
  upcomingEvents: EventWithOrganization[];
  recentOrders: Order[];
}

export interface PaymentInitiation {
  orderId: string;
  amount: number;
  currency: string;
  description: string;
  paymentUrl: string;          // FedaPay checkout URL
  transactionId: string;
}
