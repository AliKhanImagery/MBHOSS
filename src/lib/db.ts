// ==============================================================================
// OOS Procurement Database Layer (Offline-First with Supabase Fallback)
// ==============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: 'CTO_ADMIN' | 'PROCUREMENT_ENGINEER';
  whatsapp_phone: string;
  ref_range_start: number;
  ref_range_end: number;
  ref_current_seq: number;
  created_at: string;
}

export interface SystemSettings {
  id: string;
  quote_ref_format: string; // 'QT-{YYYY}-{SEQ}'
  default_target_country: string; // 'Pakistan'
  base_currency: string; // 'PKR'
  usd_to_pkr_rate: number; // 278.50
  pdf_top_margin_pt: number; // 140
  pdf_bottom_margin_pt: number; // 90
  cto_approval_bypass_v1: boolean; // true
  updated_at: string;
}

export interface MasterItem {
  id: string;
  official_sku: string;
  brand: string;
  category: string;
  plain_english_description: string;
  local_market_aliases: string[];
  unit_of_measure: string;
  created_at: string;
}

export interface MasterSupplier {
  id: string;
  company_name: string;
  email: string;
  phone: string;
  categories: string[];
  verification_status: 'PENDING' | 'VERIFIED';
  added_by?: string;
  created_at: string;
}

export interface PriceLedgerRecord {
  record_id: string;
  item_id: string;
  supplier_id?: string;
  submitted_by?: string;
  unit_cost: number;
  currency: 'PKR' | 'USD';
  source_origin: 'WHATSAPP_BOT' | 'LOCAL_MARKET_QUICKADD' | 'EMAIL_RFQ_QUOTE' | 'GEMINI_DEEP_RESEARCH';
  incoterm_code: 'DDP' | 'EXW' | 'FOB' | 'CIF' | 'UNSPECIFIED';
  source_validity_date: string; // When supplier confirmed the rate
  app_entry_date: string;
  evidence_url?: string;
  notes?: string;

  // Joined fields for fast UI access
  item?: MasterItem;
  supplier?: MasterSupplier;
  submitter?: User;
}

export interface QuoteCase {
  id: string;
  case_ref_number: string;
  created_by?: string;
  customer_name: string;
  customer_contact?: string;
  target_country: string;
  base_currency: string;
  tax_mode: 'WITHOUT_GST' | 'GST_18' | 'CUSTOM';
  custom_tax_pct: number;
  wht_pct: number;
  delivery_terms: string;
  payment_terms: string;
  validity_days: number;
  split_rfq_by_category: boolean;
  status: 'DRAFT' | 'STAMPED' | 'WON' | 'EXPIRED';
  created_at: string;
  updated_at: string;
}

export interface QuoteLineItem {
  id: string;
  quote_case_id: string;
  item_id?: string;
  raw_input_text?: string;
  custom_description: string;
  qty: number;
  unit_of_measure: string;
  selected_cost: number;
  currency: string;
  suggested_margin_pct: number;
  margin_pct: number;
  final_unit_price: number;
  line_total: number;
  confidence_level: 'GREEN' | 'YELLOW' | 'RED';
  incoterm_code: 'DDP' | 'EXW' | 'FOB' | 'CIF' | 'UNSPECIFIED';
  matched_ledger_record_id?: string;
  parent_line_id?: string; // Links Option B directly beneath primary parent row
  is_alternative: boolean; // Option B flag
  sort_order: number;
  created_at: string;

  // Joined relations
  matched_ledger?: PriceLedgerRecord;
  item?: MasterItem;
}

export interface WhatsAppSession {
  phone: string;
  user_id?: string;
  state: 'IDLE' | 'AWAITING_CONFIRM' | 'AWAITING_SCREENSHOT';
  draft_payload: any;
  last_active_at: string;
}

// -----------------------------------------------------------------------------
// IN-MEMORY SEEDED STORE FOR OFFLINE-FIRST DEV MODE
// -----------------------------------------------------------------------------

