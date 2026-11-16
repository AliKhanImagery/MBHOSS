import test from 'node:test';
import assert from 'node:assert/strict';
import * as W from '../src/lib/quote-workflow';

const ali: W.Actor = { id: 'u1', name: 'Ali', isAdmin: false };
const sara: W.Actor = { id: 'u2', name: 'Sara', isAdmin: false };
const boss: W.Actor = { id: 'u3', name: 'Hammad', isAdmin: true };
const t = (n: number) => new Date(2026, 10, 17, 10, n);
const ok = (r: W.Result) => { assert.ok(r.ok, r.ok ? '' : r.reason); return (r as { ok: true; workflow: W.QuoteWorkflow }).workflow; };
const bad = (r: W.Result) => { assert.ok(!r.ok); return (r as { ok: false; reason: string }).reason; };

test('full happy path: tag, hand back, submit, approve', () => {
  let w = W.startWorkflow(ali, t(0));
  w = ok(W.tagColleague(w, ali, sara, '  add the freight cost  ', t(1)));
  assert.equal(w.status, 'with_colleague');
  assert.equal(w.assignee?.note, 'add the freight cost');
  w = ok(W.handBack(w, sara, 'done', t(2)));
  assert.equal(w.status, 'draft');
  assert.equal(w.assignee, undefined);
  w = ok(W.submitForApproval(w, ali, 100000, t(3)));
  assert.equal(w.status, 'needs_approval');
  w = ok(W.approve(w, boss, 100000, t(4)));
  assert.equal(w.status, 'approved');
  assert.equal(w.approvedBy?.name, 'Hammad');
  assert.deepEqual(w.log.map((l) => l.action), ['created', 'tagged', 'handed_back', 'submitted', 'approved']);
});

test('only the owner tags; cannot tag yourself; needs a note; not twice', () => {
  const w = W.startWorkflow(ali);
  assert.match(bad(W.tagColleague(w, sara, boss, 'x')), /owns/);
  assert.match(bad(W.tagColleague(w, ali, ali, 'x')), /not yourself/);
  assert.match(bad(W.tagColleague(w, ali, sara, '   ')), /what you need/);
  const tagged = ok(W.tagColleague(w, ali, sara, 'x'));
  assert.match(bad(W.tagColleague(tagged, ali, boss, 'y')), /already with Sara/);
});

test('only the tagged person (or an admin) can hand back', () => {
  const tagged = ok(W.tagColleague(W.startWorkflow(ali), ali, sara, 'x'));
  assert.match(bad(W.handBack(tagged, ali)), /Only Sara/);
  assert.ok(W.handBack(tagged, boss).ok);
});

test('cannot submit while it is with a colleague', () => {
  const tagged = ok(W.tagColleague(W.startWorkflow(ali), ali, sara, 'x'));
  assert.match(bad(W.submitForApproval(tagged, ali, 5)), /Wait for Sara/);
});

test('only admins approve or send back, and only when waiting', () => {
  const draft = W.startWorkflow(ali);
  assert.match(bad(W.approve(draft, boss, 5)), /not waiting/);
  const waiting = ok(W.submitForApproval(draft, ali, 5));
  assert.match(bad(W.approve(waiting, ali, 5)), /Only an admin/);
  assert.match(bad(W.sendBack(waiting, ali, 'x')), /Only an admin/);
  assert.match(bad(W.sendBack(waiting, boss, ' ')), /what needs to change/);
  const back = ok(W.sendBack(waiting, boss, 'freight is too low'));
  assert.equal(back.status, 'sent_back');
  assert.equal(back.sentBackNote, 'freight is too low');
  const again = ok(W.submitForApproval(back, ali, 7));
  assert.equal(again.sentBackNote, undefined);
});

test('approval notes a price change made by the admin', () => {
  const waiting = ok(W.submitForApproval(W.startWorkflow(ali), ali, 100));
  const approved = ok(W.approve(waiting, boss, 120));
  assert.equal(approved.approvedTotal, 120);
  assert.match(approved.log.at(-1)!.note ?? '', /100 to 120/);
});

test('waiting quote stays editable; editing an approved one withdraws approval', () => {
  const waiting = ok(W.submitForApproval(W.startWorkflow(ali), ali, 5));
  assert.equal(W.afterEdit(waiting, ali), waiting);
  const approved = ok(W.approve(waiting, boss, 5));
  const edited = W.afterEdit(approved, ali);
  assert.equal(edited.status, 'needs_approval');
  assert.equal(edited.approvedBy, undefined);
  assert.equal(edited.log.at(-1)!.action, 'edited_after_approval');
});

test('download gate and inboxes', () => {
  const waiting = ok(W.submitForApproval(W.startWorkflow(ali), ali, 5));
  assert.equal(W.canDownload(waiting, ali), false);
  assert.equal(W.canDownload(waiting, boss), true);
  assert.equal(W.canDownload(ok(W.approve(waiting, boss, 5)), ali), true);
  assert.equal(W.canDownload(undefined, ali), false);

  const tagged = ok(W.tagColleague(W.startWorkflow(ali), ali, sara, 'x'));
  const items = [{ id: 'a', workflow: tagged }, { id: 'b', workflow: waiting }];
  assert.deepEqual(W.inboxFor(items, sara).taggedToMe.map((i) => i.id), ['a']);
  assert.deepEqual(W.inboxFor(items, boss).needApproval.map((i) => i.id), ['b']);
  assert.deepEqual(W.inboxFor(items, ali).needApproval, []);
});
