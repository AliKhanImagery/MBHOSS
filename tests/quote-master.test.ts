import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { blankQuote } from '../src/lib/quote-engine';
import { buildFillData, masterChecks, syncTerms } from '../src/lib/quote-master';
import { fillMaster, readMasterDefaults } from '../src/lib/docx-master';
import type { OfficeTemplate } from '../src/types';

const rules = { minMarginPct: null, defaultMarginPct: null, maxValidityDays: null, defaultValidityDays: null, maxDiscountPct: null } as never;
const tpl = (over: Partial<OfficeTemplate> = {}): OfficeTemplate => ({
  version: 1, publishedAt: '', publishedBy: '', sourceDocName: 'm.docx',
  letterhead: { lines: [], logoDataUrl: null, backgroundPdfDataUrl: null, backgroundPdfName: '', footerLines: [] },
  signatory: { company: '', name: '', designation: '' },
  terms: ['Prices in PKR excluding all TAXES', 'Payment Terms: 100% advance.', 'Delivery: 03-05 weeks.', 'Validity: our prices are valid for 7 days.'],
  refHint: '', taxStatement: '', rules, ...over,
});

test('syncTerms writes only values somebody set', () => {
  const t = tpl().terms;
  assert.deepEqual(syncTerms(t, { deliveryTerms: '', paymentTerms: '', validityDays: 0 }, null), t);
  const out = syncTerms(t, { deliveryTerms: '2 weeks', paymentTerms: '50% advance', validityDays: 14 }, null);
  assert.equal(out[1], 'Payment Terms: 50% advance');
  assert.equal(out[2], 'Delivery: 2 weeks');
  assert.equal(out[3], 'Validity: our prices are valid for 14 days.');
});

test('validity equal to the company default does not overwrite the master wording', () => {
  const out = syncTerms(tpl().terms, { deliveryTerms: '', paymentTerms: '', validityDays: 30 }, 30);
  assert.equal(out[3], 'Validity: our prices are valid for 7 days.');
});

test('checks: subject required, sample intro flagged, tax blocked', () => {
  const q = blankQuote(rules);
  const t = tpl({ master: { greeting: 'Dear Sir,', intro: 'sample', dateFormat: 'DD-MM-YYYY', pagesDigits: 2 } });
  let codes = masterChecks(q, t).map((c) => c.code);
  assert.ok(codes.includes('master_no_subject') && codes.includes('master_sample_intro'));
  codes = masterChecks({ ...q, subject: 'Valves', intro: 'Hello', taxAmount: 10 }, t).map((c) => c.code);
  assert.deepEqual(codes, ['master_tax']);
});

test('end to end on the real master fixture: filled values appear, header/footer untouched', async () => {
  const master = readFileSync('tests/fixtures/master-quotation.docx');
  const d = await readMasterDefaults(master);
  assert.deepEqual(d.problems, []);
  const q = { ...blankQuote(rules), quoteRef: 'MBH-QT-1', clientName: 'ACME Ltd', subject: 'Test subject', clientContact: 'Mr X',
    lineItems: [{ id: 'a', description: 'Valve', brand: 'B', partNumber: 'P1', qty: 2, uom: 'PCS', unitPrice: 100, total: 200, unitCost: 0, marginPct: 0 }], subtotal: 200, grandTotal: 200 } as never;
  const fd = buildFillData(q, tpl(), 'Ali Khan');
  assert.equal(fd.items[0].description, 'Valve – B P1');
  const { bytes } = await fillMaster(master, fd, { dateFormat: d.dateFormat });
  const JSZip = (await import('jszip')).default;
  const z = await JSZip.loadAsync(bytes);
  const o = await JSZip.loadAsync(master);
  for (const f of ['word/header1.xml', 'word/footer1.xml', 'word/styles.xml']) {
    assert.equal(await z.file(f)!.async('string'), await o.file(f)!.async('string'), f + ' must be byte-identical');
  }
  const body = await z.file('word/document.xml')!.async('string');
  assert.ok(body.includes('ACME Ltd') && body.includes('Test subject'));
});

test('a pre-owned line is never sent to the Word file or the customer text', () => {
  const q = { ...blankQuote(rules), quoteRef: 'Q1', clientName: 'ACME', subject: 's',
    lineItems: [{ id: 'a', description: 'Pump X', brand: 'B', partNumber: 'P1', qty: 1, uom: 'PCS', unitPrice: 100, total: 100, unitCost: 60, marginPct: 40, preowned: true, dataBankId: 'p1' }], subtotal: 100, grandTotal: 100 } as never;
  const json = JSON.stringify(buildFillData(q, tpl(), 'Ali Khan'));
  assert.ok(!/pre-?owned|used|condition/i.test(json));
});