const SEED_USERS: User[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    full_name: 'Tariq Mehmood (CTO)',
    email: 'tariq@oosprocurement.com',
    role: 'CTO_ADMIN',
    whatsapp_phone: '+923008451122',
    ref_range_start: 1000,
    ref_range_end: 1999,
    ref_current_seq: 1001,
    created_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    full_name: 'Ali Khan (Senior Procurement)',
    email: 'ali.khan@oosprocurement.com',
    role: 'PROCUREMENT_ENGINEER',
    whatsapp_phone: '+923214567890',
    ref_range_start: 2000,
    ref_range_end: 2999,
    ref_current_seq: 2001,
    created_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    full_name: 'Hamza Rauf (Procurement Engineer)',
    email: 'hamza@oosprocurement.com',
    role: 'PROCUREMENT_ENGINEER',
    whatsapp_phone: '+923337890123',
    ref_range_start: 3000,
    ref_range_end: 3999,
    ref_current_seq: 3001,
    created_at: new Date('2026-01-01').toISOString(),
  },
];

const SEED_SETTINGS: SystemSettings = {
  id: '00000000-0000-0000-0000-000000000001',
  quote_ref_format: 'QT-{YYYY}-{SEQ}',
  default_target_country: 'Pakistan',
  base_currency: 'PKR',
  usd_to_pkr_rate: 278.50,
  pdf_top_margin_pt: 140,
  pdf_bottom_margin_pt: 90,
  cto_approval_bypass_v1: true,
  updated_at: new Date().toISOString(),
};

const SEED_ITEMS: MasterItem[] = [
  {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    official_sku: '3RH2122-1BB40',
    brand: 'Siemens',
    category: 'Switchgear & Relays',
    plain_english_description: 'Siemens SIRIUS Contactor Relay 24V DC, 2NO+2NC, Size S00, Screw Terminal',
    local_market_aliases: ['24V Chota Relay', 'Siemens 24v relay', 'SIRIUS 2NO 2NC 24v', '3RH2122'],
    unit_of_measure: 'PCS',
    created_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    official_sku: 'LC1D25BD',
    brand: 'Schneider Electric',
    category: 'Switchgear & Relays',
    plain_english_description: 'Schneider TeSys D Contactor 3P 25A AC-3 11kW, 24V DC coil with suppressors',
    local_market_aliases: ['Schneider 25A 24V', 'LC1D25 24V', 'Tesys 25A Contactor', 'Schneider Bada Contactor'],
    unit_of_measure: 'PCS',
    created_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    official_sku: 'LC1D09M7',
    brand: 'Schneider Electric',
    category: 'Switchgear & Relays',
    plain_english_description: 'Schneider TeSys D Contactor 3P 9A AC-3 4kW, 220V AC coil 50/60Hz',
    local_market_aliases: ['Schneider 9A 220V', 'LC1D09 220V coil', '9 amp contactor schneider'],
    unit_of_measure: 'PCS',
    created_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    official_sku: '6ES7214-1AG40-0XB0',
    brand: 'Siemens',
    category: 'Automation & PLC',
    plain_english_description: 'Siemens SIMATIC S7-1200 CPU 1214C, DC/DC/DC, 14DI/10DO/2AI, 100KB Work Memory',
    local_market_aliases: ['S7 1200 1214C DC', 'Siemens 1214C PLC', '1214 DC DC DC', 'S7-1200 14DI'],
    unit_of_measure: 'PCS',
    created_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    official_sku: 'ATV320U15N4B',
    brand: 'Schneider Electric',
    category: 'Variable Speed Drives',
    plain_english_description: 'Schneider Altivar 320 VFD 1.5kW 2HP 380-500V 3-Phase Book format inverter',
    local_market_aliases: ['Schneider 1.5kW VFD', 'ATV320 2HP', 'Altivar 1.5kw inverter', 'ATV320 book'],
    unit_of_measure: 'PCS',
    created_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
    official_sku: 'E2B-M12KS04-WP-B1',
    brand: 'Omron',
    category: 'Sensors & Instrumentation',
    plain_english_description: 'Omron M12 Inductive Proximity Sensor, Shielded 4mm, PNP NO, 2m Pre-wired',
    local_market_aliases: ['Omron M12 Sensor PNP', 'E2B M12 4mm', 'Omron proximity PNP NO', 'M12 sensor omron'],
    unit_of_measure: 'PCS',
    created_at: new Date('2026-01-01').toISOString(),
  },
];

