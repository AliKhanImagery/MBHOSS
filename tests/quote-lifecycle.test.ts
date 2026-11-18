import { test } from 'node:test';
import assert from 'node:assert/strict';
import { archive, attentionList, canArchive, canDeleteForever, confirmPrices, followUpState, hold, lifecycleChecks, priceAgeDays, restore, resume, validUntil, withOwner } from '../src/lib/quote-lifecycle';
import { blankQuote } from '../src/lib/quote-engine';
import type { QuotationCase, QuotationTemplate } from '../src/types';

const now = new Date('2026-11-18T10:00:00Z');
const owner = { id: 'u1', name: 'Sara', role: 'Procurement Engineer' };
const other = { id: 'u2', name: 'Bilal', role: 'Procurement Engineer' };
const admin = { id: 'u3', name: 'Ali', role: 'Super Admin' };
const quote = (over: Partial<QuotationTemplate> = {}): QuotationTemplate => ({ ...blankQuote(null), date: '2026-11-18', quoteRef: 'Q1', clientName: 'X', ...over });
const caseOf = (q: QuotationTemplate, status: QuotationCase['status'] = 'Draft'): QuotationCase => ({ id: q.quoteRef, caseRef: q.quoteRef, clientName: q.clientName, status, createdAt: q.date, totalPKR: 0, itemCount: 0, templateState: q });

test('owner is set once and never overwritten', () => {
  const a = withOwner(undefined, owner);
  assert.equal(withOwner(a, other).ownerId, 'u1');
});

test('who may archive / delete for good', () => {
  const lc = withOwner(undefined, owner);
  assert.ok(canArchive(lc, owner) && canArchive(lc, admin));
  assert.ok(!canArchive(lc, other));
  assert.ok(!canArchive(undefined, owner), 'a quote with no recorded owner is admin-only');
  assert.ok(canArchive(undefined, admin));
  assert.ok(!canDeleteForever(lc, admin), 'must be archived first');
  assert.ok(canDeleteForever(archive(lc, owner, now), admin));
  assert.ok(!canDeleteForever(archive(lc, owner, now), owner), 'only admins delete for good');
});

test('archive and restore are reversible and logged', () => {
  const a = archive(withOwner(undefined, owner), owner, now);
  assert.ok(a.archived);
  const r = restore(a, owner, now);
  assert.equal(r.archived, null);
  assert.deepEqual(r.log?.map((e) => e.text), ['Archived', 'Restored from archive']);
});

test('hold keeps its original start time when edited, and resume clears it', () => {
  const h1 = hold(undefined, { reason: 'ceo_confirming', note: 'wait for news', owner: 'Ali', followUp: '2026-11-21' }, owner, now);
  const later = new Date('2026-11-19T10:00:00Z');
  const h2 = hold(h1, { reason: 'rate_pending', note: '', owner: '', followUp: 'not a date' }, other, later);
  assert.equal(h2.waiting?.since, h1.waiting?.since);
  assert.equal(h2.waiting?.followUp, null);
  assert.equal(h2.waiting?.owner, 'Bilal');
  assert.equal(resume(h2, owner, later).waiting, null);
});

test('follow-up states', () => {
  const w = { reason: 'other' as const, note: '', owner: '', followUp: '2026-11-18', since: now.toISOString(), by: 'x' };
  assert.equal(followUpState(w, '2026-11-17'), 'upcoming');
  assert.equal(followUpState(w, '2026-11-18'), 'today');
  assert.equal(followUpState(w, '2026-11-19'), 'overdue');
  assert.equal(followUpState({ ...w, followUp: null }, '2026-11-19'), 'none');
});

test('price age counts from the quote date or the last recheck', () => {
  const q = quote({ date: '2026-11-01' });
  assert.equal(priceAgeDays(q, '2026-11-18'), 17);
  const c = { ...q, lifecycle: confirmPrices(undefined, owner, now) };
  assert.equal(priceAgeDays(c, '2026-11-18'), 0);
});

test('checks: pending rate blocks, stale warns, passed validity warns, hold warns', () => {
  const l = { id: 'a', description: 'd', brand: '', partNumber: '', qty: 1, uom: 'PCS', unitCost: 0, marginPct: 0, unitPrice: 0, total: 0, ratePending: true };
  const q = quote({ date: '2026-10-10', validityDays: 7, lineItems: [l], lifecycle: hold(undefined, { reason: 'ceo_confirming', note: '', owner: '', followUp: null }, owner, now) });
  const codes = lifecycleChecks(q, '2026-11-18').map((c) => `${c.severity}:${c.code}`);
  assert.deepEqual(codes.sort(), ['block:rate_pending', 'warn:on_hold', 'warn:stale_prices', 'warn:validity_passed']);
  assert.equal(lifecycleChecks(quote(), '2026-11-18').length, 0);
  // 17 days old is still fresh under the 30-day rule
  const fresh = quote({ date: '2026-11-01', lineItems: [{ ...l, ratePending: false, unitPrice: 5, total: 5 }] });
  assert.equal(lifecycleChecks(fresh, '2026-11-18').length, 0);
});

test('validUntil needs both a date and validity', () => {
  assert.equal(validUntil({ date: '2026-11-18', validityDays: 7 }), '2026-11-25');
  assert.equal(validUntil({ date: '2026-11-18', validityDays: 0 }), null);
});

test('attention list: overdue first, skips archived and completed', () => {
  const held = (followUp: string | null) => hold(undefined, { reason: 'rate_pending', note: '', owner: 'Sara', followUp }, owner, new Date('2026-11-10T00:00:00Z'));
  const a = caseOf(quote({ quoteRef: 'A', lifecycle: held('2026-11-17') }));
  const b = caseOf(quote({ quoteRef: 'B', lifecycle: held('2026-11-18') }));
  const c = caseOf(quote({ quoteRef: 'C', date: '2026-11-10', validityDays: 9 })); // ends 2026-11-19 -> expiring
  const d = caseOf(quote({ quoteRef: 'D', lifecycle: archive(held('2026-11-01'), owner, now) }));
  const e = caseOf(quote({ quoteRef: 'E', lifecycle: held('2026-11-01') }), 'Completed');
  const list = attentionList([c, b, a, d, e], '2026-11-18');
  assert.deepEqual(list.map((i) => `${i.caseRef}:${i.kind}`), ['A:overdue', 'B:today', 'C:expiring']);
});
