-- ============================================
-- O SHOW — Database Schema
-- Supabase (PostgreSQL)
-- Propulsé par SugiTech
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM ('attendee', 'organizer', 'admin');
CREATE TYPE event_status AS ENUM ('draft', 'published', 'live', 'ended', 'cancelled', 'settled');
CREATE TYPE order_status AS ENUM ('pending', 'paid', 'confirmed', 'cancelled', 'refunded', 'expired');
CREATE TYPE ticket_status AS ENUM ('valid', 'used', 'cancelled', 'refunded');
CREATE TYPE payout_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE payment_method AS ENUM ('flooz', 'tmoney', 'card', 'free');
CREATE TYPE event_category AS ENUM (
  'concert', 'conference', 'soiree', 'festival', 
  'mariage', 'sport', 'formation', 'spectacle',
  'religieux', 'corporate', 'autre'
);
CREATE TYPE promo_type AS ENUM ('percentage', 'fixed');

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone VARCHAR(20) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(255),
  role user_role DEFAULT 'attendee',
  avatar_url TEXT,
  city VARCHAR(100) DEFAULT 'Lomé',
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_phone ON profiles(phone);
CREATE INDEX idx_profiles_role ON profiles(role);

-- ============================================
-- ORGANIZATIONS (organizer brands)
-- ============================================

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  cover_url TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  website VARCHAR(500),
  facebook_url VARCHAR(500),
  instagram_url VARCHAR(500),
  is_verified BOOLEAN DEFAULT FALSE,
  mobile_money_number VARCHAR(20),  -- for payouts
  mobile_money_provider payment_method DEFAULT 'flooz',
  total_events INTEGER DEFAULT 0,
  total_tickets_sold INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_organizations_owner ON organizations(owner_id);
CREATE INDEX idx_organizations_slug ON organizations(slug);

