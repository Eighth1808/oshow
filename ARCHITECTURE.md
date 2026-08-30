# O Show — Platform Architecture

## Vision
Event ticketing platform for Lomé, Togo. "Propulsé par SugiTech."
Revenue: percentage + fixed fee per paid ticket. Free events = free to list.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 App Router (React 18, TypeScript) |
| Hosting | Vercel |
| Database | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| Payments | CinetPay (Flooz + T-Money + cards in one SDK) |
| QR Codes | `qrcode` npm package (generation), `html5-qrcode` (scanning) |
| SMS | Twilio or local provider (Lomé numbers) |
| WhatsApp | wa.me deep links + WhatsApp Business API (optional) |
| Analytics | PostHog (self-serve, free tier) |

---

## Revenue Model

```
ticket_price = organizer's set price
platform_fee = (ticket_price × PERCENTAGE_RATE) + FIXED_FEE
buyer_pays = ticket_price + platform_fee
organizer_receives = ticket_price (paid out post-event)
```

Suggested starting rates:
- PERCENTAGE_RATE: 5%
- FIXED_FEE: 100 FCFA per ticket
- Free events: 0 FCFA

---

## Database Schema (see schema.sql)

### Core Tables
- `profiles` — user accounts (organizers + attendees)
- `organizations` — organizer profiles/brands
- `events` — the events themselves
- `ticket_types` — pricing tiers per event (VIP, Standard, Table, etc.)
- `orders` — purchase transactions
- `tickets` — individual issued tickets with QR codes
- `promo_codes` — discount codes per event
- `payouts` — organizer payout records
- `check_ins` — scan records at the door

### Key Relationships
```
organizations → events → ticket_types
                       → promo_codes
profiles → orders → tickets → check_ins
```

---

## Core Modules

### 1. Public Storefront (`/`)
- Hero with featured/upcoming events
- Category browsing (Concert, Conférence, Soirée, Mariage, Festival, Sport, etc.)
- Search with filters (date, category, price range, location)
- City defaults to Lomé

### 2. Event Pages (`/e/[slug]`)
- Cover image, title, date/time, venue with map link
- Description (rich text)
- Ticket tier cards with prices and availability
- Organizer info with verified badge
- Share buttons (WhatsApp, Facebook, copy link)
- OG meta tags optimized for WhatsApp preview

### 3. Ticketing Engine
- Multiple ticket tiers per event
- Inventory tracking with real-time availability
- Promo code validation and discount application
- Fee calculation and display
- Order creation with expiry (15 min hold)

### 4. Payment Flow (`/checkout/[orderId]`)
- CinetPay integration for Flooz/T-Money
- Payment initiation → redirect/USSD prompt → webhook confirmation
- Order status: pending → paid → confirmed
- Failure handling with retry

### 4b. Payout Flow (O Show → Organizer)
**WHERE THE MONEY SITS:** CinetPay collects the full amount (ticket price + fees)
into O Show's merchant account. O Show holds all funds until payout.

**PAYOUT PROCESS:**
1. Event ends → 48-hour hold period (protects against cancellations/refunds)
2. System calculates organizer's share from completed orders
3. Payout record created in Supabase (status: pending)
4. Admin reviews and approves in /admin/payouts
5. System checks O Show's CinetPay balance
6. If sufficient → CinetPay Transfer API sends money to organizer's Flooz/T-Money
7. System polls transfer status until confirmed
8. Payout marked "completed", event marked "settled"

**SAFETY RULES:**
- Payouts are NEVER automatic — admin must approve each one
- Balance check BEFORE every transfer — never overdraw
- Double-payout prevention — check DB status before processing
- Full audit trail — every step logged with timestamps

**RELEVANT FILES:**
- `lib/cinetpay.ts` → initiateTransfer(), checkBalance(), checkTransferStatus()
- `lib/payouts.ts` → processPayoutApproval(), checkPayoutDelivery(), validatePayoutEligibility()
- `/api/admin/payouts/[id]/approve` → API route admin calls
- `/admin/payouts` → Admin UI for reviewing and approving payouts

### 5. Ticket Delivery
- QR code generated per ticket on payment confirmation
- Ticket page at `/t/[ticketCode]` (works as e-ticket)
- WhatsApp share link with ticket URL
- SMS fallback with ticket code + URL
- PDF download option

### 6. Scanner (`/scan/[eventId]`)
- Web-based QR scanner (no app install)
- Camera access via browser
- Real-time validation against DB
- Shows: attendee name, ticket type, check-in status
- Prevents double-scan
- Works offline with service worker (sync when back online)

