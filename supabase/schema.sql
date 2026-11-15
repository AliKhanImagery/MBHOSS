-- ==============================================================================
-- OOS Procurement & Proposal Engine - Database Schema & RPC Functions
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables/functions if re-running
DROP FUNCTION IF EXISTS claim_next_ref_number(UUID);
DROP TABLE IF EXISTS quote_line_items CASCADE;
DROP TABLE IF EXISTS quote_cases CASCADE;
DROP TABLE IF EXISTS whatsapp_sessions CASCADE;
DROP TABLE IF EXISTS price_intelligence_ledger CASCADE;
DROP TABLE IF EXISTS master_suppliers CASCADE;
DROP TABLE IF EXISTS master_items CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. USERS TABLE
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('CTO_ADMIN', 'PROCUREMENT_ENGINEER')),
    whatsapp_phone TEXT UNIQUE NOT NULL, -- Whitelisted E.164, e.g. +923001234567
    ref_range_start INT NOT NULL,
    ref_range_end INT NOT NULL,
    ref_current_seq INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. SYSTEM SETTINGS
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_ref_format TEXT NOT NULL DEFAULT 'QT-{YYYY}-{SEQ}',
    default_target_country TEXT NOT NULL DEFAULT 'Pakistan',
    base_currency TEXT NOT NULL DEFAULT 'PKR',
    usd_to_pkr_rate NUMERIC(10, 2) NOT NULL DEFAULT 278.50,
    pdf_top_margin_pt INT NOT NULL DEFAULT 140,
    pdf_bottom_margin_pt INT NOT NULL DEFAULT 90,
    cto_approval_bypass_v1 BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. MASTER ITEMS
CREATE TABLE master_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    official_sku TEXT UNIQUE NOT NULL,
    brand TEXT NOT NULL,
    category TEXT NOT NULL,
    plain_english_description TEXT NOT NULL,
    local_market_aliases TEXT[] DEFAULT ARRAY[]::TEXT[],
    unit_of_measure TEXT NOT NULL DEFAULT 'PCS',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. MASTER SUPPLIERS
CREATE TABLE master_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    categories TEXT[] DEFAULT ARRAY[]::TEXT[],
    verification_status TEXT NOT NULL CHECK (verification_status IN ('PENDING', 'VERIFIED')) DEFAULT 'PENDING',
    added_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. PRICE INTELLIGENCE LEDGER (THE GOLD MINE)