-- Members of an organization (team access)
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member', -- owner, admin, member, scanner
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- ============================================
-- EVENTS
-- ============================================

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  
  -- Core info
  title VARCHAR(300) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  description TEXT,
  short_description VARCHAR(500),
  category event_category DEFAULT 'autre',
  
  -- Media
  cover_image_url TEXT,
  gallery_urls TEXT[], -- array of image URLs
  
  -- Location
  venue_name VARCHAR(300),
  venue_address TEXT,
  venue_city VARCHAR(100) DEFAULT 'Lomé',
  venue_latitude DECIMAL(10, 8),
  venue_longitude DECIMAL(11, 8),
  is_online BOOLEAN DEFAULT FALSE,
  online_url TEXT,
  
  -- Timing
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  doors_open_at TIMESTAMPTZ,
  timezone VARCHAR(50) DEFAULT 'Africa/Lome',
  
  -- Status & settings
  status event_status DEFAULT 'draft',
  is_free BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  requires_approval BOOLEAN DEFAULT FALSE,
  max_tickets_per_order INTEGER DEFAULT 10,
  
  -- Aggregates (denormalized for performance)
  total_tickets INTEGER DEFAULT 0,
  tickets_sold INTEGER DEFAULT 0,
  total_revenue BIGINT DEFAULT 0, -- in FCFA (integer, no decimals)
  total_check_ins INTEGER DEFAULT 0,
  
  -- SEO / sharing
  og_image_url TEXT,
  
  -- Timestamps
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_org ON events(organization_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_slug ON events(slug);
CREATE INDEX idx_events_starts_at ON events(starts_at);
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_featured ON events(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_events_city_date ON events(venue_city, starts_at) WHERE status = 'published';

-- ============================================
-- TICKET TYPES (pricing tiers per event)
-- ============================================

CREATE TABLE ticket_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  
  name VARCHAR(150) NOT NULL,          -- "VIP", "Standard", "Table de 10"
  description TEXT,
  price BIGINT NOT NULL DEFAULT 0,     -- in FCFA
  quantity INTEGER NOT NULL,           -- total available
  quantity_sold INTEGER DEFAULT 0,
  max_per_order INTEGER DEFAULT 10,
  
  -- Scheduling
  sales_start_at TIMESTAMPTZ,
  sales_end_at TIMESTAMPTZ,
  
  -- Display
  sort_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ticket_types_event ON ticket_types(event_id);

-- ============================================
-- PROMO CODES
-- ============================================

CREATE TABLE promo_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  
  code VARCHAR(50) NOT NULL,
  type promo_type DEFAULT 'percentage',
  value BIGINT NOT NULL,               -- percentage (5 = 5%) or fixed FCFA amount
  max_uses INTEGER,                    -- NULL = unlimited
  times_used INTEGER DEFAULT 0,
  
  -- Restrictions
  min_order_amount BIGINT DEFAULT 0,
  applies_to_ticket_type_id UUID REFERENCES ticket_types(id),  -- NULL = all types
  
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(event_id, code)
);

CREATE INDEX idx_promo_codes_event ON promo_codes(event_id);
CREATE INDEX idx_promo_codes_lookup ON promo_codes(event_id, code) WHERE is_active = TRUE;

-- ============================================
-- ORDERS
-- ============================================

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(20) NOT NULL UNIQUE, -- human-readable: OS-XXXXXX
  
  event_id UUID NOT NULL REFERENCES events(id),
  buyer_id UUID NOT NULL REFERENCES profiles(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Pricing
  subtotal BIGINT NOT NULL DEFAULT 0,        -- ticket prices sum
  platform_fee BIGINT NOT NULL DEFAULT 0,    -- O Show's cut
  promo_discount BIGINT NOT NULL DEFAULT 0,  -- discount applied
  total BIGINT NOT NULL DEFAULT 0,           -- what buyer pays
  currency VARCHAR(3) DEFAULT 'XOF',
  
  -- Promo
  promo_code_id UUID REFERENCES promo_codes(id),
  
  -- Payment
  status order_status DEFAULT 'pending',
  payment_method payment_method,
  payment_reference VARCHAR(255),            -- CinetPay transaction ID
  payment_metadata JSONB,                    -- raw payment provider response
  
  -- Buyer info (snapshot at purchase time)
  buyer_name VARCHAR(150),
  buyer_phone VARCHAR(20),
  buyer_email VARCHAR(255),
  
  -- Timing
  expires_at TIMESTAMPTZ,                    -- pending order expiry (15 min)
  paid_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_event ON orders(event_id);
CREATE INDEX idx_orders_buyer ON orders(buyer_id);
CREATE INDEX idx_orders_org ON orders(organization_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_payment_ref ON orders(payment_reference);

-- ============================================
-- TICKETS (individual issued tickets)
-- ============================================

CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  ticket_code VARCHAR(12) NOT NULL UNIQUE,   -- short code: OSXXXXXXXXXXXX
  qr_data TEXT NOT NULL,                      -- full QR payload
  
  order_id UUID NOT NULL REFERENCES orders(id),
  event_id UUID NOT NULL REFERENCES events(id),
  ticket_type_id UUID NOT NULL REFERENCES ticket_types(id),
  holder_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Snapshot
  holder_name VARCHAR(150),
  holder_phone VARCHAR(20),
  ticket_type_name VARCHAR(150),
  price_paid BIGINT NOT NULL DEFAULT 0,
  
  status ticket_status DEFAULT 'valid',
  
  -- Check-in
  checked_in_at TIMESTAMPTZ,
  checked_in_by UUID REFERENCES profiles(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tickets_order ON tickets(order_id);
CREATE INDEX idx_tickets_event ON tickets(event_id);
CREATE INDEX idx_tickets_holder ON tickets(holder_id);
CREATE INDEX idx_tickets_code ON tickets(ticket_code);
CREATE INDEX idx_tickets_event_status ON tickets(event_id, status);
CREATE INDEX idx_tickets_qr ON tickets(qr_data);

-- ============================================
-- CHECK-INS (scan log)
-- ============================================

CREATE TABLE check_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id),
  event_id UUID NOT NULL REFERENCES events(id),
  scanned_by UUID NOT NULL REFERENCES profiles(id),
  
  result VARCHAR(20) NOT NULL, -- 'success', 'already_used', 'invalid', 'wrong_event'
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  device_info TEXT
);

CREATE INDEX idx_check_ins_event ON check_ins(event_id);
CREATE INDEX idx_check_ins_ticket ON check_ins(ticket_id);

-- ============================================
-- PAYOUTS
-- ============================================

CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  event_id UUID REFERENCES events(id),  -- NULL for multi-event payouts
  
  amount BIGINT NOT NULL,                -- FCFA
  fee_deducted BIGINT NOT NULL DEFAULT 0,
  net_amount BIGINT NOT NULL,
  
  status payout_status DEFAULT 'pending',
  payment_method payment_method,
  payment_reference VARCHAR(255),
  
  payout_number VARCHAR(20) NOT NULL UNIQUE, -- PO-XXXXXX
  notes TEXT,
  
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payouts_org ON payouts(organization_id);
CREATE INDEX idx_payouts_event ON payouts(event_id);
CREATE INDEX idx_payouts_status ON payouts(status);

-- ============================================
-- PLATFORM SETTINGS
-- ============================================

CREATE TABLE platform_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default fee configuration
INSERT INTO platform_settings (key, value) VALUES 
  ('fee_percentage', '5'::jsonb),
  ('fee_fixed_fcfa', '100'::jsonb),
  ('payout_delay_hours', '48'::jsonb),
  ('max_tickets_per_order', '10'::jsonb),
  ('order_expiry_minutes', '15'::jsonb);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Generate human-readable order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'OS-' || UPPER(SUBSTRING(gen_random_uuid()::text FROM 1 FOR 6));
END;
$$ LANGUAGE plpgsql;

-- Generate short ticket code
CREATE OR REPLACE FUNCTION generate_ticket_code()
RETURNS TEXT AS $$
BEGIN
  RETURN 'OS' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', '') FROM 1 FOR 10));
END;
$$ LANGUAGE plpgsql;

-- Calculate platform fee
CREATE OR REPLACE FUNCTION calculate_platform_fee(ticket_price BIGINT)
RETURNS BIGINT AS $$
DECLARE
  pct NUMERIC;
  fixed BIGINT;
BEGIN
  IF ticket_price = 0 THEN RETURN 0; END IF;
  
  SELECT (value)::numeric INTO pct FROM platform_settings WHERE key = 'fee_percentage';
  SELECT (value)::bigint INTO fixed FROM platform_settings WHERE key = 'fee_fixed_fcfa';
  
  RETURN CEIL(ticket_price * pct / 100.0) + fixed;
END;
$$ LANGUAGE plpgsql;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_ticket_types_updated_at BEFORE UPDATE ON ticket_types FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tickets_updated_at BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_payouts_updated_at BEFORE UPDATE ON payouts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, update own
CREATE POLICY profiles_select ON profiles FOR SELECT USING (TRUE);
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (auth.uid() = id);

-- Organizations: public read, owner manages
CREATE POLICY orgs_select ON organizations FOR SELECT USING (TRUE);
CREATE POLICY orgs_insert ON organizations FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY orgs_update ON organizations FOR UPDATE USING (auth.uid() = owner_id);

-- Events: published events public, org owner manages all
CREATE POLICY events_select_published ON events FOR SELECT USING (
  status IN ('published', 'live', 'ended') 
  OR organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
);
CREATE POLICY events_insert ON events FOR INSERT WITH CHECK (
  organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
);
CREATE POLICY events_update ON events FOR UPDATE USING (
  organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
);

-- Ticket types: public read for published events, org owner manages
CREATE POLICY ticket_types_select ON ticket_types FOR SELECT USING (TRUE);
CREATE POLICY ticket_types_insert ON ticket_types FOR INSERT WITH CHECK (
  event_id IN (SELECT id FROM events WHERE organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()))
);
CREATE POLICY ticket_types_update ON ticket_types FOR UPDATE USING (
  event_id IN (SELECT id FROM events WHERE organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()))
);

