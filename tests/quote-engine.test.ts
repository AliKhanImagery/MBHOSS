import test from 'node:test';
import assert from 'node:assert/strict';
import { applyOps, blankQuote, checkQuote, costStatedByUser, recalc } from '../src/lib/quote-engine';
import type { DataBankItem, TemplateRules } from '../src/types';

const rules: TemplateRules = {
  defaultMarginPct: null,
  minMarginPct: null,
  defaultValidityDays: null,
  maxValidityDays: null,
  maxCreditDays: null,
};
const bank: DataBankItem[] = [
  { id: 'db1', company: 'Acme', machineName: 'Gear Pump (GP-100)', pricePKR: 10000, lastCheckedDate: '2026-01-01' },
  { id: 'db2', company: 'Acme', machineName: 'No Price Item', pricePKR: 0, lastCheckedDate: '2026-01-01' },
];
let n = 0;
const ctx = (instruction: string, r: TemplateRules = rules) => ({
  dataBank: bank, rules: r, instruction, newId: () => `L${++n}`,
});

test('costStatedByUser finds 14,500 / 14500 / 14.5k but not other numbers', () => {
  assert.ok(costStatedByUser('cost is 14,500 each', 14500));
  assert.ok(costStatedByUser('cost 14500', 14500));
  assert.ok(costStatedByUser('about 14.5k', 14500));
  assert.ok(!costStatedByUser('cost 14500', 1450));
  assert.ok(!costStatedByUser('no numbers here', 100));
});

test('add_line from Data Bank prices correctly and records source', () => {
  const out = applyOps(blankQuote(rules), [{ op: 'add_line', dataBankId: 'db1', qty: 3, marginPct: 20 }], ctx('add 3 pumps at 20% margin'));
  assert.equal(out.results[0].status, 'applied');
  const l = out.quote.lineItems[0];
  assert.equal(l.unitPrice, 12000);
  assert.equal(l.total, 36000);
  assert.equal(l.costSource, 'databank');
  assert.equal(out.quote.grandTotal, 36000);
  assert.equal(l.partNumber, 'GP-100');
});

test('missing qty or margin asks a question instead of guessing', () => {
  const a = applyOps(blankQuote(rules), [{ op: 'add_line', dataBankId: 'db1', marginPct: 20 }], ctx('add pump'));
  assert.equal(a.results[0].status, 'needs_input');
  assert.equal(a.quote.lineItems.length, 0);
  const b = applyOps(blankQuote(rules), [{ op: 'add_line', dataBankId: 'db1', qty: 2 }], ctx('add 2 pumps'));
  assert.equal(b.results[0].status, 'needs_input');
  assert.match(b.questions[0], /margin/i);
});

test('default margin from admin rules is used only when set', () => {
  const r = { ...rules, defaultMarginPct: 15 };
  const out = applyOps(blankQuote(r), [{ op: 'add_line', dataBankId: 'db1', qty: 1 }], ctx('add 1 pump', r));
  assert.equal(out.quote.lineItems[0].unitPrice, 11500);
});

test('unknown data bank id and unpriced items are rejected', () => {
  const a = applyOps(blankQuote(rules), [{ op: 'add_line', dataBankId: 'nope', qty: 1, marginPct: 10 }], ctx('x'));
  assert.equal(a.results[0].status, 'rejected');
  const b = applyOps(blankQuote(rules), [{ op: 'add_line', dataBankId: 'db2', qty: 1, marginPct: 10 }], ctx('x'));
  assert.equal(b.results[0].status, 'rejected');
});

test('manual item: price must be one the user typed', () => {
  const bad = applyOps(blankQuote(rules), [{ op: 'add_line', description: 'Valve', qty: 1, marginPct: 10, unitCost: 5000 }], ctx('add a valve at 10% margin'));
  assert.equal(bad.results[0].status, 'rejected');
  assert.equal(bad.quote.lineItems.length, 0);
  const ok = applyOps(blankQuote(rules), [{ op: 'add_line', description: 'Valve', qty: 2, marginPct: 10, unitCost: 5000 }], ctx('add 2 valves, cost 5,000, 10% margin'));
  assert.equal(ok.results[0].status, 'applied');
  assert.equal(ok.quote.lineItems[0].costSource, 'user');
  assert.equal(ok.quote.lineItems[0].unitPrice, 5500);
});

