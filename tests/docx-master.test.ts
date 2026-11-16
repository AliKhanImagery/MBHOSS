import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import JSZip from 'jszip';
import { fillMaster, readMasterDefaults, formatDate, type FillData } from '../src/lib/docx-master';

const master = readFileSync(new URL('./fixtures/master-quotation.docx', import.meta.url));

const data = (over: Partial<FillData> = {}): FillData => ({
  info: { to: 'ACME Foods Ltd', from: 'Sara Ahmed', attn: 'Mr Khan', ref: 'Q2600123', date: '2026-11-16', pages: '02', subject: 'Supply of test valves' },
  greeting: 'Dear Mr Khan,',
  intro: 'Please find our quotation below:',
  items: [
    { description: 'Valve A', uom: 'Nos', qty: 2, unitPrice: 1500, total: 3000 },
    { description: 'Valve B', uom: 'Nos', qty: 5, unitPrice: 200, total: 1000 },
    { description: 'Valve C', uom: 'Nos', qty: 1, unitPrice: 9000, total: 9000 },
  ],
  subtotal: 13000,
  grandTotal: 13000,
  terms: ['Prices in PKR excluding all TAXES', 'Payment Terms: 50% advance.', 'My own extra term'],
  ...over,
});

async function xmlOf(bytes: Uint8Array, part = 'word/document.xml') {
  return (await (await JSZip.loadAsync(bytes)).file(part)!.async('string'));
}
const text = (xml: string) => xml.replace(/<w:br\/>/g, ' ').replace(/<[^>]+>/g, '');

test('reads defaults out of the master without problems', async () => {
  const d = await readMasterDefaults(master);
  assert.deepEqual(d.problems, []);
  assert.equal(d.greeting, 'Dear Sir,');
  assert.equal(d.dateFormat, 'DD-MM-YYYY');
  assert.equal(d.pagesDigits, 2);
  assert.ok(d.terms.length >= 8);
  assert.ok(d.terms[0].startsWith('Prices in PKR'));
});

test('fills values, one row per item, totals', async () => {
  const { bytes } = await fillMaster(master, data(), { dateFormat: 'DD-MM-YYYY' });
  const t = text(await xmlOf(bytes));
  for (const s of ['ACME Foods Ltd', 'Sara Ahmed', 'Mr Khan', 'Q2600123', '16-11-2026', 'Supply of test valves', 'Dear Mr Khan,', 'Valve A', 'Valve B', 'Valve C', '1,500', '13,000', '9,000']) {
    assert.ok(t.includes(s), `missing ${s}`);
  }
  assert.ok(!t.includes('[Client Name]') && !t.includes('[Contact Name]'));
  assert.ok(!t.includes('Butterfly Valves for Diverter'));
});

test('never touches header, footer, styles or numbering', async () => {
  const { bytes } = await fillMaster(master, data(), {});
  const a = await JSZip.loadAsync(master);
  const b = await JSZip.loadAsync(bytes);
  for (const part of ['word/header1.xml', 'word/footer1.xml', 'word/styles.xml', 'word/numbering.xml', 'word/settings.xml']) {
    assert.equal(await b.file(part)!.async('string'), await a.file(part)!.async('string'), `${part} changed`);
  }
});

test('terms are rewritten, bullets kept, labels bold', async () => {
  const { bytes } = await fillMaster(master, data(), {});
  const xml = await xmlOf(bytes);
  assert.ok(text(xml).includes('My own extra term'));
  assert.ok(!text(xml).includes('Price Fluctuation'));
  assert.ok(/<w:b w:val="1"\/>[^]*?<w:t[^>]*>Payment Terms<\/w:t>/.test(xml), 'label run is bold');
  const bullets = (xml.match(/<w:numPr>/g) ?? []).length;
  assert.ok(bullets >= 3);
});

test('no yellow highlight is left in a finished quote', async () => {
  const { bytes } = await fillMaster(master, data(), {});
  assert.ok(!(await xmlOf(bytes)).includes('<w:highlight'));
});

test('output is a valid, re-readable docx', async () => {
  const { bytes } = await fillMaster(master, data(), {});
  const again = await readMasterDefaults(bytes);
  assert.deepEqual(again.problems, []);
  assert.equal(again.terms.length, 3);
});

test('a non-quotation Word file reports problems instead of guessing', async () => {
  const plain = readFileSync(new URL('./fixtures/plain.docx', import.meta.url));
  const d = await readMasterDefaults(plain);
  assert.ok(d.problems.length >= 2);
});

test('not a docx at all gives a clear error', async () => {
  await assert.rejects(readMasterDefaults(Buffer.from('hello')), /could not be opened/);
});

test('date formats', () => {
  assert.equal(formatDate('2026-11-06', 'DD-MM-YYYY'), '06-11-2026');
  assert.equal(formatDate('2026-11-06', 'DD/MM/YYYY'), '06/11/2026');
  assert.equal(formatDate('2026-11-06', 'YYYY-MM-DD'), '2026-11-06');
});