const SEED_SUPPLIERS: MasterSupplier[] = [
  {
    id: 's1111111-1111-1111-1111-111111111111',
    company_name: 'Brandt Industrial Automation Lahore',
    email: 'sales@brandt-automation.pk',
    phone: '+924237221199',
    categories: ['Switchgear & Relays', 'Automation & PLC'],
    verification_status: 'VERIFIED',
    added_by: '11111111-1111-1111-1111-111111111111',
    created_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 's2222222-2222-2222-2222-222222222222',
    company_name: 'Al-Madina Switchgear Brandreth Road',
    email: 'almadina.electric@gmail.com',
    phone: '+923004128833',
    categories: ['Switchgear & Relays', 'Variable Speed Drives'],
    verification_status: 'VERIFIED',
    added_by: '22222222-2222-2222-2222-222222222222',
    created_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 's3333333-3333-3333-3333-333333333333',
    company_name: 'Pak-German Automation Systems Karachi',
    email: 'quotes@pakgerman.com.pk',
    phone: '+922132415500',
    categories: ['Automation & PLC', 'Sensors & Instrumentation'],
    verification_status: 'VERIFIED',
    added_by: '11111111-1111-1111-1111-111111111111',
    created_at: new Date('2026-01-01').toISOString(),
  },
];

// Helper to calculate date days ago
function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

const SEED_LEDGER: PriceLedgerRecord[] = [
  {
    record_id: 'p1111111-1111-1111-1111-111111111111',
    item_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    supplier_id: 's1111111-1111-1111-1111-111111111111',
    submitted_by: '22222222-2222-2222-2222-222222222222',
    unit_cost: 14500.00,
    currency: 'PKR',
    source_origin: 'WHATSAPP_BOT',
    incoterm_code: 'DDP',
    source_validity_date: daysAgo(5), // 5 days old -> GREEN
    app_entry_date: daysAgo(5),
    evidence_url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80',
    notes: 'WhatsApp confirmed price with Brandreth Rd supplier. Stock available in Lahore warehouse.',
  },
  {
    record_id: 'p2222222-2222-2222-2222-222222222222',
    item_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    supplier_id: 's2222222-2222-2222-2222-222222222222',
    submitted_by: '33333333-3333-3333-3333-333333333333',
    unit_cost: 21800.00,
    currency: 'PKR',
    source_origin: 'LOCAL_MARKET_QUICKADD',
    incoterm_code: 'EXW',
    source_validity_date: daysAgo(45), // 45 days old -> YELLOW
    app_entry_date: daysAgo(45),
    evidence_url: undefined,
    notes: 'Counter price picked up from Al-Madina shop visit. Needs EXW pickup from Brandreth shop.',
  },
  {
    record_id: 'p3333333-3333-3333-3333-333333333333',
    item_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    supplier_id: 's3333333-3333-3333-3333-333333333333',
    submitted_by: '11111111-1111-1111-1111-111111111111',
    unit_cost: 420.00,
    currency: 'USD',
    source_origin: 'EMAIL_RFQ_QUOTE',
    incoterm_code: 'FOB',
    source_validity_date: daysAgo(120), // 120 days old -> RED
    app_entry_date: daysAgo(118),
    evidence_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
    notes: 'USD Quote received via email. Older exchange rate was applied, market price now volatile.',
  },
  {
    record_id: 'p4444444-4444-4444-4444-444444444444',
    item_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    supplier_id: 's1111111-1111-1111-1111-111111111111',
    submitted_by: '22222222-2222-2222-2222-222222222222',
    unit_cost: 8200.00,
    currency: 'PKR',
    source_origin: 'LOCAL_MARKET_QUICKADD',
    incoterm_code: 'DDP',
    source_validity_date: daysAgo(12), // 12 days old -> GREEN
    app_entry_date: daysAgo(12),
    notes: 'Standard 220V Schneider 9A contactor. Ready ex-stock.',
  },
  {
    record_id: 'p5555555-5555-5555-5555-555555555555',
    item_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    supplier_id: 's2222222-2222-2222-2222-222222222222',
    submitted_by: '22222222-2222-2222-2222-222222222222',
    unit_cost: 54000.00,
    currency: 'PKR',
    source_origin: 'LOCAL_MARKET_QUICKADD',
    incoterm_code: 'DDP',
    source_validity_date: daysAgo(8), // 8 days old -> GREEN
    app_entry_date: daysAgo(8),
    evidence_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
    notes: 'Original box sealed Schneider ATV320 VFD inverter.',
  },
];

