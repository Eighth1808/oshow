# O Show — Build Instructions for Claude Code

## What is this project?

O Show is an event ticketing platform for Lomé, Togo. Think Eventbrite but built specifically for the West African market. Buyers purchase tickets with mobile money (Flooz and T-Money). Organizers get paid out after their events via the same mobile money networks. Every page says "Propulsé par SugiTech" in the footer.

## Tech stack

- **Framework**: Next.js 14 App Router (TypeScript)
- **Database + Auth**: Supabase (PostgreSQL, phone OTP auth, storage for images)
- **Hosting**: Vercel
- **Payments**: CinetPay (collects Flooz/T-Money/cards, also transfers payouts to organizers)
- **QR codes**: `qrcode` package for generation, `html5-qrcode` for scanning
- **Language**: French (all UI text in French)
- **Design**: Mobile-first, clean, modern. Primary color #6C2BD9 (purple), accent #FF5733 (coral/orange)

## Foundation files included

These files are the architecture — read ALL of them before writing any code:

1. `ARCHITECTURE.md` — The complete blueprint. Every module, every page, every flow. Read this first.
2. `schema.sql` — Paste this into Supabase SQL editor to create all 10 tables, indexes, RLS policies, and helper functions.
3. `types/index.ts` — TypeScript types matching every database table plus frontend types for cart, checkout, scanning, dashboard.
4. `lib/fees.ts` — Fee calculation engine. 5% + 100 FCFA per paid ticket. Promo code support. FCFA formatting.
5. `lib/cinetpay.ts` — CinetPay wrapper. Two sides: collection (buyer → O Show) and transfers (O Show → organizer for payouts).
6. `lib/payouts.ts` — Payout processing. Calculate organizer share, validate eligibility (48-hour hold), process approval, confirm delivery.
7. `lib/qr.ts` — QR payloads, WhatsApp share messages, Facebook share URLs, SMS templates. All in French.

## Setup steps

1. Run `npx create-next-app@latest oshow --typescript --tailwind --app --src-dir=false --import-alias="@/*"`
2. Install dependencies: `npm install @supabase/supabase-js @supabase/ssr qrcode html5-qrcode`
3. Place the foundation files in their correct locations (see ARCHITECTURE.md for file structure)
4. Create a Supabase project and run schema.sql in the SQL editor
5. Add environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   CINETPAY_API_KEY=
   CINETPAY_SITE_ID=
   CINETPAY_SECRET_KEY=
   NEXT_PUBLIC_APP_URL=https://oshow.tg
   ```
6. Set up Supabase client files (lib/supabase/client.ts, server.ts, admin.ts)

## Build order (build in this sequence)

### Phase 1 — Core pages (build these first)
1. Layout + navigation (header with logo, nav links, footer with "Propulsé par SugiTech")
2. Homepage (`/`) — hero, featured events, category filter, event grid
3. Event page (`/e/[slug]`) — cover image, details, ticket tier cards, share buttons
4. Auth (phone number + OTP login/register via Supabase)

### Phase 2 — Organizer tools
5. Organizer onboarding (create organization profile)
6. Event creation form (`/dashboard/events/new`) — title, description, date, venue, cover image upload, ticket tiers
7. Event edit + management
8. Organizer dashboard (`/dashboard`) — sales overview, event list

### Phase 3 — Buying + tickets
9. Checkout flow (`/checkout/[orderId]`) — cart summary, fee display, CinetPay payment initiation
10. Payment webhook handler (`/api/webhooks/cinetpay`) — verify payment, update order, generate tickets
11. Ticket page (`/t/[ticketCode]`) — QR code display, event details, WhatsApp share button
12. Order confirmation page with WhatsApp delivery

### Phase 4 — Event day
13. QR scanner (`/scan/[eventId]`) — web-based camera scanner, real-time validation
14. Check-in dashboard (live counter of scanned vs total)

### Phase 5 — Admin + payouts
15. Admin panel (`/admin`) — platform metrics, event moderation
16. Payout management (`/admin/payouts`) — review, approve, track delivery
17. Payout API route (`/api/admin/payouts/[id]/approve`) — uses lib/payouts.ts

## Key rules for this project

- **French UI**: All labels, buttons, messages, placeholders in French. Variable names and code comments in English.
- **Mobile-first**: Design for phones first. Most users in Lomé access on mobile.
- **FCFA currency**: No decimals. Use `Intl.NumberFormat('fr-FR')` for display. Always show "FCFA" after amounts.
- **Phone-first auth**: Phone number + OTP is the primary login. Email is optional.
- **WhatsApp is king**: Every shareable moment (event pages, tickets, confirmations) must have a WhatsApp share button using wa.me deep links.
- **OG tags on every event page**: Title, description, cover image — optimized for WhatsApp preview cards.
- **"Propulsé par SugiTech"**: In the footer of every page. SugiTech links to sugitech.com.
- **Organizer payouts are manual-approve**: Admin must click approve. Never auto-send money.
- **48-hour hold on payouts**: After event ends, wait 48 hours before allowing payout approval.
- **Free events are free to list**: Platform fees only apply to paid tickets.