test('invented brand is dropped, brand present in user words is kept', () => {
  const a = applyOps(blankQuote(rules), [{ op: 'add_line', dataBankId: 'db1', qty: 1, marginPct: 10, brand: 'Grundfos' }], ctx('add pump'));
  assert.equal(a.quote.lineItems[0].brand, '');
  const b = applyOps(blankQuote(rules), [{ op: 'add_line', description: 'Valve', qty: 1, marginPct: 10, unitCost: 100, brand: 'Burkert' }], ctx('valve Burkert cost 100 margin 10%'));
  assert.equal(b.quote.lineItems[0].brand, 'Burkert');
});

test('duplicate bank item asks instead of adding twice', () => {
  const q1 = applyOps(blankQuote(rules), [{ op: 'add_line', dataBankId: 'db1', qty: 1, marginPct: 10 }], ctx('x')).quote;
  const q2 = applyOps(q1, [{ op: 'add_line', dataBankId: 'db1', qty: 1, marginPct: 10 }], ctx('x'));
  assert.equal(q2.results[0].status, 'needs_input');
  assert.equal(q2.quote.lineItems.length, 1);
});

test('update_line, set_all_margins, remove_line recompute totals', () => {
  let q = applyOps(blankQuote(rules), [{ op: 'add_line', dataBankId: 'db1', qty: 2, marginPct: 10 }], ctx('x')).quote;
  const id = q.lineItems[0].id;
  q = applyOps(q, [{ op: 'update_line', lineId: id, qty: 5 }], ctx('x')).quote;
  assert.equal(q.grandTotal, 55000);
  q = applyOps(q, [{ op: 'set_all_margins', marginPct: 20 }], ctx('x')).quote;
  assert.equal(q.grandTotal, 60000);
  q = applyOps(q, [{ op: 'remove_line', lineId: id }], ctx('x')).quote;
  assert.equal(q.grandTotal, 0);
});

test('tax is always zero and mode is without GST', () => {
  const q = recalc({ ...blankQuote(rules), taxMode: 'WITH_GST' as never, customTaxPct: 18 });
  assert.equal(q.taxAmount, 0);
  assert.equal(q.taxMode, 'WITHOUT_GST');
});

test('checks: blocking items and rule-driven warnings', () => {
  const empty = checkQuote(blankQuote(rules), rules);
  assert.ok(empty.some((c) => c.code === 'no_client' && c.severity === 'block'));
  assert.ok(empty.some((c) => c.code === 'no_lines'));
  const r = { ...rules, minMarginPct: 15, maxValidityDays: 30, maxCreditDays: 30 };
  let q = applyOps(blankQuote(r), [{ op: 'add_line', dataBankId: 'db1', qty: 1, marginPct: 5 }, { op: 'set_terms', validityDays: 60, paymentTerms: '45 days credit' }], ctx('x', r)).quote;
  q = { ...q, clientName: 'C', quoteRef: 'Q1' };
  const codes = checkQuote(q, r).map((c) => c.code);
  assert.ok(codes.includes('low_margin') && codes.includes('long_validity') && codes.includes('long_credit'));
  assert.ok(!checkQuote(q, rules).some((c) => c.severity === 'warn' && ['low_margin', 'long_validity', 'long_credit'].includes(c.code)));
});

test('terms can be reworded and removed for one quote, nothing else changes', async () => {
  const { applyOps, blankQuote } = await import('../src/lib/quote-engine');
  const rules = { defaultMarginPct: null, minMarginPct: null, defaultValidityDays: null, maxValidityDays: null, maxCreditDays: null };
  const q0 = blankQuote(rules, 1, ['Prices in PKR.', 'Delivery: 2-3 weeks.', 'Force majeure applies.']);
  const out = applyOps(q0, [{ op: 'edit_term', index: 1, text: 'Delivery: 4-5 weeks.' }, { op: 'remove_term', index: 2 }], { dataBank: [], rules, instruction: '' });
  assert.deepEqual(out.quote.terms, ['Prices in PKR.', 'Delivery: 4-5 weeks.']);
  assert.deepEqual(q0.terms, ['Prices in PKR.', 'Delivery: 2-3 weeks.', 'Force majeure applies.']); // original untouched
  const bad = applyOps(q0, [{ op: 'remove_term', index: 9 }, { op: 'edit_term', index: 0, text: '  ' }], { dataBank: [], rules, instruction: '' });
  assert.equal(bad.results.filter((r) => r.status === 'rejected').length, 2);
});