// In-Memory state holder for singleton persistence across API calls
declare global {
  // eslint-disable-next-line no-var
  var __OOS_DB_STATE__: {
    users: User[];
    settings: SystemSettings;
    items: MasterItem[];
    suppliers: MasterSupplier[];
    ledger: PriceLedgerRecord[];
    quoteCases: QuoteCase[];
    quoteLines: QuoteLineItem[];
    whatsappSessions: Record<string, WhatsAppSession>;
  } | undefined;
}

if (!global.__OOS_DB_STATE__) {
  global.__OOS_DB_STATE__ = {
    users: [...SEED_USERS],
    settings: { ...SEED_SETTINGS },
    items: [...SEED_ITEMS],
    suppliers: [...SEED_SUPPLIERS],
    ledger: [...SEED_LEDGER],
    quoteCases: [],
    quoteLines: [],
    whatsappSessions: {
      '+923214567890': {
        phone: '+923214567890',
        user_id: '22222222-2222-2222-2222-222222222222',
        state: 'IDLE',
        draft_payload: null,
        last_active_at: new Date().toISOString(),
      },
    },
  };
}

const memoryStore = global.__OOS_DB_STATE__;

// -----------------------------------------------------------------------------
// DATABASE REPOSITORY CLASS (HYBRID SUPABASE + STATEFUL LOCAL STORE)
// -----------------------------------------------------------------------------

