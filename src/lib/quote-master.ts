// ==============================================================================
// Bridge between a quote (what people edit in the app) and the admin's Word master.
// Pure functions only, so they are easy to test.
//
// Nothing is invented here: a value is written into the document only when the person
// (or the assistant, on their instruction) set it. Text that still comes from the sample
// quotation the master was made from is flagged instead of being passed off as new.
// ==============================================================================

import type { OfficeTemplate, QuoteCheck, QuotationTemplate } from '../types';
import type { FillData } from './docx-master';

export const MASTER_FILE_MARK = 'MASTER_DOCX|';

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

/** Put the quote's Delivery / Payment / Validity values into the matching standing terms.
 *  Only values somebody actually set are written; a standing term is never blanked. */
export function syncTerms(
  terms: string[],
  q: Pick<QuotationTemplate, 'deliveryTerms' | 'paymentTerms' | 'validityDays'>,
  defaultValidityDays: number | null,
): string[] {
  const delivery = norm(q.deliveryTerms);
  const payment = norm(q.paymentTerms);
  const validityChanged = q.validityDays > 0 && q.validityDays !== (defaultValidityDays ?? 0);
  return terms.map((t) => {
    if (payment && /^payment/i.test(t.trim())) return `Payment Terms: ${payment}`;
    if (delivery && /^delivery/i.test(t.trim())) return `Delivery: ${delivery}`;
    if (validityChanged && /^validity/i.test(t.trim()) && /\d+\s*days?/i.test(t)) {
      return t.replace(/\d+(\s*days?)/i, `${q.validityDays}$1`);
    }
    return t;
  });
}

export function buildFillData(q: QuotationTemplate, t: OfficeTemplate, fromName: string, pagesCached?: string): FillData {
  const terms = syncTerms(q.terms ?? t.terms, q, t.rules.defaultValidityDays).filter((x) => x.trim());
  const withTax = q.taxAmount > 0;
  return {
    info: {
      to: q.clientName,
      from: fromName,
      attn: q.clientContact,
      ref: q.quoteRef,
      date: q.date,
      subject: q.subject ?? '',
    },
    // undefined keeps the master's own wording
    greeting: q.greeting,
    intro: q.intro,
    items: q.lineItems.map((l) => ({
      description: [l.description, [l.brand, l.partNumber].filter(Boolean).join(' ')].filter(Boolean).join(' – '),
      uom: l.uom,
      qty: l.qty,
      unitPrice: l.unitPrice,
      total: l.total,
    })),
    subtotal: q.subtotal,
    grandTotal: withTax ? q.grandTotal : q.subtotal,
    terms,
    ...(pagesCached ? { pagesCached } : {}),
  };
}

/** Extra checks that only apply when the quote is made on a Word master. */
export function masterChecks(q: QuotationTemplate, t: OfficeTemplate): QuoteCheck[] {
  const out: QuoteCheck[] = [];
  if (!norm(q.subject ?? '')) {
    out.push({ severity: 'block', code: 'master_no_subject', message: 'Add the subject line. The sample’s subject is not reused.' });
  }
  const sample = t.master?.intro ?? '';
  if (q.intro === undefined && sample) {
    out.push({ severity: 'warn', code: 'master_sample_intro', message: 'The opening paragraph is still the one from the sample quotation. Check it fits this quote.' });
  }
  if (q.taxAmount > 0) {
    out.push({ severity: 'block', code: 'master_tax', message: 'Your Word template has no tax line (its terms say prices exclude taxes). Set tax to “Without GST”.' });
  }
  return out;
}

// ─── storing the Word file as text (so it can sit in the template and the cloud) ───

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) bin += String.fromCharCode(...bytes.subarray(i, i + step));
  return btoa(bin);
}

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
