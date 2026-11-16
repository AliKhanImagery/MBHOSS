// ==============================================================================
// Supabase Client & Data Synchronization Layer
// Reactive cache-first repository pattern with graceful offline fallback
// ==============================================================================

import { createClient } from '@supabase/supabase-js';
import { DataBankItem, QuotationTemplate, QuotationCase, User } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://viglioqszxqiolhxfcka.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpZ2xpb3FzenhxaW9saHhmY2thIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ3NTE2NzksImV4cCI6MjExMDMyNzY3OX0.vU7hSRRbG0zt2FPIs_fNIdObz0Bx_4pN2Do8kyAdw9I';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Data Bank Mappings & CRUD ───────────────────────────────────────────────

export async function fetchDatabankFromCloud(): Promise<DataBankItem[] | null> {
  try {
    const { data, error } = await supabase
      .from('databank_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase] Failed to fetch databank_items:', error.message);
      return null;
    }

    if (!data || data.length === 0) return null;

    return data.map((row: any) => ({
      id: row.id,
      company: row.company,
      machineName: row.machine_name,
      pricePKR: Number(row.price_pkr),
      lastCheckedDate: row.last_checked_date,
      category: row.category || undefined,
      notes: row.notes || undefined,
    }));
  } catch (err: any) {
    console.warn('[Supabase] fetchDatabankFromCloud network error:', err.message);
    return null;
  }
}

