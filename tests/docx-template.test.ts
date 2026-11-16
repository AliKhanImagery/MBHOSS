import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extractOfficeTemplate, DEFAULT_TAX_STATEMENT } from '../src/lib/docx-template';

const load = (n: string) => new Uint8Array(readFileSync(new URL(`./fixtures/${n}`, import.meta.url)));

test('copies letterhead, footer, logo, terms and signatory from the sample', async () => {
  const { draft } = await extractOfficeTemplate(load('sample-quotation.docx'), 'sample-quotation.docx');
  assert.deepEqual(draft.letterhead.lines, ['Test Industries (Pvt) Ltd', '12 Example Road, Sample City']);
  assert.deepEqual(draft.letterhead.footerLines, ['Tel: 000-0000000 | info@example.test']);
  assert.ok(draft.letterhead.logoDataUrl?.startsWith('data:image/png;base64,'));
  assert.deepEqual(draft.terms, [
    'Delivery within 4 weeks from the date of order.',
    'Payment: 50% advance, balance before dispatch.',
    'Prices are valid for 30 days.',
  ]);
  assert.equal(draft.signatory.company, 'Test Industries (Pvt) Ltd');
  assert.equal(draft.signatory.name, 'Jane Example');
  assert.equal(draft.signatory.designation, 'Sales Manager');
  assert.equal(draft.refHint, 'Ref: TI/Q/2026/001');
  assert.equal(draft.taxStatement, 'Total payable is exclusive of GST and all other applicable taxes.');
  assert.equal(draft.sourceDocName, 'sample-quotation.docx');
});

test('a document without a letterhead is left blank and flagged — nothing is invented', async () => {
  const { draft, findings } = await extractOfficeTemplate(load('plain.docx'), 'plain.docx');
  assert.deepEqual(draft.letterhead.lines, []);
  assert.deepEqual(draft.terms, []);
  assert.equal(draft.signatory.name, '');
  assert.equal(draft.taxStatement, DEFAULT_TAX_STATEMENT);
  assert.ok(findings.some((f) => /No letterhead/.test(f)));
  assert.ok(findings.some((f) => /Terms/.test(f)));
});

test('a non-docx file gives a friendly error', async () => {
  await assert.rejects(() => extractOfficeTemplate(new Uint8Array([1, 2, 3]), 'x.docx'), /Word/);
});
