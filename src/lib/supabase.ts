// ==============================================================================
// Supabase Client & Data Synchronization Layer
// Reactive cache-first repository pattern with graceful offline fallback
// ==============================================================================

import { createClient } from '@supabase/supabase-js';
import { DataBankItem, QuotationTemplate, QuotationCase, User, SourcingOption, ProjectCase } from '@/types';
import { parseAuthLinkType } from '@/lib/auth-link';
import { supabaseConfig } from '@/lib/supabase-config';

const { url: supabaseUrl, anonKey: supabaseAnonKey } = supabaseConfig({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

// Must be read before createClient, which removes the token from the address bar.
export const authLinkType = typeof window !== 'undefined' ? parseAuthLinkType(window.location.hash) : null;

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
      condition: row.condition === 'preowned' ? 'preowned' : 'new',
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
      condition: item.condition === 'preowned' ? 'preowned' : 'new',
      updated_at: new Date().toISOString(),
    };

    let { error } = await supabase.from('databank_items').upsert(payload);
    if (error && /condition/i.test(error.message)) {
      // The "condition" column has not been added yet (supabase/databank_condition.sql). Save everything else.
      console.warn('[Supabase] databank_items has no "condition" column yet — run supabase/databank_condition.sql');
      const { condition: _omit, ...rest } = payload;
      ({ error } = await supabase.from('databank_items').upsert(rest));
    }
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

// ─── Sourcing options (suppliers) ────────────────────────────────────────────
// Table: supabase/sourcing_options.sql. If it has not been created yet, everything keeps working on this device.

export async function fetchSourcingOptionsFromCloud(): Promise<SourcingOption[] | null> {
  try {
    const { data, error } = await supabase.from('sourcing_options').select('id, data').order('created_at', { ascending: false });
    if (error) {
      console.warn('[Supabase] sourcing_options not readable (run supabase/sourcing_options.sql):', error.message);
      return null;
    }
    if (!data || data.length === 0) return null;
    return data.map((row: any) => ({ ...(row.data as SourcingOption), id: row.id }));
  } catch (err: any) {
    console.warn('[Supabase] fetchSourcingOptionsFromCloud network error:', err.message);
    return null;
  }
}

export async function syncSourcingOptionToCloud(option: SourcingOption): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('sourcing_options')
      .upsert({ id: option.id, data: option, updated_at: new Date().toISOString() });
    if (error) {
      console.warn('[Supabase] syncSourcingOptionToCloud error:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase] syncSourcingOptionToCloud network error:', err.message);
    return false;
  }
}

export async function deleteSourcingOptionFromCloud(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('sourcing_options').delete().eq('id', id);
    if (error) {
      console.warn('[Supabase] deleteSourcingOptionFromCloud error:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase] deleteSourcingOptionFromCloud network error:', err.message);
    return false;
  }
}

// ─── Case Tracker ────────────────────────────────────────────────────────────
// Table: supabase/project_cases.sql. If it is missing, the tracker keeps working on this device.

export async function fetchProjectCasesFromCloud(): Promise<ProjectCase[] | null> {
  try {
    const { data, error } = await supabase.from('project_cases').select('id, owner_email, data');
    if (error) {
      console.warn('[Supabase] project_cases not readable (run supabase/project_cases.sql):', error.message);
      return null;
    }
    if (!data || data.length === 0) return null;
    return data.map((row: any) => ({ ...(row.data as ProjectCase), id: row.id, ownerEmail: row.owner_email }));
  } catch (err: any) {
    console.warn('[Supabase] fetchProjectCasesFromCloud network error:', err.message);
    return null;
  }
}

export async function syncProjectCaseToCloud(c: ProjectCase): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('project_cases')
      .upsert({ id: c.id, owner_email: c.ownerEmail, data: c, updated_at: c.updatedAt });
    if (error) {
      console.warn('[Supabase] syncProjectCaseToCloud error:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase] syncProjectCaseToCloud network error:', err.message);
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


/** Saves one person's feature switches and quote-number range. Returns false if the cloud refused it. */
export async function syncTeamMemberFeaturesToCloud(userId: string, features: User['features']): Promise<boolean> {
  try {
    const { data, error } = await supabase.from('team_members').update({ features }).eq('id', userId).select('id');
    if (error) {
      console.warn('[Supabase] syncTeamMemberFeaturesToCloud error:', error.message);
      return false;
    }
    // A database that refuses the change by policy answers "no error" with zero rows changed.
    if (!data || data.length === 0) {
      console.warn('[Supabase] syncTeamMemberFeaturesToCloud: no row was changed (not allowed, or the person is not in the cloud list).');
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase] syncTeamMemberFeaturesToCloud network error:', err.message);
    return false;
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
