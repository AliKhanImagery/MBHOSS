import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addUpdate, attention, canSee, dueState, findCase, matches, mergeCases, newCase, patchCase, sortCases } from '../src/lib/project-cases';
import type { ProjectCase } from '../src/types';

const t0 = new Date('2026-11-24T09:00:00Z');
const later = new Date('2026-11-26T09:00:00Z');
const me = { by: 'ali@x.com', via: 'app' as const };
const mk = (over: Partial<Parameters<typeof newCase>[0]> = {}, at = t0) => newCase({ title: 'Tank for Unilever', ...over }, 'ali@x.com', me, at);

test('a case needs a title; empty fields stay empty, nothing is guessed', () => {
  assert.throws(() => newCase({ title: '   ' }, 'a@x.com', me, t0), /title/);
  const c = mk({ client: '  ', summary: '' });
  assert.equal(c.client, undefined);
  assert.equal(c.summary, undefined);
  assert.equal(c.nextAction, undefined);
  assert.equal(c.nextActionDue, undefined);
  assert.equal(c.status, 'open');
  assert.equal(c.updates.length, 0);
});

test('first note becomes the first timeline entry, with who and how', () => {
  const c = mk({ note: ' Boss said make a quote ', noteKind: 'call' });
  assert.equal(c.updates.length, 1);
  assert.equal(c.updates[0].text, 'Boss said make a quote');
  assert.equal(c.updates[0].kind, 'call');
  assert.equal(c.updates[0].via, 'app');
});

test('bad dates and kinds are rejected, not repaired', () => {
  assert.throws(() => mk({ nextActionDue: '25/11/2026' }), /YYYY-MM-DD/);
  assert.throws(() => mk({ nextActionDue: '2026-02-31' }), /not a date/);
  assert.throws(() => mk({ note: 'x', noteKind: 'whatsapp' }), /kind/);
});

test('addUpdate appends and touches updatedAt; empty text rejected', () => {
  const c = mk();
  const u = addUpdate(c, { text: 'Called client' , kind: 'call' }, me, later);
  assert.equal(u.updates.length, 1);
  assert.equal(u.updatedAt, later.toISOString());
  assert.throws(() => addUpdate(c, { text: '  ' }, me, later), /text/);
});

test('patchCase logs each change; absent fields untouched; empty string clears', () => {
  const c = mk({ client: 'Unilever', nextAction: 'Call supplier', nextActionDue: '2026-11-25' });
  const p = patchCase(c, { status: 'quoted', nextAction: '', nextActionDue: '' }, me, later);
  assert.equal(p.status, 'quoted');
  assert.equal(p.client, 'Unilever');
  assert.equal(p.nextAction, undefined);
  assert.equal(p.nextActionDue, undefined);
  const texts = p.updates.map((u) => u.text);
  assert.ok(texts.includes('Status: Open → Quoted'));
  assert.ok(texts.includes('Next action cleared'));
  assert.ok(p.updates.every((u) => u.kind === 'system'));
  assert.equal(patchCase(c, { client: 'Unilever' }, me, later), c, 'no change returns the same object');
  assert.throws(() => patchCase(c, { status: 'won' }, me, later), /status/);
  assert.throws(() => patchCase(c, { title: ' ' }, me, later), /title/);
});

test('due state and the needs-you list', () => {
  const today = '2026-11-24';
  const overdue = mk({ title: 'A', nextAction: 'x', nextActionDue: '2026-11-20' });
  const dueToday = mk({ title: 'B', nextAction: 'x', nextActionDue: today });
  const future = mk({ title: 'C', nextAction: 'x', nextActionDue: '2026-12-01' });
  const none = mk({ title: 'D' });
  const closed = patchCase(mk({ title: 'E', nextActionDue: '2026-11-01' }), { status: 'closed' }, me, later);
  assert.equal(dueState(overdue, today), 'overdue');
  assert.equal(dueState(dueToday, today), 'today');
  assert.equal(dueState(future, today), 'upcoming');
  assert.equal(dueState(none, today), 'none');
  assert.equal(dueState(closed, today), 'none');
  const a = attention([future, none, dueToday, overdue, closed], today);
  assert.deepEqual(a.map((x) => `${x.c.title}:${x.reason}`), ['A:overdue', 'B:today', 'D:no_next_action']);
});

test('live cases sort least-recently-touched first', () => {
  const old = mk({ title: 'old' }, new Date('2026-11-01T00:00:00Z'));
  const fresh = mk({ title: 'fresh' }, new Date('2026-11-23T00:00:00Z'));
  assert.deepEqual(sortCases([fresh, old], false).map((c) => c.title), ['old', 'fresh']);
  assert.deepEqual(sortCases([old, fresh], true).map((c) => c.title), ['fresh', 'old']);
});

test('only the owner and admins can see a case', () => {
  const c = mk();
  assert.ok(canSee(c, { email: 'ALI@x.com', isAdmin: false }));
  assert.ok(!canSee(c, { email: 'sara@x.com', isAdmin: false }));
  assert.ok(canSee(c, { email: 'sara@x.com', isAdmin: true }));
  assert.ok(!canSee(c, null));
});

test('merge keeps both sides and prefers the newer copy', () => {
  const a = mk({ title: 'A' });
  const b = mk({ title: 'B' });
  const aNew = addUpdate(a, { text: 'later' }, me, later);
  const merged = mergeCases([a, b], [aNew]);
  assert.equal(merged.length, 2);
  assert.equal(merged.find((c) => c.id === a.id)!.updates.length, 1);
});

test('findCase: by id, by unique part of title/client, never a guess', () => {
  const x = mk({ title: 'Syrup tank', client: 'Pepsi' });
  const y = mk({ title: 'Syrup pump', client: 'Coke' });
  const cases: ProjectCase[] = [x, y];
  assert.equal(findCase(cases, x.id), x);
  assert.equal(findCase(cases, 'pump'), y);
  assert.equal(findCase(cases, 'pepsi'), x);
  assert.throws(() => findCase(cases, 'syrup'), /matches 2 cases/);
  assert.throws(() => findCase(cases, 'zzz'), /No case matches/);
  assert.throws(() => findCase(cases, ''), /Say which case/);
});

test('search looks through titles and the timeline', () => {
  const c = addUpdate(mk(), { text: 'Supplier said 3 weeks lead time' }, me, later);
  assert.ok(matches(c, 'lead time'));
  assert.ok(matches(c, 'unilever'));
  assert.ok(!matches(c, 'zzz'));
});
