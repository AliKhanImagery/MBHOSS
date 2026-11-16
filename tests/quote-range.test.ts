import test from 'node:test';
import assert from 'node:assert/strict';
import { formatRef, nextRef, numberInRange, rangesOverlap, validateRange, type QuoteRange } from '../src/lib/quote-range';

const r: QuoteRange = { prefix: 'Q26', digits: 5, start: 1000, end: 1999 };

test('formats with the admin-set prefix and padding', () => {
  assert.equal(formatRef(r, 1014), 'Q2601014');
  assert.equal(formatRef({ prefix: 'MBH-', digits: 3, start: 1, end: 99 }, 7), 'MBH-007');
});

test('first number is the start of the range', () => {
  assert.deepEqual(nextRef(r, []), { ok: true, ref: 'Q2601000', n: 1000 });
});

test('next number is one after the highest used inside the range', () => {
  const used = ['Q2601000', 'Q2601013', 'Q2601002', 'Q2605000', 'XX01500', 'Q26-1900'];
  assert.deepEqual(nextRef(r, used), { ok: true, ref: 'Q2601014', n: 1014 });
});

test('refs from other ranges or formats are ignored', () => {
  assert.equal(numberInRange(r, 'Q2602500'), null); // outside range
  assert.equal(numberInRange(r, 'Q261014'), null); // wrong length
  assert.equal(numberInRange(r, 'Q2601014'), 1014);
});

test('reports when the range is used up', () => {
  assert.deepEqual(nextRef(r, ['Q2601999']), { ok: false, reason: 'exhausted' });
});

test('validates what an admin types', () => {
  assert.deepEqual(validateRange(r), []);
  assert.ok(validateRange({ ...r, prefix: '' }).length);
  assert.ok(validateRange({ ...r, end: 10 }).length);
  assert.ok(validateRange({ ...r, digits: 2 }).length); // 1999 needs 4 digits
  assert.ok(validateRange({ ...r, prefix: 'Q 26' }).length);
});

test('detects overlapping ranges', () => {
  assert.equal(rangesOverlap(r, { ...r, start: 1500, end: 2500 }), true);
  assert.equal(rangesOverlap(r, { ...r, start: 2000, end: 2999 }), false);
  assert.equal(rangesOverlap(r, { ...r, prefix: 'P26', start: 1000, end: 1999 }), false);
});