CREATE TABLE price_intelligence_ledger (
    record_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES master_items(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES master_suppliers(id) ON DELETE SET NULL,
    submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    unit_cost NUMERIC(14, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'PKR',
    source_origin TEXT NOT NULL CHECK (source_origin IN ('WHATSAPP_BOT', 'LOCAL_MARKET_QUICKADD', 'EMAIL_RFQ_QUOTE', 'GEMINI_DEEP_RESEARCH')),
    incoterm_code TEXT NOT NULL CHECK (incoterm_code IN ('DDP', 'EXW', 'FOB', 'CIF', 'UNSPECIFIED')) DEFAULT 'DDP',
    source_validity_date TIMESTAMPTZ NOT NULL, -- Date the supplier confirmed the price
    app_entry_date TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    evidence_url TEXT,
    notes TEXT
);

-- 6. QUOTE CASES
CREATE TABLE quote_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_ref_number TEXT UNIQUE NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_contact TEXT,
    target_country TEXT NOT NULL DEFAULT 'Pakistan',
    base_currency TEXT NOT NULL DEFAULT 'PKR',
    tax_mode TEXT NOT NULL CHECK (tax_mode IN ('WITHOUT_GST', 'GST_18', 'CUSTOM')) DEFAULT 'WITHOUT_GST',
    custom_tax_pct NUMERIC(5, 2) DEFAULT 0,
    wht_pct NUMERIC(5, 2) DEFAULT 0,
    delivery_terms TEXT NOT NULL DEFAULT 'Ex-Stock',
    payment_terms TEXT NOT NULL DEFAULT '100% Advance',
    validity_days INT NOT NULL DEFAULT 7,
    split_rfq_by_category BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'STAMPED', 'WON', 'EXPIRED'
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. QUOTE LINE ITEMS (WITH OPTION B ALTERNATIVE SUPPORT)
CREATE TABLE quote_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_case_id UUID NOT NULL REFERENCES quote_cases(id) ON DELETE CASCADE,
    item_id UUID REFERENCES master_items(id) ON DELETE SET NULL,
    raw_input_text TEXT,
    custom_description TEXT,
    qty NUMERIC(10, 2) NOT NULL DEFAULT 1,
    unit_of_measure TEXT NOT NULL DEFAULT 'PCS',
    selected_cost NUMERIC(14, 2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'PKR',
    suggested_margin_pct NUMERIC(5, 2) NOT NULL DEFAULT 15,
    margin_pct NUMERIC(5, 2) NOT NULL DEFAULT 15,
    final_unit_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
    line_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
    confidence_level TEXT NOT NULL DEFAULT 'GREEN', -- 'GREEN', 'YELLOW', 'RED'
    incoterm_code TEXT NOT NULL DEFAULT 'DDP',
    matched_ledger_record_id UUID REFERENCES price_intelligence_ledger(record_id) ON DELETE SET NULL,
    parent_line_id UUID REFERENCES quote_line_items(id) ON DELETE CASCADE,
    is_alternative BOOLEAN NOT NULL DEFAULT false,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. WHATSAPP SESSIONS (META CLOUD API 4-STATE ENGINE)
CREATE TABLE whatsapp_sessions (
    phone TEXT PRIMARY KEY, -- Whitelisted phone number in E.164
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    state TEXT NOT NULL CHECK (state IN ('IDLE', 'AWAITING_CONFIRM', 'AWAITING_SCREENSHOT')) DEFAULT 'IDLE',
    draft_payload JSONB DEFAULT '{}'::jsonb,
    last_active_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. ATOMIC POSTGRES RPC: claim_next_ref_number
CREATE OR REPLACE FUNCTION claim_next_ref_number(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_user users%ROWTYPE;
    v_format TEXT;
    v_seq_str TEXT;
    v_year_str TEXT;
    v_result TEXT;
BEGIN
    -- 1. Lock user row to prevent race conditions during high-speed sequential claims
    SELECT * INTO v_user
    FROM users
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found: %', p_user_id;
    END IF;

    -- 2. Check if user has exceeded allocated sequence range
    IF v_user.ref_current_seq > v_user.ref_range_end THEN
        RAISE EXCEPTION 'Reference range [% - %] exhausted for user %. Contact CTO Admin.',
            v_user.ref_range_start, v_user.ref_range_end, v_user.full_name;
    END IF;

    -- 3. Retrieve system settings format
    SELECT quote_ref_format INTO v_format
    FROM system_settings
    LIMIT 1;

    IF v_format IS NULL THEN
        v_format := 'QT-{YYYY}-{SEQ}';
    END IF;

    -- Format replacements
    v_seq_str := LPAD(v_user.ref_current_seq::TEXT, 4, '0');
    v_year_str := TO_CHAR(CURRENT_DATE, 'YYYY');

    v_result := REPLACE(v_format, '{YYYY}', v_year_str);
    v_result := REPLACE(v_result, '{SEQ}', v_seq_str);

    -- 4. Increment sequence
    UPDATE users
    SET ref_current_seq = ref_current_seq + 1
    WHERE id = p_user_id;

    RETURN v_result;
END;
$$;

-- ==============================================================================
-- INITIAL SEED DATA
-- ==============================================================================

-- Insert Default System Settings
INSERT INTO system_settings (
    id, quote_ref_format, default_target_country, base_currency, usd_to_pkr_rate, pdf_top_margin_pt, pdf_bottom_margin_pt, cto_approval_bypass_v1
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'QT-{YYYY}-{SEQ}',
    'Pakistan',
    'PKR',
    278.50,
    140,
    90,
    true
);

-- Insert Users (CTO Admin & Procurement Staff with sequence ranges)
INSERT INTO users (id, full_name, email, role, whatsapp_phone, ref_range_start, ref_range_end, ref_current_seq) VALUES
('11111111-1111-1111-1111-111111111111', 'Tariq Mehmood (CTO)', 'tariq@oosprocurement.com', 'CTO_ADMIN', '+923008451122', 1000, 1999, 1001),
('22222222-2222-2222-2222-222222222222', 'Ali Khan (Senior Procurement)', 'ali.khan@oosprocurement.com', 'PROCUREMENT_ENGINEER', '+923214567890', 2000, 2999, 2001),
('33333333-3333-3333-3333-333333333333', 'Hamza Rauf (Procurement Engineer)', 'hamza@oosprocurement.com', 'PROCUREMENT_ENGINEER', '+923337890123', 3000, 3999, 3001);

-- Insert Master Industrial Items
INSERT INTO master_items (id, official_sku, brand, category, plain_english_description, local_market_aliases, unit_of_measure) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '3RH2122-1BB40', 'Siemens', 'Switchgear & Relays', 'Siemens SIRIUS Contactor Relay 24V DC, 2NO+2NC, Size S00, Screw Terminal', ARRAY['24V Chota Relay', 'Siemens 24v relay', 'SIRIUS 2NO 2NC 24v', '3RH2122'], 'PCS'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'LC1D25BD', 'Schneider Electric', 'Switchgear & Relays', 'Schneider TeSys D Contactor 3P 25A AC-3 11kW, 24V DC coil with suppressors', ARRAY['Schneider 25A 24V', 'LC1D25 24V', 'Tesys 25A Contactor', 'Schneider Bada Contactor'], 'PCS'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'LC1D09M7', 'Schneider Electric', 'Switchgear & Relays', 'Schneider TeSys D Contactor 3P 9A AC-3 4kW, 220V AC coil 50/60Hz', ARRAY['Schneider 9A 220V', 'LC1D09 220V coil', '9 amp contactor schneider'], 'PCS'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', '6ES7214-1AG40-0XB0', 'Siemens', 'Automation & PLC', 'Siemens SIMATIC S7-1200 CPU 1214C, DC/DC/DC, 14DI/10DO/2AI, 100KB Work Memory', ARRAY['S7 1200 1214C DC', 'Siemens 1214C PLC', '1214 DC DC DC', 'S7-1200 14DI'], 'PCS'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'ATV320U15N4B', 'Schneider Electric', 'Variable Speed Drives', 'Schneider Altivar 320 VFD 1.5kW 2HP 380-500V 3-Phase Book format inverter', ARRAY['Schneider 1.5kW VFD', 'ATV320 2HP', 'Altivar 1.5kw inverter', 'ATV320 book'], 'PCS'),
('ffffffff-ffff-ffff-ffff-ffffffffffff', 'E2B-M12KS04-WP-B1', 'Omron', 'Sensors & Instrumentation', 'Omron M12 Inductive Proximity Sensor, Shielded 4mm, PNP NO, 2m Pre-wired', ARRAY['Omron M12 Sensor PNP', 'E2B M12 4mm', 'Omron proximity PNP NO', 'M12 sensor omron'], 'PCS');

-- Insert Master Industrial Suppliers
INSERT INTO master_suppliers (id, company_name, email, phone, categories, verification_status, added_by) VALUES
('s1111111-1111-1111-1111-111111111111', 'Brandt Industrial Automation Lahore', 'sales@brandt-automation.pk', '+924237221199', ARRAY['Switchgear & Relays', 'Automation & PLC'], 'VERIFIED', '11111111-1111-1111-1111-111111111111'),
('s2222222-2222-2222-2222-222222222222', 'Al-Madina Switchgear Brandreth Road', 'almadina.electric@gmail.com', '+923004128833', ARRAY['Switchgear & Relays', 'Variable Speed Drives'], 'VERIFIED', '22222222-2222-2222-2222-222222222222'),
('s3333333-3333-3333-3333-333333333333', 'Pak-German Automation Systems Karachi', 'quotes@pakgerman.com.pk', '+922132415500', ARRAY['Automation & PLC', 'Sensors & Instrumentation'], 'VERIFIED', '11111111-1111-1111-1111-111111111111');

-- Insert Price Intelligence Records (The Gold Mine)
-- Providing recent and older records to demonstrate confidence decay (GREEN vs YELLOW vs RED)
INSERT INTO price_intelligence_ledger (
    record_id, item_id, supplier_id, submitted_by, unit_cost, currency, source_origin, incoterm_code, source_validity_date, app_entry_date, evidence_url, notes
) VALUES
-- Green record (Confirmed 5 days ago, verified WhatsApp quote with evidence)
(
    'p1111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    's1111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    14500.00,
    'PKR',
    'WHATSAPP_BOT',
    'DDP',
    CURRENT_DATE - INTERVAL '5 days',
    CURRENT_DATE - INTERVAL '5 days',
    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80',
    'WhatsApp confirmed price with Brandreth Rd supplier. Stock available in Lahore warehouse.'
),
-- Yellow record (Confirmed 45 days ago)
(
    'p2222222-2222-2222-2222-222222222222',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    's2222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    21800.00,
    'PKR',
    'LOCAL_MARKET_QUICKADD',
    'EXW',
    CURRENT_DATE - INTERVAL '45 days',
    CURRENT_DATE - INTERVAL '45 days',
    NULL,
    'Counter price picked up from Al-Madina shop visit. Needs EXW pickup from Brandreth shop.'
),
-- Red record (Confirmed 120 days ago, stale)
(
    'p3333333-3333-3333-3333-333333333333',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    's3333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    420.00,
    'USD',
    'EMAIL_RFQ_QUOTE',
    'FOB',
    CURRENT_DATE - INTERVAL '120 days',
    CURRENT_DATE - INTERVAL '118 days',
    'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
    'USD Quote received via email. Older exchange rate was applied, market price now volatile.'
),
-- Another Green record for Schneider Contactor
(
    'p4444444-4444-4444-4444-444444444444',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    's1111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    8200.00,
    'PKR',
    'LOCAL_MARKET_QUICKADD',
    'DDP',
    CURRENT_DATE - INTERVAL '12 days',
    CURRENT_DATE - INTERVAL '12 days',
    NULL,
    'Standard 220V Schneider 9A contactor. Ready ex-stock.'
);

-- End of schema
