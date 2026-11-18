import { test } from 'node:test';
import assert from 'node:assert/strict';
import { approvalChecks, approvalState, approve, canDecide, canDownload, canRequestApproval, cancelApproval, inboxFor, quoteFingerprint, requestApproval, sendBack } from '../src/lib/quote-approval';
import { blankQuote } from '../src/lib/quote-engine';
import type { QuotationCase, QuotationTemplate } from '../src/types';

const now = new Date('2026-11-18T10:00:00Z');
const owner = { id: 'u1', name: 'Sara', role: 'Procurement Engineer' };
const boss = { id: 'u2', name: 'Hammad', role: 'Procurement Engineer' };
const other = { id: 'u4', name: 'Bilal', role: 'Procurement Engineer' };
const admin = { id: 'u3', name: 'Ali', role: 'Super Admin' };
const line = { id: 'l1', description: 'Pump', brand: '', partNumber: '', qty: 2, uom: 'PCS', unitCost: 50, marginPct: 20, unitPrice: 60, total: 120 };
const quote = (over: Partial<QuotationTemplate> = {}): QuotationTemplate => ({ ...blankQuote(null), date: '2026-11-18', quoteRef: 'Q1', clientName: 'X', lineItems: [line], lifecycle: { ownerId: 'u1', ownerName: 'Sara' }, ...over });
const withApproval = (q: QuotationTemplate, lc: QuotationTemplate['lifecycle']) => ({ ...q, lifecycle: lc });

test('who may ask, and whom', () => {
  const lc = { ownerId: 'u1' };
  assert.ok(canRequestApproval(lc, owner, 'u2'));
  assert.ok(!canRequestApproval(lc, owner, 'u1'), 'not yourself');
  assert.ok(!canRequestApproval(lc, other, 'u2'), 'only the owner or an admin');
  assert.ok(canRequestApproval(lc, admin, 'u2'));
});

test('no approval yet: blocked for staff, never for admins', () => {
  const q = quote();
  assert.equal(approvalState(q), 'none');
  assert.equal(approvalChecks(q, owner)[0].code, 'approval_needed');
  assert.deepEqual(approvalChecks(q, admin), []);
  assert.ok(!canDownload(q, owner) && canDownload(q, admin));
});

test('waiting, then approved: download opens; only the tagged person (or admin) decides', () => {
  let q = quote();
  q = withApproval(q, requestApproval(q.lifecycle, { id: 'u2', name: 'Hammad' }, owner, 'please check prices', now));
  assert.equal(approvalState(q), 'awaiting');
  assert.equal(approvalChecks(q, owner)[0].code, 'approval_waiting');
  assert.ok(canDecide(q.lifecycle, boss) && canDecide(q.lifecycle, admin));
  assert.ok(!canDecide(q.lifecycle, owner) && !canDecide(q.lifecycle, other));
  q = withApproval(q, approve(q.lifecycle, q, boss, now));
  assert.equal(approvalState(q), 'approved');
  assert.ok(canDownload(q, owner));
  assert.equal(q.lifecycle?.approval?.note, undefined);
});

test('the quote stays editable while waiting, and the approver may change prices before approving', () => {
  let q = quote();
  q = withApproval(q, requestApproval(q.lifecycle, { id: 'u2', name: 'Hammad' }, owner, '', now));
  q = { ...q, lineItems: [{ ...line, unitPrice: 70, total: 140 }] }; // approver changed a price
  assert.equal(approvalState(q), 'awaiting', 'a change while waiting does not cancel the request');
  q = withApproval(q, approve(q.lifecycle, q, boss, now));
  assert.equal(approvalState(q), 'approved', 'they approved what they saw');
});

test('editing an approved quote withdraws the approval; changing only cost or margin does not', () => {
  let q = quote();
  q = withApproval(q, requestApproval(q.lifecycle, { id: 'u2', name: 'Hammad' }, owner, '', now));
  q = withApproval(q, approve(q.lifecycle, q, boss, now));
  assert.equal(approvalState({ ...q, lineItems: [{ ...line, unitCost: 55, marginPct: 9 }] }), 'approved');
  for (const edit of [{ clientName: 'Y' }, { lineItems: [{ ...line, qty: 3, total: 180 }] }, { notes: ['x'] }, { subject: 's' }, { terms: ['t'] }, { validityDays: 9 }] as Partial<QuotationTemplate>[]) {
    const changed = { ...q, ...edit };
    assert.equal(approvalState(changed), 'changed', JSON.stringify(Object.keys(edit)));
    assert.equal(approvalChecks(changed, owner)[0].code, 'approval_changed');
  }
});

test('send back keeps the reason; cancel clears the request; a new request starts again', () => {
  let q = quote();
  q = withApproval(q, requestApproval(q.lifecycle, { id: 'u2', name: 'Hammad' }, owner, '', now));
  q = withApproval(q, sendBack(q.lifecycle, boss, '  margin too thin ', now));
  assert.equal(approvalState(q), 'sent_back');
  assert.match(approvalChecks(q, owner)[0].message, /margin too thin/);
  q = withApproval(q, requestApproval(q.lifecycle, { id: 'u2', name: 'Hammad' }, owner, '', now));
  assert.equal(approvalState(q), 'awaiting');
  q = withApproval(q, cancelApproval(q.lifecycle, owner, now));
  assert.equal(approvalState(q), 'none');
  assert.ok((q.lifecycle?.log?.length ?? 0) >= 3);
});

test('fingerprint is stable for the same content', () => {
  assert.equal(quoteFingerprint(quote()), quoteFingerprint(quote()));
});

test('bell: approver sees waiting quotes; owner sees answers; archived and old ones are skipped', () => {
  const mk = (id: string, lc: QuotationTemplate['lifecycle'], status: QuotationCase['status'] = 'Draft'): QuotationCase => {
    const q = quote({ quoteRef: id, lifecycle: { ownerId: 'u1', ...lc } });
    return { id, caseRef: id, clientName: 'X', status, createdAt: '2026-11-18', totalPKR: 0, itemCount: 1, templateState: q };
  };
  const wait = requestApproval({ ownerId: 'u1' }, { id: 'u2', name: 'Hammad' }, owner, 'check', now);
  const sent = sendBack(wait, boss, 'fix margin', now);
  const ok = approve(wait, quote(), boss, new Date('2026-11-17T10:00:00Z'));
  const old = sendBack(wait, boss, 'old', new Date('2026-10-01T10:00:00Z'));
  const cases = [mk('A', wait), mk('B', sent), mk('C', ok), mk('D', old), mk('E', { ...wait, archived: { at: '', by: '' } }), mk('F', wait, 'Completed')];
  const forBoss = inboxFor(cases, boss, now);
  assert.deepEqual(forBoss.map((i) => i.caseRef), ['A']);
  assert.ok(forBoss[0].needsAction && forBoss[0].kind === 'approve');
  const forOwner = inboxFor(cases, owner, now);
  assert.deepEqual(forOwner.map((i) => i.caseRef).sort(), ['B', 'C']);
  assert.ok(forOwner.find((i) => i.caseRef === 'B')!.needsAction);
  assert.ok(!forOwner.find((i) => i.caseRef === 'C')!.needsAction);
  assert.deepEqual(inboxFor(cases, other, now), []);
});