export async function syncDatabankItemToCloud(item: DataBankItem): Promise<boolean> {
  try {
    const payload = {
      id: item.id,
      company: item.company,
      machine_name: item.machineName,
      price_pkr: item.pricePKR,
      last_checked_date: item.lastCheckedDate,
      category: item.category || null,
      notes: item.notes || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('databank_items').upsert(payload);
    if (error) {
      console.warn('[Supabase] syncDatabankItemToCloud error:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase] syncDatabankItemToCloud network error:', err.message);
    return false;
  }
}

export async function deleteDatabankItemFromCloud(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('databank_items').delete().eq('id', id);
    if (error) {
      console.warn('[Supabase] deleteDatabankItemFromCloud error:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase] deleteDatabankItemFromCloud network error:', err.message);
    return false;
  }
}

// ─── Quotations Mappings & CRUD ─────────────────────────────────────────────

export async function fetchQuotationFromCloud(quoteRef: string): Promise<QuotationTemplate | null> {
  try {
    const { data, error } = await supabase
      .from('quotations')
      .select('*')
      .eq('quote_ref', quoteRef)
      .single();

    if (error || !data) return null;

    return {
      quoteRef: data.quote_ref,
      date: data.date,
      validityDays: data.validity_days,
      clientName: data.client_name,
      clientContact: data.client_contact || '',
      deliveryTerms: data.delivery_terms || '',
      paymentTerms: data.payment_terms || '',
      currency: (data.currency as 'PKR' | 'USD') || 'PKR',
      taxMode: (data.tax_mode as 'WITHOUT_GST' | 'GST_18' | 'CUSTOM') || 'WITHOUT_GST',
      customTaxPct: Number(data.custom_tax_pct || 0),
      lineItems: data.line_items || [],
      subtotal: Number(data.subtotal || 0),
      taxAmount: Number(data.tax_amount || 0),
      grandTotal: Number(data.grand_total || 0),
      notes: data.notes || [],
    };
  } catch (err: any) {
    console.warn('[Supabase] fetchQuotationFromCloud network error:', err.message);
    return null;
  }
}

export async function syncQuotationToCloud(template: QuotationTemplate): Promise<boolean> {
  try {
    const payload = {
      id: template.quoteRef,
      quote_ref: template.quoteRef,
      date: template.date,
      validity_days: template.validityDays,
      client_name: template.clientName,
      client_contact: template.clientContact,
      delivery_terms: template.deliveryTerms,
      payment_terms: template.paymentTerms,
      currency: template.currency,
      tax_mode: template.taxMode,
      custom_tax_pct: template.customTaxPct,
      subtotal: template.subtotal,
      tax_amount: template.taxAmount,
      grand_total: template.grandTotal,
      notes: template.notes,
      line_items: template.lineItems,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('quotations').upsert(payload);
    if (error) {
      console.warn('[Supabase] syncQuotationToCloud error:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase] syncQuotationToCloud network error:', err.message);
    return false;
  }
}

// ─── Quotation Cases Mappings & CRUD ────────────────────────────────────────

export async function fetchCasesFromCloud(): Promise<QuotationCase[] | null> {
  try {
    const { data, error } = await supabase
      .from('quotation_cases')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) return null;

    return data.map((row: any) => ({
      id: row.id,
      caseRef: row.case_ref,
      clientName: row.client_name,
      status: row.status,
      createdAt: row.created_at,
      totalPKR: Number(row.total_pkr),
      itemCount: Number(row.item_count),
      templateState: row.template_state,
    }));
  } catch (err: any) {
    console.warn('[Supabase] fetchCasesFromCloud network error:', err.message);
    return null;
  }
}

export async function syncCaseToCloud(caseItem: QuotationCase): Promise<boolean> {
  try {
    const payload = {
      id: caseItem.id,
      case_ref: caseItem.caseRef,
      client_name: caseItem.clientName,
      status: caseItem.status,
      created_at: caseItem.createdAt,
      total_pkr: caseItem.totalPKR,
      item_count: caseItem.itemCount,
      template_state: caseItem.templateState,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('quotation_cases').upsert(payload);
    if (error) {
      console.warn('[Supabase] syncCaseToCloud error:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase] syncCaseToCloud network error:', err.message);
    return false;
  }
}

export async function deleteCaseFromCloud(caseId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('quotation_cases').delete().eq('id', caseId);
    if (error) {
      console.warn('[Supabase] deleteCaseFromCloud error:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase] deleteCaseFromCloud network error:', err.message);
    return false;
  }
}

// ─── Template Settings & Master Rules ───────────────────────────────────────

export async function fetchTemplateSettingsFromCloud(): Promise<{
  masterRules: string;
  letterheadFileName: string;
  letterheadPdfBase64: string | null;
} | null> {
  try {
    const { data, error } = await supabase
      .from('template_settings')
      .select('*')
      .eq('id', 'default')
      .single();

    if (error || !data) return null;

    return {
      masterRules: data.master_template_rules,
      letterheadFileName: data.letterhead_file_name || '',
      letterheadPdfBase64: data.letterhead_pdf_base64 || null,
    };
  } catch (err: any) {
    console.warn('[Supabase] fetchTemplateSettingsFromCloud network error:', err.message);
    return null;
  }
}

export async function syncTemplateSettingsToCloud(
  masterRules: string,
  letterheadFileName?: string,
  letterheadPdfBase64?: string | null
): Promise<boolean> {
  try {
    const payload = {
      id: 'default',
      master_template_rules: masterRules,
      letterhead_file_name: letterheadFileName ?? '',
      letterhead_pdf_base64: letterheadPdfBase64 ?? null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('template_settings').upsert(payload);
    if (error) {
      console.warn('[Supabase] syncTemplateSettingsToCloud error:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase] syncTemplateSettingsToCloud network error:', err.message);
    return false;
  }
}

// ─── Team Members ───────────────────────────────────────────────────────────

export async function fetchTeamMembersFromCloud(): Promise<User[] | null> {
  try {
    const { data, error } = await supabase.from('team_members').select('*');
    if (error || !data || data.length === 0) return null;

    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      avatar: row.avatar || undefined,
      features: row.features || {
        directPdfExport: true,
        dataBankWrite: false,
        marginOverride: false,
        whatsappBot: true,
      },
    }));
  } catch (err: any) {
    console.warn('[Supabase] fetchTeamMembersFromCloud network error:', err.message);
    return null;
  }
}


// ─── Auth helpers ────────────────────────────────────────────────────────────

/** Header for calls to our own API routes. Empty in developer mode (sign-in off). */
export async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** The team_members row for a signed-in email, or null if the account is not a listed team member. */
export async function fetchTeamMemberByEmail(email: string): Promise<User | null> {
  try {
    const { data, error } = await supabase.from('team_members').select('*').ilike('email', email).maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      avatar: data.avatar || undefined,
      features: data.features || { directPdfExport: true, dataBankWrite: false, marginOverride: false, whatsappBot: false },
    };
  } catch {
    return null;
  }
}