export class DatabaseService {
  private supabase: SupabaseClient | null = null;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnonKey) {
      try {
        this.supabase = createClient(supabaseUrl, supabaseAnonKey);
      } catch (err) {
        console.warn('[DB] Supabase init failed, falling back to local store:', err);
      }
    }
  }

  isSupabaseConnected(): boolean {
    return !!this.supabase;
  }

  // --- USERS ---
  async getUsers(): Promise<User[]> {
    if (this.supabase) {
      const { data, error } = await this.supabase.from('users').select('*').order('full_name');
      if (!error && data && data.length > 0) return data;
    }
    return memoryStore.users;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const users = await this.getUsers();
    return users.find((u) => u.id === id);
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const clean = phone.trim().replace(/\s+/g, '');
    const users = await this.getUsers();
    return users.find((u) => u.whatsapp_phone.replace(/\s+/g, '') === clean);
  }

  async updateUserSeqRange(userId: string, start: number, end: number): Promise<User | null> {
    const user = memoryStore.users.find((u) => u.id === userId);
    if (!user) return null;
    user.ref_range_start = start;
    user.ref_range_end = end;
    if (user.ref_current_seq < start) user.ref_current_seq = start;

    if (this.supabase) {
      await this.supabase.from('users').update({
        ref_range_start: start,
        ref_range_end: end,
        ref_current_seq: user.ref_current_seq,
      }).eq('id', userId);
    }
    return user;
  }

  async addUser(newUser: Omit<User, 'id' | 'created_at'>): Promise<User> {
    const user: User = {
      ...newUser,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    memoryStore.users.push(user);
    if (this.supabase) {
      await this.supabase.from('users').insert(user);
    }
    return user;
  }

  // --- SYSTEM SETTINGS ---
  async getSettings(): Promise<SystemSettings> {
    if (this.supabase) {
      const { data, error } = await this.supabase.from('system_settings').select('*').limit(1).maybeSingle();
      if (!error && data) return data;
    }
    return memoryStore.settings;
  }

  async updateSettings(updates: Partial<SystemSettings>): Promise<SystemSettings> {
    memoryStore.settings = {
      ...memoryStore.settings,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    if (this.supabase) {
      await this.supabase.from('system_settings').update(updates).eq('id', memoryStore.settings.id);
    }
    return memoryStore.settings;
  }

  // --- ATOMIC REFERENCE NUMBER CLAIM (Equivalent to PostgreSQL RPC) ---
  async claimNextRefNumber(userId: string): Promise<string> {
    // If Supabase is connected, invoke the PostgreSQL RPC
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase.rpc('claim_next_ref_number', { p_user_id: userId });
        if (!error && data) return data as string;
      } catch (err) {
        console.warn('[DB] Supabase RPC error, executing local atomic logic:', err);
      }
    }

    // Atomic local sequence logic
    const user = memoryStore.users.find((u) => u.id === userId) || memoryStore.users[0];
    if (user.ref_current_seq > user.ref_range_end) {
      throw new Error(`Reference number range [${user.ref_range_start}-${user.ref_range_end}] exhausted for ${user.full_name}. Contact CTO.`);
    }

    const currentSeq = user.ref_current_seq;
    user.ref_current_seq += 1;

    const format = memoryStore.settings.quote_ref_format || 'QT-{YYYY}-{SEQ}';
    const year = new Date().getFullYear().toString();
    const seqStr = currentSeq.toString().padStart(4, '0');

    return format.replace('{YYYY}', year).replace('{SEQ}', seqStr);
  }

  // --- MASTER ITEMS ---
  async getMasterItems(): Promise<MasterItem[]> {
    if (this.supabase) {
      const { data, error } = await this.supabase.from('master_items').select('*').order('brand');
      if (!error && data && data.length > 0) return data;
    }
    return memoryStore.items;
  }

  async addMasterItem(item: Omit<MasterItem, 'id' | 'created_at'>): Promise<MasterItem> {
    const newItem: MasterItem = {
      ...item,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    memoryStore.items.push(newItem);
    if (this.supabase) {
      await this.supabase.from('master_items').insert(newItem);
    }
    return newItem;
  }

  // --- MASTER SUPPLIERS ---
  async getMasterSuppliers(): Promise<MasterSupplier[]> {
    if (this.supabase) {
      const { data, error } = await this.supabase.from('master_suppliers').select('*').order('company_name');
      if (!error && data && data.length > 0) return data;
    }
    return memoryStore.suppliers;
  }

  async addMasterSupplier(supplier: Omit<MasterSupplier, 'id' | 'created_at'>): Promise<MasterSupplier> {
    const newSupplier: MasterSupplier = {
      ...supplier,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    memoryStore.suppliers.push(newSupplier);
    if (this.supabase) {
      await this.supabase.from('master_suppliers').insert(newSupplier);
    }
    return newSupplier;
  }

  // --- PRICE INTELLIGENCE LEDGER (THE GOLD MINE) ---
  async getLedgerRecords(filter?: { itemId?: string; search?: string }): Promise<PriceLedgerRecord[]> {
    let records = [...memoryStore.ledger];

    if (filter?.itemId) {
      records = records.filter((r) => r.item_id === filter.itemId);
    }

    if (filter?.search) {
      const s = filter.search.toLowerCase();
      records = records.filter((r) => {
        const item = memoryStore.items.find((i) => i.id === r.item_id);
        const supplier = memoryStore.suppliers.find((sup) => sup.id === r.supplier_id);
        return (
          item?.official_sku.toLowerCase().includes(s) ||
          item?.plain_english_description.toLowerCase().includes(s) ||
          supplier?.company_name.toLowerCase().includes(s) ||
          r.notes?.toLowerCase().includes(s)
        );
      });
    }

    // Join related models
    const enriched = records.map((rec) => ({
      ...rec,
      item: memoryStore.items.find((i) => i.id === rec.item_id),
      supplier: memoryStore.suppliers.find((s) => s.id === rec.supplier_id),
      submitter: memoryStore.users.find((u) => u.id === rec.submitted_by),
    }));

    // Sort by source_validity_date DESC (freshest first)
    enriched.sort((a, b) => new Date(b.source_validity_date).getTime() - new Date(a.source_validity_date).getTime());
    return enriched;
  }

  async addLedgerRecord(
    entry: Omit<PriceLedgerRecord, 'record_id' | 'app_entry_date' | 'item' | 'supplier' | 'submitter'>
  ): Promise<PriceLedgerRecord> {
    const record: PriceLedgerRecord = {
      ...entry,
      record_id: crypto.randomUUID(),
      app_entry_date: new Date().toISOString(),
    };
    memoryStore.ledger.unshift(record);

    if (this.supabase) {
      await this.supabase.from('price_intelligence_ledger').insert(record);
    }

    return {
      ...record,
      item: memoryStore.items.find((i) => i.id === record.item_id),
      supplier: memoryStore.suppliers.find((s) => s.id === record.supplier_id),
      submitter: memoryStore.users.find((u) => u.id === record.submitted_by),
    };
  }

  // --- QUOTE CASES & LINE ITEMS ---
  async saveQuoteCase(
    caseData: Omit<QuoteCase, 'id' | 'created_at' | 'updated_at'> & { id?: string },
    lineItems: Array<Omit<QuoteLineItem, 'id' | 'quote_case_id' | 'created_at'> & { id?: string; parent_line_id?: string }>
  ): Promise<{ quoteCase: QuoteCase; lineItems: QuoteLineItem[] }> {
    const caseId = caseData.id || crypto.randomUUID();
    const existingIndex = memoryStore.quoteCases.findIndex((c) => c.id === caseId);

    const quoteCase: QuoteCase = {
      ...caseData,
      id: caseId,
      created_at: existingIndex >= 0 ? memoryStore.quoteCases[existingIndex].created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      memoryStore.quoteCases[existingIndex] = quoteCase;
    } else {
      memoryStore.quoteCases.unshift(quoteCase);
    }

    // Replace line items for this case
    memoryStore.quoteLines = memoryStore.quoteLines.filter((l) => l.quote_case_id !== caseId);

    const savedLines: QuoteLineItem[] = lineItems.map((line, idx) => ({
      ...line,
      id: line.id || crypto.randomUUID(),
      quote_case_id: caseId,
      sort_order: idx,
      created_at: new Date().toISOString(),
    }));

    memoryStore.quoteLines.push(...savedLines);

    if (this.supabase) {
      await this.supabase.from('quote_cases').upsert(quoteCase);
      await this.supabase.from('quote_line_items').delete().eq('quote_case_id', caseId);
      await this.supabase.from('quote_line_items').insert(savedLines);
    }

    return { quoteCase, lineItems: savedLines };
  }

  async getQuoteCases(): Promise<QuoteCase[]> {
    return [...memoryStore.quoteCases];
  }

  async getQuoteCaseWithLines(id: string): Promise<{ quoteCase: QuoteCase; lineItems: QuoteLineItem[] } | null> {
    const qc = memoryStore.quoteCases.find((c) => c.id === id);
    if (!qc) return null;
    const lines = memoryStore.quoteLines
      .filter((l) => l.quote_case_id === id)
      .sort((a, b) => a.sort_order - b.sort_order);
    return { quoteCase: qc, lineItems: lines };
  }

  // --- WHATSAPP SESSIONS (META 4-STATE ENGINE) ---
  async getWhatsAppSession(phone: string): Promise<WhatsAppSession> {
    const cleanPhone = phone.trim().replace(/\s+/g, '');
    let session = memoryStore.whatsappSessions[cleanPhone];
    if (!session) {
      const user = await this.getUserByPhone(cleanPhone);
      session = {
        phone: cleanPhone,
        user_id: user?.id,
        state: 'IDLE',
        draft_payload: null,
        last_active_at: new Date().toISOString(),
      };
      memoryStore.whatsappSessions[cleanPhone] = session;
    }
    return session;
  }

  async updateWhatsAppSession(
    phone: string,
    state: WhatsAppSession['state'],
    draftPayload: any = null
  ): Promise<WhatsAppSession> {
    const session = await this.getWhatsAppSession(phone);
    session.state = state;
    session.draft_payload = draftPayload;
    session.last_active_at = new Date().toISOString();
    memoryStore.whatsappSessions[session.phone] = session;
    return session;
  }

  // --- LEADERBOARD ---
  async getContributorLeaderboard(): Promise<
    Array<{
      user: User;
      totalContributions: number;
      verifiedCount: number;
      rank: number;
    }>
  > {
    const users = await this.getUsers();
    const ledger = await this.getLedgerRecords();

    const leaderboard = users.map((user) => {
      const userEntries = ledger.filter((r) => r.submitted_by === user.id);
      const verified = userEntries.filter((r) => !!r.evidence_url || r.source_origin === 'WHATSAPP_BOT');
      return {
        user,
        totalContributions: userEntries.length,
        verifiedCount: verified.length,
        rank: 0,
      };
    });

    leaderboard.sort((a, b) => b.totalContributions - a.totalContributions || b.verifiedCount - a.verifiedCount);
    leaderboard.forEach((item, index) => {
      item.rank = index + 1;
    });

    return leaderboard;
  }
}

export const db = new DatabaseService();