### 7. Organizer Dashboard (`/dashboard`)
- Event management (create, edit, duplicate)
- Sales overview: tickets sold, revenue, by tier
- Real-time check-in counter during events
- Attendee list with export (CSV)
- Payout history and upcoming payouts
- Promo code management

### 8. Admin Panel (`/admin`)
- Platform metrics: total events, tickets, revenue
- Event moderation and approval
- Organizer verification
- Payout processing
- Fee configuration
- User management

---

## Auth Flow

1. **Attendees**: phone number + OTP (Supabase Auth with phone provider)
2. **Organizers**: phone + email, create organization profile
3. **Admin**: email + password, role-based access

Phone-first because Lomé users don't all have email.

---

## Event Lifecycle

```
DRAFT → PUBLISHED → LIVE → ENDED → SETTLED
```

- DRAFT: organizer building the event
- PUBLISHED: visible on platform, tickets on sale
- LIVE: event date, check-in scanner active
- ENDED: sales closed, final attendance tallied
- SETTLED: organizer payout completed

---

## Mobile Money Payment Flow (CinetPay)

```
1. Buyer selects tickets → Order created (status: pending)
2. Frontend calls /api/payments/initiate with order details
3. Backend creates CinetPay payment session
4. Buyer redirected to CinetPay (or USSD prompt for Flooz/T-Money)
5. Buyer completes payment on phone
6. CinetPay sends webhook to /api/webhooks/cinetpay
7. Backend verifies signature, updates order to "paid"
8. Tickets generated with QR codes
9. Confirmation page with WhatsApp share link
```

---

## WhatsApp Optimization

Every shareable link generates rich OG tags:
```html
<meta property="og:title" content="Concert Toofan — 25 Dec 2026" />
<meta property="og:description" content="Tickets à partir de 2,000 FCFA • O Show" />
<meta property="og:image" content="https://oshow.tg/og/event-123.png" />
```

Share buttons use `https://wa.me/?text=...` for instant WhatsApp sharing.

---

## File Structure

```
oshow/
├── app/
│   ├── (public)/
│   │   ├── page.tsx                 # Homepage
│   │   ├── e/[slug]/page.tsx        # Event page
│   │   ├── checkout/[orderId]/page.tsx
│   │   ├── t/[ticketCode]/page.tsx  # E-ticket
│   │   └── events/page.tsx          # Browse/search
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── dashboard/
│   │   ├── page.tsx                 # Overview
│   │   ├── events/
│   │   │   ├── page.tsx             # My events
│   │   │   ├── new/page.tsx         # Create event
│   │   │   └── [id]/
│   │   │       ├── page.tsx         # Edit event
│   │   │       ├── tickets/page.tsx
│   │   │       ├── orders/page.tsx
│   │   │       ├── attendees/page.tsx
│   │   │       └── scan/page.tsx    # QR scanner
│   │   ├── payouts/page.tsx
│   │   └── settings/page.tsx
│   ├── admin/
│   │   ├── page.tsx
│   │   ├── events/page.tsx
│   │   ├── organizers/page.tsx
│   │   └── payouts/page.tsx
│   ├── api/
│   │   ├── payments/
│   │   │   └── initiate/route.ts
│   │   ├── webhooks/
│   │   │   └── cinetpay/route.ts
│   │   ├── tickets/
│   │   │   └── verify/[code]/route.ts
│   │   └── og/
│   │       └── [eventId]/route.tsx  # Dynamic OG images
│   └── layout.tsx
├── components/
│   ├── ui/                          # Shared UI components
│   ├── events/                      # Event-related components
│   ├── checkout/                    # Payment components
│   ├── dashboard/                   # Dashboard components
│   └── scanner/                     # QR scanner components
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── admin.ts
│   ├── cinetpay.ts                  # CinetPay SDK — collections (buyer→OShow) + transfers (OShow→organizer)
│   ├── payouts.ts                   # Payout logic — calculate, validate, process, confirm delivery
│   ├── qr.ts                       # QR code generation + WhatsApp/SMS ticket delivery
│   ├── fees.ts                     # Fee calculation (5% + 100 FCFA)
│   ├── sms.ts                      # SMS delivery
│   └── utils.ts
├── types/
│   └── index.ts                     # TypeScript types
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql
```

---

## Branding

- **Name**: O Show
- **Tagline**: "Ton événement. Ton public." (Your event. Your audience.)
- **Powered by**: SugiTech
- **Primary language**: French
- **Domain target**: oshow.tg (or oshow.africa)
