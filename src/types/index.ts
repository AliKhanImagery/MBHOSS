// ==============================================================================
// Qri Agentic Procurement OS - Core Domain Types
// ==============================================================================

export type UserRole = 'Super Admin' | 'Procurement Engineer' | 'Viewer';

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
  };
}

export interface DataBankItem {
  id: string;
  company: string; // Supplier name
  machineName: string; // Machine/Instrument / SKU
  pricePKR: number; // Unit price in PKR
  lastCheckedDate: string; // YYYY-MM-DD
  category?: string;
  notes?: string;
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
}

export interface QuotationTemplate {
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
}