-- Orders: buyer sees own, org owner sees for their events
CREATE POLICY orders_select ON orders FOR SELECT USING (
  buyer_id = auth.uid() 
  OR organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
);
CREATE POLICY orders_insert ON orders FOR INSERT WITH CHECK (buyer_id = auth.uid());

-- Tickets: holder sees own, org owner sees for their events
CREATE POLICY tickets_select ON tickets FOR SELECT USING (
  holder_id = auth.uid()
  OR event_id IN (SELECT id FROM events WHERE organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()))
);

-- Check-ins: org members can insert and read for their events
CREATE POLICY check_ins_select ON check_ins FOR SELECT USING (
  event_id IN (SELECT id FROM events WHERE organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()))
);
CREATE POLICY check_ins_insert ON check_ins FOR INSERT WITH CHECK (
  event_id IN (SELECT id FROM events WHERE organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()))
);

-- Payouts: org owner only
CREATE POLICY payouts_select ON payouts FOR SELECT USING (
  organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
);

-- Promo codes: org owner manages, public can validate (via API)
CREATE POLICY promo_codes_select ON promo_codes FOR SELECT USING (TRUE);
CREATE POLICY promo_codes_insert ON promo_codes FOR INSERT WITH CHECK (
  event_id IN (SELECT id FROM events WHERE organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()))
);
CREATE POLICY promo_codes_update ON promo_codes FOR UPDATE USING (
  event_id IN (SELECT id FROM events WHERE organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()))
);
