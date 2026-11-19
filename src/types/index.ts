// ==============================================================================
// Qri Agentic Procurement OS - Core Domain Types
// ==============================================================================

import type { QuoteRange } from '../lib/quote-range';
export type { QuoteRange };

export type UserRole = 'Super Admin' | 'Admin' | 'Procurement Engineer' | 'Viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  features: {
    directPdfExport: boolean;
    dataBankWrite: boolean;
    marginOverride: boolean;
    whatsappBot: boolean;
    quoteRange?: QuoteRange; // quotation numbers this person may issue (admin-assigned)
  };
}

/** Internal only. Customers never see this; it is never printed on a quote or Word file. */
export type ItemCondition = 'new' | 'preowned';

export interface DataBankItem {
  id: string;
  company: string; // Supplier name
  machineName: string; // Machine/Instrument / SKU
  pricePKR: number; // Unit price in PKR
  lastCheckedDate: string; // YYYY-MM-DD
  category?: string;
  notes?: string;
  condition?: ItemCondition; // missing = 'new'
}

export interface QuoteLineItem {
  id: string;
  description: string;
  brand: string;
  partNumber: string;
  qty: number;
  uom: string; // PCS, NOS, SET, MTR
  unitCost: number; // Supplier cost from data bank
  marginPct: number; // e.g. 15%
  unitPrice: number; // Selling unit price after margin
  total: number; // qty * unitPrice
  dataBankId?: string; // Data Bank row the cost came from (traceability)
  costSource?: 'databank' | 'user' | 'picture'; // 'user' = typed by a person; 'picture' = read by the AI from an attached picture (a person must check it)
  pictureNote?: string; // for 'picture': the exact text the AI says it read, shown next to the line so a person can compare
  pictureChecked?: boolean; // a person compared the price with the picture
  preowned?: boolean; // INTERNAL: copied from the Data Bank item. Never printed or sent to the customer.
  ratePending?: boolean; // the supplier rate has not come yet; the quote cannot be downloaded until it does
}

export type WaitingReason = 'rate_pending' | 'ceo_confirming' | 'client_clarification' | 'market_news' | 'other';

/** Why a quote is on hold, who has the next move, and when to look at it again. */
export interface WaitingInfo {
  reason: WaitingReason;
  note: string;
  owner: string; // name of the person who has the next move
  followUp: string | null; // YYYY-MM-DD
  since: string; // ISO time the hold started
  by: string; // who put it on hold
}

export interface LifecycleEvent { at: string; by: string; text: string }

/** A request for one named colleague to approve a quote before it can be downloaded. */
export interface ApprovalInfo {
  requestedFromId: string;
  requestedFromName: string;
  requestedById: string;
  requestedByName: string;
  requestedAt: string; // ISO
  status: 'awaiting' | 'approved' | 'sent_back';
  note?: string; // the approver's note when sending back, or the requester's message
  decidedAt?: string; // ISO
  decidedByName?: string;
  fingerprint?: string; // what was approved. If the quote no longer matches, the approval no longer counts.
}

/** Life of a quote beyond its content. Stored inside the quote (no database change). */
export interface Lifecycle {
  ownerId?: string;
  ownerName?: string;
  waiting?: WaitingInfo | null;
  approval?: ApprovalInfo | null;
  archived?: { at: string; by: string } | null;
  pricesConfirmedAt?: string; // YYYY-MM-DD, set when someone rechecks the prices
  log?: LifecycleEvent[];
}

/**
 * The quote *data* for one case. The letterhead, standing T&Cs and signatory are
 * NOT part of it: they come from the admin-published OfficeTemplate and are
 * rendered at display time. `notes` holds only extra terms specific to this quote.
 */
export interface QuotationTemplate {
  templateVersion?: number; // OfficeTemplate.version this quote was made with
  quoteRef: string;
  date: string;
  validityDays: number;
  clientName: string;
  clientContact: string;
  deliveryTerms: string;
  paymentTerms: string;
  currency: 'PKR' | 'USD';
  taxMode: 'WITHOUT_GST' | 'GST_18' | 'CUSTOM';
  customTaxPct: number;
  lineItems: QuoteLineItem[];
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
  notes: string[];
  lifecycle?: Lifecycle;
  subject?: string; // Word-master quotes: the SUBJECT line (never taken from the sample)
  greeting?: string; // Word-master quotes: undefined = keep the master's greeting
  intro?: string; // Word-master quotes: undefined = keep the master's opening paragraph
  terms?: string[]; // this quote's own copy of the standing terms; the maker may edit or remove them. Starts as the company's standard terms.
}

export interface QuotationCase {
  id: string;
  caseRef: string;
  clientName: string;
  status: 'Draft' | 'Sourcing' | 'Completed';
  createdAt: string;
  totalPKR: number;
  itemCount: number;
  templateState: QuotationTemplate;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent' | 'system';
  text: string;
  timestamp: string;
  suggestedActions?: string[];
  systemLog?: string;
}

export interface AgentApiResponse {
  chat_response: string;
  template_state: QuotationTemplate;
  system_log?: string;
  compliance_warning?: string;
}

export interface TemplateSettingsState {
  globalLetterheadPdf: string | null;
  letterheadFileName: string;
  masterTemplateRules: string;
  lastUpdated: string;
}

// ─── Smart RFQ Dispatcher & Sourcing Automation ─────────────────────────────

export interface SourcingSupplier {
  id: string;
  companyName: string;
  contactPerson?: string;
  email: string;
  phone?: string;
  categories: string[];
  city?: string;
}

export interface SourcingRfqItem {
  id: string;
  description: string;
  brand?: string;
  partNumber?: string;
  qty: number;
  uom: string;
  specs?: string;
}

export interface SourcingDispatchPackage {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierEmail: string;
  supplierContact?: string;
  matchedItems: SourcingRfqItem[];
  subject: string;
  body: string;
  fitReason: string;
  status: 'draft' | 'dispatched' | 'skipped';
  dispatchedAt?: string;
}

// ─── Office Template (admin-published; quotes can never change it) ───────────

/** Optional business rules. `null` means "no rule set" — nothing is ever assumed. */
export interface TemplateRules {
  defaultMarginPct: number | null;
  minMarginPct: number | null;
  defaultValidityDays: number | null;
  maxValidityDays: number | null;
  maxCreditDays: number | null;
}

export interface OfficeTemplate {
  version: number;
  publishedAt: string;
  publishedBy: string;
  sourceDocName: string; // the sample quotation it was set up from
  letterhead: {
    lines: string[]; // header text, verbatim from the sample
    logoDataUrl: string | null;
    backgroundPdfDataUrl: string | null; // pre-printed letterhead used as page background
    backgroundPdfName: string;
    footerLines: string[];
  };
  signatory: { company: string; name: string; designation: string };
  terms: string[]; // standing T&Cs, verbatim, in order
  refHint: string; // free-text hint for the quote number format, e.g. "MBH-QT-2026-###"
  taxStatement: string; // printed under the totals
  rules: TemplateRules;
  /** The approved Word file. When present, quotations are made by filling it, so the document is exactly the company's own. */
  masterDocxBase64?: string;
  master?: { greeting: string; intro: string; dateFormat: 'DD-MM-YYYY' | 'YYYY-MM-DD' | 'DD/MM/YYYY'; pagesDigits: number };
}

export type CheckSeverity = 'block' | 'warn';

export interface QuoteCheck {
  severity: CheckSeverity;
  code: string;
  message: string; // plain language, shown to employees
  lineId?: string;
}
