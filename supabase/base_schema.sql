-- ============================================================================
-- MBHOSS — base tables the app reads and writes.
-- Safe to run more than once: it only CREATES what is missing and ADDS missing
-- columns. It never drops, renames, retypes or deletes anything.
--
-- Run this FIRST (Supabase -> SQL Editor). Run auth_setup.sql only later, after
-- the steps in docs/AUTH_ROLLOUT.md.
--
-- This file matches the column names used in src/lib/supabase.ts. It does NOT add
-- any people or data: team_members starts empty (add real rows yourself).
-- The older supabase/schema.sql describes a different design and is not used.
-- ============================================================================

-- Data Bank: machines/items and their cost prices (PKR)
create table if not exists public.databank_items (
  id text primary key,
  company text,
  machine_name text,
  price_pkr numeric,
  last_checked_date date,
  category text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Quotations: one row per quote reference
create table if not exists public.quotations (
  id text primary key,
  quote_ref text unique,
  date text,
  validity_days integer,
  client_name text,
  client_contact text,
  delivery_terms text,
  payment_terms text,
  currency text,
  tax_mode text,
  custom_tax_pct numeric,
  subtotal numeric,
  tax_amount numeric,
  grand_total numeric,
  notes jsonb not null default '[]'::jsonb,
  line_items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Cases: the list on the Cases page, with the quote state saved inside
create table if not exists public.quotation_cases (
  id text primary key,
  case_ref text,
  client_name text,
  status text,
  created_at date not null default current_date,
  total_pkr numeric,
  item_count integer,
  template_state jsonb,
  updated_at timestamptz not null default now()
);

-- Quote template: the single published office template (row id = 'default')
create table if not exists public.template_settings (
  id text primary key,
  master_template_rules text,
  letterhead_file_name text,
  letterhead_pdf_base64 text,
  updated_at timestamptz not null default now()
);

-- Team: who may sign in and what they may do. 'Super Admin', 'SuperAdmin' or 'Admin' = admin.
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  role text,
  avatar text,
  features jsonb
);

-- If any of these tables already existed, make sure every column the app uses is there.
alter table public.databank_items add column if not exists company text;
alter table public.databank_items add column if not exists machine_name text;
alter table public.databank_items add column if not exists price_pkr numeric;
alter table public.databank_items add column if not exists last_checked_date date;
alter table public.databank_items add column if not exists category text;
alter table public.databank_items add column if not exists notes text;
alter table public.databank_items add column if not exists created_at timestamptz not null default now();
alter table public.databank_items add column if not exists updated_at timestamptz not null default now();

alter table public.quotations add column if not exists quote_ref text;
alter table public.quotations add column if not exists date text;
alter table public.quotations add column if not exists validity_days integer;
alter table public.quotations add column if not exists client_name text;
alter table public.quotations add column if not exists client_contact text;
alter table public.quotations add column if not exists delivery_terms text;
alter table public.quotations add column if not exists payment_terms text;
alter table public.quotations add column if not exists currency text;
alter table public.quotations add column if not exists tax_mode text;
alter table public.quotations add column if not exists custom_tax_pct numeric;
alter table public.quotations add column if not exists subtotal numeric;
alter table public.quotations add column if not exists tax_amount numeric;
alter table public.quotations add column if not exists grand_total numeric;
alter table public.quotations add column if not exists notes jsonb not null default '[]'::jsonb;
alter table public.quotations add column if not exists line_items jsonb not null default '[]'::jsonb;
alter table public.quotations add column if not exists created_at timestamptz not null default now();
alter table public.quotations add column if not exists updated_at timestamptz not null default now();

alter table public.quotation_cases add column if not exists case_ref text;
alter table public.quotation_cases add column if not exists client_name text;
alter table public.quotation_cases add column if not exists status text;
alter table public.quotation_cases add column if not exists created_at date not null default current_date;
alter table public.quotation_cases add column if not exists total_pkr numeric;
alter table public.quotation_cases add column if not exists item_count integer;
alter table public.quotation_cases add column if not exists template_state jsonb;
alter table public.quotation_cases add column if not exists updated_at timestamptz not null default now();

alter table public.template_settings add column if not exists master_template_rules text;
alter table public.template_settings add column if not exists letterhead_file_name text;
alter table public.template_settings add column if not exists letterhead_pdf_base64 text;
alter table public.template_settings add column if not exists updated_at timestamptz not null default now();

alter table public.team_members add column if not exists name text;
alter table public.team_members add column if not exists email text;
alter table public.team_members add column if not exists role text;
alter table public.team_members add column if not exists avatar text;
alter table public.team_members add column if not exists features jsonb;

-- One team row per email (case-insensitive), so sign-in always finds exactly one.
create unique index if not exists team_members_email_lower_key on public.team_members (lower(email));

-- NOTE: until you run auth_setup.sql these tables have no row-level security,
-- so the app's public key can read and write them. That is the same open state
-- the app has today; auth_setup.sql closes it once sign-in is on.
