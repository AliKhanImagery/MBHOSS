// ==============================================================================
// Quote engine — the ONLY thing allowed to change a quote.
//
// The AI agent proposes `QuoteOp`s; this module validates and applies them,
// does all the arithmetic, and runs the company checks. It never invents data:
//   • prices come from the Data Bank (by id) or from numbers the user typed
//   • missing quantities / margins are asked for, never assumed
//   • brand / part numbers must literally appear in the Data Bank entry or the
//     user's own words
// It is pure (no I/O), so it is cheap to unit-test.
// ==============================================================================

import type {
  DataBankItem,
  QuoteCheck,
  QuoteLineItem,
  QuotationTemplate,
  TemplateRules,
} from '../types';

// ─── Ops the agent may propose ───────────────────────────────────────────────

export type QuoteOp =
  | { op: 'set_client'; clientName?: string; clientContact?: string }
  | { op: 'set_terms'; deliveryTerms?: string; paymentTerms?: string; validityDays?: number }
  | {
      op: 'add_line';
      dataBankId?: string;
      qty?: number;
      marginPct?: number;
      uom?: string;
      description?: string;
      brand?: string;
      partNumber?: string;
      unitCost?: number;
    }
  | {
      op: 'update_line';
      lineId: string;
      qty?: number;
      marginPct?: number;
      unitCost?: number;
      description?: string;
      uom?: string;
    }
  | { op: 'set_all_margins'; marginPct: number }
  | { op: 'remove_line'; lineId: string }
  | { op: 'add_extra_term'; text: string }
  | { op: 'remove_extra_term'; index: number }
  | { op: 'edit_term'; index: number; text: string }
  | { op: 'remove_term'; index: number };

export interface ApplyContext {
  dataBank: DataBankItem[];
  rules: TemplateRules;
  /** The user's own words for this request — used to verify any price the AI says they stated. */
  instruction: string;
  newId?: () => string;
}

export interface OpResult {
  index: number;
  op: string;
  status: 'applied' | 'rejected' | 'needs_input';
  message: string;
}

export interface ApplyOutcome {
  quote: QuotationTemplate;
  results: OpResult[];
  /** Human-readable list of what actually changed. */
  changes: string[];
  /** Plain questions for the user (from needs_input results). */
  questions: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const formatPKR = (n: number): string =>
  new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(Math.round(n || 0));

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const clean = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';

/** Does `cost` literally appear as a number in what the user typed? ("14,500", "14500", "14.5k") */
export function costStatedByUser(instruction: string, cost: number): boolean {
  const re = /(\d[\d,]*(?:\.\d+)?)\s*(k)?(?![\d])/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(instruction)) !== null) {
    let n = parseFloat(m[1].replace(/,/g, ''));
    if (!Number.isFinite(n)) continue;
    if (m[2]) n *= 1000;
    if (Math.abs(n - cost) < 0.005) return true;
  }
  return false;
}

const appearsIn = (needle: string, haystack: string): boolean =>
  needle.length > 0 && haystack.toLowerCase().includes(needle.toLowerCase());

const defaultId = (): string => `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// ─── Arithmetic ──────────────────────────────────────────────────────────────

/** Selling price from supplier cost + margin. */
export function priceFromCost(cost: number, marginPct: number): number {
  return Math.round(cost * (1 + marginPct / 100));
}

/**
 * Recomputes line totals and quote totals from the unit prices. Quotes always
 * state that the total excludes GST and taxes, so tax is always zero here.
 */
export function recalc(q: QuotationTemplate): QuotationTemplate {
  const lineItems = q.lineItems.map((l) => ({
    ...l,
    total: Math.round((l.qty || 0) * (l.unitPrice || 0)),
  }));
  const subtotal = lineItems.reduce((acc, l) => acc + l.total, 0);
  return {
    ...q,
    lineItems,
    taxMode: 'WITHOUT_GST',
    customTaxPct: 0,
    subtotal,
    taxAmount: 0,
    grandTotal: subtotal,
  };
}

/** A fresh, empty quote. Nothing but the date and (optional) default validity is pre-filled. */
export function blankQuote(rules: TemplateRules | null, templateVersion?: number, terms?: string[]): QuotationTemplate {
  return {
    ...(terms ? { terms: [...terms] } : {}),
    templateVersion,
    quoteRef: '',
    date: new Date().toISOString().split('T')[0],
    validityDays: rules?.defaultValidityDays ?? 0,
    clientName: '',
    clientContact: '',
    deliveryTerms: '',
    paymentTerms: '',
    currency: 'PKR',
    taxMode: 'WITHOUT_GST',
    customTaxPct: 0,
    lineItems: [],
    subtotal: 0,
    taxAmount: 0,
    grandTotal: 0,
    notes: [],
  };
}

// ─── Applying ops ────────────────────────────────────────────────────────────

export function applyOps(start: QuotationTemplate, ops: QuoteOp[], ctx: ApplyContext): ApplyOutcome {
  let q: QuotationTemplate = {
    ...start,
    lineItems: start.lineItems.map((l) => ({ ...l })),
    notes: [...start.notes],
    ...(start.terms ? { terms: [...start.terms] } : {}),
  };
  const results: OpResult[] = [];
  const changes: string[] = [];
  const questions: string[] = [];
  const newId = ctx.newId ?? defaultId;

  const done = (i: number, op: string, message: string) => {
    results.push({ index: i, op, status: 'applied', message });
    changes.push(message);
  };
  const reject = (i: number, op: string, message: string) =>
    results.push({ index: i, op, status: 'rejected', message });
  const ask = (i: number, op: string, question: string) => {
    results.push({ index: i, op, status: 'needs_input', message: question });
    questions.push(question);
  };

  const findLine = (id: unknown) => q.lineItems.find((l) => l.id === id);
  const lineNo = (id: string) => q.lineItems.findIndex((l) => l.id === id) + 1;

  ops.forEach((raw, i) => {
    const op = raw as QuoteOp;
    switch (op?.op) {
      case 'set_client': {
        const name = clean(op.clientName, 120);
        const contact = clean(op.clientContact, 160);
        if (!name && !contact) return reject(i, 'set_client', 'No client name or contact was given.');
        if (name) q.clientName = name;
        if (contact) q.clientContact = contact;
        return done(i, 'set_client', `Client set to ${[name, contact].filter(Boolean).join(' — ')}.`);
      }

      case 'set_terms': {
        const parts: string[] = [];
        const delivery = clean(op.deliveryTerms, 200);
        const payment = clean(op.paymentTerms, 200);
        if (delivery) {
          q.deliveryTerms = delivery;
          parts.push(`delivery: ${delivery}`);
        }
        if (payment) {
          q.paymentTerms = payment;
          parts.push(`payment: ${payment}`);
        }
        if (op.validityDays !== undefined) {
          if (!isNum(op.validityDays) || op.validityDays < 1 || op.validityDays > 365) {
            return reject(i, 'set_terms', 'Validity must be between 1 and 365 days.');
          }
          q.validityDays = Math.round(op.validityDays);
          parts.push(`valid for ${q.validityDays} days`);
        }
        if (parts.length === 0) return reject(i, 'set_terms', 'No terms were given.');
        return done(i, 'set_terms', `Terms updated — ${parts.join('; ')}.`);
      }

      case 'add_line': {
        let marginPct = op.marginPct;
        if (marginPct === undefined) marginPct = ctx.rules.defaultMarginPct ?? undefined;
        const label = clean(op.description, 80) || 'this item';

        let bankItem: DataBankItem | undefined;
        if (op.dataBankId !== undefined) {
          bankItem = ctx.dataBank.find((d) => d.id === op.dataBankId);
          if (!bankItem) return reject(i, 'add_line', `There is no Data Bank item with id "${op.dataBankId}".`);
          if (!(bankItem.pricePKR > 0)) {
            return reject(i, 'add_line', `"${bankItem.machineName}" has no price in the Data Bank.`);
          }
          const existing = q.lineItems.find((l) => l.dataBankId === bankItem!.id);
          if (existing) {
            return ask(
              i,
              'add_line',
              `"${bankItem.machineName}" is already on the quote (line ${lineNo(existing.id)}). Do you want to change its quantity instead?`
            );
          }
        }

        const itemName = bankItem ? bankItem.machineName : label;
        if (!isNum(op.qty) || op.qty <= 0) return ask(i, 'add_line', `How many of "${itemName}" should I add?`);
        if (op.qty > 1_000_000) return reject(i, 'add_line', 'That quantity looks wrong.');
        if (!isNum(marginPct)) return ask(i, 'add_line', `What margin (%) should I use for "${itemName}"?`);
        if (marginPct < 0 || marginPct > 200) return reject(i, 'add_line', 'Margin must be between 0% and 200%.');

        let unitCost: number;
        let description: string;
        let costSource: 'databank' | 'user';
        let brand = '';
        let partNumber = '';

        if (bankItem) {
          unitCost = bankItem.pricePKR;
          description = bankItem.machineName;
          costSource = 'databank';
          const source = `${bankItem.machineName} ${bankItem.company}`;
          if (appearsIn(clean(op.brand, 60), source)) brand = clean(op.brand, 60);
          const fromParens = bankItem.machineName.match(/\(([^)]+)\)/)?.[1] ?? '';
          partNumber = appearsIn(clean(op.partNumber, 60), source) ? clean(op.partNumber, 60) : fromParens;
        } else {
          description = clean(op.description, 200);
          if (!description) return reject(i, 'add_line', 'An item needs a description or a Data Bank match.');
          if (!isNum(op.unitCost) || op.unitCost <= 0) {
            return ask(i, 'add_line', `"${description}" is not in the Data Bank. What is its cost price?`);
          }
          if (!costStatedByUser(ctx.instruction, op.unitCost)) {
            return reject(
              i,
              'add_line',
              `I can only use a price from the Data Bank or one you typed yourself, so I did not add "${description}".`
            );
          }
          unitCost = op.unitCost;
          costSource = 'user';
          if (appearsIn(clean(op.brand, 60), ctx.instruction)) brand = clean(op.brand, 60);
          if (appearsIn(clean(op.partNumber, 60), ctx.instruction)) partNumber = clean(op.partNumber, 60);
        }

        const unitPrice = priceFromCost(unitCost, marginPct);
        const line: QuoteLineItem = {
          id: newId(),
          description,
          brand,
          partNumber,
          qty: op.qty,
          uom: clean(op.uom, 10).toUpperCase() || 'PCS',
          unitCost,
          marginPct,
          unitPrice,
          total: Math.round(op.qty * unitPrice),
          dataBankId: bankItem?.id,
          costSource,
          ...(bankItem?.condition === 'preowned' ? { preowned: true } : {}),
        };
        q.lineItems.push(line);
        return done(
          i,
          'add_line',
          `Added ${op.qty} × ${description} at Rs. ${formatPKR(unitPrice)} each (${marginPct}% margin).${line.preowned ? ' (Pre-owned stock — internal note, not shown to the customer.)' : ''}`
        );
      }

      case 'update_line': {
        const line = findLine(op.lineId);
        if (!line) return reject(i, 'update_line', `There is no line "${op.lineId}" on this quote.`);
        const n = lineNo(line.id);
        const notes: string[] = [];
        let repriced = false;

        if (op.qty !== undefined) {
          if (!isNum(op.qty) || op.qty <= 0 || op.qty > 1_000_000) {
            return reject(i, 'update_line', `Line ${n}: that quantity is not valid.`);
          }
          line.qty = op.qty;
          notes.push(`quantity ${op.qty}`);
        }
        if (op.marginPct !== undefined) {
          if (!isNum(op.marginPct) || op.marginPct < 0 || op.marginPct > 200) {
            return reject(i, 'update_line', `Line ${n}: margin must be between 0% and 200%.`);
          }
          line.marginPct = op.marginPct;
          repriced = true;
          notes.push(`margin ${op.marginPct}%`);
        }
        if (op.unitCost !== undefined) {
          if (!isNum(op.unitCost) || op.unitCost <= 0 || !costStatedByUser(ctx.instruction, op.unitCost)) {
            return reject(
              i,
              'update_line',
              `Line ${n}: I can only change a cost price to a number you typed yourself.`
            );
          }
          line.unitCost = op.unitCost;
          line.costSource = 'user';
          repriced = true;
          notes.push(`cost Rs. ${formatPKR(op.unitCost)}`);
        }
        if (op.description !== undefined) {
          const d = clean(op.description, 200);
          if (!d) return reject(i, 'update_line', `Line ${n}: the description cannot be empty.`);
          line.description = d;
          notes.push('description');
        }
        if (op.uom !== undefined) {
          const u = clean(op.uom, 10).toUpperCase();
          if (u) {
            line.uom = u;
            notes.push(`unit ${u}`);
          }
        }
        if (notes.length === 0) return reject(i, 'update_line', `Line ${n}: nothing to change.`);
        if (repriced && line.unitCost > 0) line.unitPrice = priceFromCost(line.unitCost, line.marginPct);
        line.total = Math.round(line.qty * line.unitPrice);
        return done(i, 'update_line', `Line ${n} (${line.description}): ${notes.join(', ')}.`);
      }

      case 'set_all_margins': {
        if (!isNum(op.marginPct) || op.marginPct < 0 || op.marginPct > 200) {
          return reject(i, 'set_all_margins', 'Margin must be between 0% and 200%.');
        }
        const priced = q.lineItems.filter((l) => l.unitCost > 0);
        if (priced.length === 0) return reject(i, 'set_all_margins', 'There are no priced lines to change.');
        priced.forEach((l) => {
          l.marginPct = op.marginPct;
          l.unitPrice = priceFromCost(l.unitCost, op.marginPct);
          l.total = Math.round(l.qty * l.unitPrice);
        });
        return done(i, 'set_all_margins', `Margin set to ${op.marginPct}% on ${priced.length} line(s).`);
      }

      case 'remove_line': {
        const line = findLine(op.lineId);
        if (!line) return reject(i, 'remove_line', `There is no line "${op.lineId}" on this quote.`);
        const n = lineNo(line.id);
        q.lineItems = q.lineItems.filter((l) => l.id !== line.id);
        return done(i, 'remove_line', `Removed line ${n} (${line.description}).`);
      }

      case 'add_extra_term': {
        const text = clean(op.text, 300);
        if (!text) return reject(i, 'add_extra_term', 'The extra term was empty.');
        q.notes.push(text);
        return done(i, 'add_extra_term', `Added an extra term for this quote: "${text}".`);
      }

      case 'remove_extra_term': {
        if (!Number.isInteger(op.index) || op.index < 0 || op.index >= q.notes.length) {
          return reject(i, 'remove_extra_term', 'There is no extra term at that position.');
        }
        const [removed] = q.notes.splice(op.index, 1);
        return done(i, 'remove_extra_term', `Removed the extra term "${removed}".`);
      }

      case 'edit_term': {
        const terms = q.terms ?? [];
        const text = clean(op.text, 300);
        if (!Number.isInteger(op.index) || op.index < 0 || op.index >= terms.length) return reject(i, 'edit_term', 'There is no term at that position.');
        if (!text) return reject(i, 'edit_term', 'The new wording was empty.');
        const before = terms[op.index];
        q.terms = terms.map((t, j) => (j === op.index ? text : t));
        return done(i, 'edit_term', `Changed term ${op.index + 1} from "${before}" to "${text}".`);
      }

      case 'remove_term': {
        const terms = q.terms ?? [];
        if (!Number.isInteger(op.index) || op.index < 0 || op.index >= terms.length) return reject(i, 'remove_term', 'There is no term at that position.');
        q.terms = terms.filter((_, j) => j !== op.index);
        return done(i, 'remove_term', `Removed term ${op.index + 1} ("${terms[op.index]}") from this quote.`);
      }

      default:
        return reject(i, String((op as { op?: unknown })?.op ?? 'unknown'), 'That action is not supported.');
    }
  });

  return { quote: recalc(q), results, changes, questions };
}

// ─── Checks (plain language, shown to employees) ─────────────────────────────

export function checkQuote(q: QuotationTemplate, rules: TemplateRules): QuoteCheck[] {
  const checks: QuoteCheck[] = [];
  const block = (code: string, message: string, lineId?: string) =>
    checks.push({ severity: 'block', code, message, lineId });
  const warn = (code: string, message: string, lineId?: string) =>
    checks.push({ severity: 'warn', code, message, lineId });

  if (!q.clientName.trim()) block('no_client', 'Add the client name.');
  if (!q.quoteRef.trim()) block('no_ref', 'Add the quotation number.');
  if (q.lineItems.length === 0) block('no_lines', 'Add at least one item.');

  q.lineItems.forEach((l, idx) => {
    const n = idx + 1;
    if (!l.description.trim()) block('no_desc', `Line ${n}: add a description.`, l.id);
    if (!(l.qty > 0)) block('bad_qty', `Line ${n}: the quantity must be more than zero.`, l.id);
    if (!(l.unitPrice > 0)) block('no_price', `Line ${n}: the price is missing.`, l.id);
    if (rules.minMarginPct !== null && l.unitCost > 0 && l.marginPct < rules.minMarginPct) {
      warn(
        'low_margin',
        `Line ${n}: margin is ${l.marginPct}%, below the company minimum of ${rules.minMarginPct}%.`,
        l.id
      );
    }
  });

  if (!q.deliveryTerms.trim()) warn('no_delivery', 'Delivery terms are empty.');
  if (!q.paymentTerms.trim()) warn('no_payment', 'Payment terms are empty.');
  if (!(q.validityDays > 0)) warn('no_validity', 'Validity (how many days the price holds) is not set.');

  if (rules.maxValidityDays !== null && q.validityDays > rules.maxValidityDays) {
    warn('long_validity', `Validity is ${q.validityDays} days; the company maximum is ${rules.maxValidityDays}.`);
  }
  if (rules.maxCreditDays !== null) {
    const days = q.paymentTerms.match(/(\d+)\s*days?/i);
    if (days && parseInt(days[1], 10) > rules.maxCreditDays) {
      warn(
        'long_credit',
        `Payment terms mention ${days[1]} days; the company maximum credit is ${rules.maxCreditDays} days.`
      );
    }
  }

  // Blocks first, then warnings, otherwise keep order.
  return checks.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'block' ? -1 : 1));
}

/**
 * Compact view of the quote for the model. With `forModel`, no cost, price or total is included:
 * the model only needs ids, quantities and margins to propose edits, and the engine does the money.
 * This keeps commercially sensitive numbers away from the AI provider (important on a free tier,
 * where the provider may use submitted content).
 */
export function summarizeQuote(q: QuotationTemplate, forModel = false): string {
  const lines = q.lineItems.length
    ? q.lineItems
        .map((l, i) =>
          forModel
            ? `  ${i + 1}. id=${l.id} | ${l.description} | qty ${l.qty} ${l.uom} | margin ${l.marginPct}%`
            : `  ${i + 1}. id=${l.id} | ${l.description} | qty ${l.qty} ${l.uom} | cost ${l.unitCost} | margin ${l.marginPct}% | unit price ${l.unitPrice} | total ${l.total}`
        )
        .join('\n')
    : '  (no items yet)';
  return [
    `Quote ref: ${q.quoteRef || '(not set)'}`,
    `Client: ${q.clientName || '(not set)'}${q.clientContact ? ` — ${q.clientContact}` : ''}`,
    `Delivery: ${q.deliveryTerms || '(not set)'}`,
    `Payment: ${q.paymentTerms || '(not set)'}`,
    `Validity days: ${q.validityDays || '(not set)'}`,
    `Items:\n${lines}`,
    ...(q.terms ? [`Terms and conditions on this quote:\n${q.terms.length ? q.terms.map((t, i) => `  [${i}] ${t}`).join('\n') : '  (none)'}`] : []),
    `Extra terms: ${q.notes.length ? q.notes.map((n, i) => `[${i}] ${n}`).join(' | ') : '(none)'}`,
    ...(forModel ? [] : [`Grand total: ${q.grandTotal} (excludes GST and taxes)`]),
  ].join('\n');
}
