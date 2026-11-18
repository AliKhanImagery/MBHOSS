// ==============================================================================
// The admin's approved Word file is the MASTER. A quotation is made by filling
// values into a copy of it: the header, footer, fonts, table styling, borders and
// shading are never touched, so the result is the company's own format.
//
// What is filled (found by reading the master, not by guessing):
//   - the info grid cells ("To:", "FROM:", "ATTN:", "OUR REF:", "DATE:", "PAGES:", "SUBJECT:")
//   - the greeting ("Dear ...,") and the opening paragraph
//   - the items table (one row per item, plus the total rows)
//   - the numbered terms and conditions
// Anything it cannot find is reported in `problems`, never silently skipped.
// ==============================================================================

import JSZip from 'jszip';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

type El = Element;
const kids = (n: Node, name: string): El[] =>
  Array.from(n.childNodes).filter((c): c is El => c.nodeType === 1 && (c as El).localName === name && (c as El).namespaceURI === W);
const all = (n: Node, name: string): El[] => Array.from((n as El).getElementsByTagNameNS(W, name));

/** Visible text of a paragraph / cell / row. Tabs count as a space. */
function textOf(n: Node): string {
  let out = '';
  const walk = (x: Node) => {
    for (const c of Array.from(x.childNodes)) {
      if (c.nodeType !== 1) continue;
      const e = c as El;
      if (e.namespaceURI === W && e.localName === 't') out += e.textContent ?? '';
      else if (e.namespaceURI === W && e.localName === 'tab') out += ' ';
      else if (e.localName === 'Fallback') continue; // mc:Fallback duplicates mc:Choice
      else walk(e);
    }
  };
  walk(n);
  return out;
}
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

export interface InfoFields {
  to?: string;
  from?: string;
  attn?: string;
  ref?: string;
  date?: string;
  pages?: string;
  subject?: string;
}

export interface FillItem {
  description: string;
  uom: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface FillData {
  info: InfoFields;
  greeting?: string;
  intro?: string;
  items: FillItem[];
  subtotal: number;
  grandTotal: number;
  terms: string[];
  /** Page count to show in the PAGES cell (Word refreshes it when printing). */
  pagesCached?: string;
}

export interface MasterDefaults {
  greeting: string;
  intro: string;
  subject: string;
  terms: string[];
  dateFormat: 'DD-MM-YYYY' | 'YYYY-MM-DD' | 'DD/MM/YYYY';
  pagesDigits: number;
  problems: string[];
}

// ─── low-level DOM helpers ───────────────────────────────────────────────────

const stripHighlight = (n: Node) => {
  for (const h of all(n, 'highlight')) h.parentNode?.removeChild(h);
};

const firstTextRun = (p: El): El | null => kids(p, 'r').find((r) => all(r, 't').length > 0) ?? null;

function makeRun(doc: Document, templ: El | null, fallbackRPr: El | null, text: string): El {
  const run = templ ? (templ.cloneNode(true) as El) : (doc.createElementNS(W, 'w:r') as El);
  if (templ) {
    // Keep line breaks that come BEFORE the text (the master may use them as spacing above a paragraph).
    let seenText = false;
    for (const c of Array.from(run.childNodes) as El[]) {
      if (c.localName === 'rPr') continue;
      if (c.localName === 't' || c.localName === 'tab') seenText = true;
      if (seenText || c.localName !== 'br') run.removeChild(c);
    }
  } else if (fallbackRPr) {
    run.appendChild(fallbackRPr.cloneNode(true));
  }
  stripHighlight(run);
  const t = doc.createElementNS(W, 'w:t') as El;
  t.setAttribute('xml:space', 'preserve');
  t.appendChild(doc.createTextNode(text));
  run.appendChild(t);
  return run;
}

/** Replaces everything in a paragraph (keeping its formatting) with one run of `text`. */
function setParagraphText(doc: Document, p: El, text: string) {
  const templ = firstTextRun(p);
  const markRPr = kids(p, 'pPr')[0] ? kids(kids(p, 'pPr')[0], 'rPr')[0] ?? null : null;
  const run = makeRun(doc, templ, markRPr, text);
  for (const c of Array.from(p.childNodes)) if ((c as El).localName !== 'pPr') p.removeChild(c);
  p.appendChild(run);
}

function setCellText(doc: Document, tc: El, text: string) {
  const ps = kids(tc, 'p');
  for (const extra of ps.slice(1)) tc.removeChild(extra);
  setParagraphText(doc, ps[0], text);
}

// ─── locating things ─────────────────────────────────────────────────────────

const INFO_LABELS: Record<string, keyof InfoFields> = {
  to: 'to', from: 'from', attn: 'attn', attention: 'attn', 'our ref': 'ref', ref: 'ref', 'ref no': 'ref',
  date: 'date', pages: 'pages', subject: 'subject', sub: 'subject',
};

function labelOf(cellText: string): { key: keyof InfoFields; prefixLen: number } | null {
  const m = cellText.match(/^\s*([A-Za-z][A-Za-z .]*?)\s*:\s*/);
  if (!m) return null;
  const key = INFO_LABELS[m[1].toLowerCase().replace(/\./g, '').trim()];
  return key ? { key, prefixLen: m[0].length } : null;
}

interface Located {
  body: El;
  infoTable: El | null;
  infoCells: Partial<Record<keyof InfoFields, { tc: El; prefixLen: number }>>;
  greeting: El | null;
  intro: El | null;
  itemsTable: El | null;
  cols: Partial<Record<'sr' | 'desc' | 'unit' | 'qty' | 'unitPrice' | 'amount', number>>;
  termsHeading: El | null;
  termParas: El[];
}

function locate(doc: Document): Located {
  const body = all(doc, 'body')[0];
  const top = Array.from(body.childNodes).filter((c): c is El => c.nodeType === 1);
  const res: Located = { body, infoTable: null, infoCells: {}, greeting: null, intro: null, itemsTable: null, cols: {}, termsHeading: null, termParas: [] };

  for (const el of top) {
    if (el.localName !== 'tbl') continue;
    const cells = all(el, 'tc');
    const found: Located['infoCells'] = {};
    for (const tc of cells) {
      const l = labelOf(norm(textOf(tc)) === '' ? '' : textOf(tc));
      if (l && !found[l.key]) found[l.key] = { tc, prefixLen: l.prefixLen };
    }
    if (!res.infoTable && Object.keys(found).length >= 3) {
      res.infoTable = el;
      res.infoCells = found;
      continue;
    }
    const header = kids(el, 'tr')[0];
    if (!res.itemsTable && header) {
      const heads = kids(header, 'tc').map((tc) => norm(textOf(tc)).toLowerCase());
      const idx = (re: RegExp) => heads.findIndex((h) => re.test(h));
      const desc = idx(/particular|description|item/);
      const qty = idx(/^(qty|quantity)/);
      const amount = idx(/amount|line total/);
      if (desc >= 0 && qty >= 0 && amount >= 0) {
        res.itemsTable = el;
        res.cols = { sr: idx(/^(sr|s\.?\s*no|no\.?|#)/), desc, unit: idx(/^(unit|uom)$/), qty, unitPrice: idx(/unit\s*price|rate/), amount };
      }
    }
  }

  const topPs = top.filter((e) => e.localName === 'p');
  const infoIdx = res.infoTable ? top.indexOf(res.infoTable) : -1;
  const itemsIdx = res.itemsTable ? top.indexOf(res.itemsTable) : -1;
  res.greeting = top.slice(infoIdx + 1).find((e) => e.localName === 'p' && /^dear\b/i.test(norm(textOf(e)))) ?? null;
  if (res.greeting) {
    const from = top.indexOf(res.greeting) + 1;
    res.intro = top.slice(from, itemsIdx > from ? itemsIdx : undefined).find((e) => e.localName === 'p' && norm(textOf(e)) !== '') ?? null;
  }

  res.termsHeading = topPs.find((p) => /terms\s*(&|and)\s*conditions/i.test(norm(textOf(p)))) ?? null;
  if (res.termsHeading) {
    for (const e of top.slice(top.indexOf(res.termsHeading) + 1)) {
      if (e.localName === 'p' && all(e, 'numPr').length > 0) res.termParas.push(e);
      else if (res.termParas.length > 0) break;
    }
  }
  return res;
}

const dateFormatOf = (s: string): MasterDefaults['dateFormat'] =>
  /\d{4}-\d{2}-\d{2}/.test(s) ? 'YYYY-MM-DD' : /\d{2}\/\d{2}\/\d{4}/.test(s) ? 'DD/MM/YYYY' : 'DD-MM-YYYY';

export function formatDate(iso: string, format: MasterDefaults['dateFormat']): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  const [, y, mo, d] = m;
  return format === 'YYYY-MM-DD' ? `${y}-${mo}-${d}` : format === 'DD/MM/YYYY' ? `${d}/${mo}/${y}` : `${d}-${mo}-${y}`;
}

// ─── reading defaults out of the master ──────────────────────────────────────

async function loadDoc(zip: JSZip): Promise<{ doc: Document; xml: string }> {
  const f = zip.file('word/document.xml');
  if (!f) throw new Error('This does not look like a Word (.docx) file.');
  const xml = await f.async('string');
  return { doc: new DOMParser().parseFromString(xml, 'text/xml') as unknown as Document, xml };
}

export async function readMasterDefaults(data: ArrayBuffer | Uint8Array): Promise<MasterDefaults> {
  let zip: JSZip;
  try { zip = await JSZip.loadAsync(data); } catch { throw new Error('This file could not be opened. Please upload a Word (.docx) file.'); }
  const { doc } = await loadDoc(zip);
  const loc = locate(doc);
  const problems: string[] = [];

  if (!loc.infoTable) problems.push('The grid with To / From / Ref / Date was not found, so those fields cannot be filled.');
  else {
    for (const k of ['to', 'ref', 'date'] as const) if (!loc.infoCells[k]) problems.push(`The "${k.toUpperCase()}:" box was not found in the grid.`);
  }
  if (!loc.itemsTable) problems.push('The items table (with Particulars, Qty and Amount columns) was not found.');
  if (!loc.termsHeading || loc.termParas.length === 0) problems.push('The numbered "Terms and Conditions" list was not found.');

  const dateCell = loc.infoCells.date;
  const pagesCell = loc.infoCells.pages;
  const valueOf = (c?: { tc: El; prefixLen: number }) => (c ? norm(textOf(c.tc)).replace(/^[^:]*:\s*/, '') : '');
  return {
    greeting: loc.greeting ? norm(textOf(loc.greeting)) : '',
    intro: loc.intro ? norm(textOf(loc.intro)) : '',
    subject: valueOf(loc.infoCells.subject),
    terms: loc.termParas.map((p) => norm(textOf(p))).filter(Boolean),
    dateFormat: dateFormatOf(valueOf(dateCell)),
    pagesDigits: Math.max(1, valueOf(pagesCell).match(/\d+/)?.[0].length ?? 2),
    problems,
  };
}

// ─── filling ─────────────────────────────────────────────────────────────────

function setInfoValue(doc: Document, tc: El, prefixLen: number, value: string) {
  const p = kids(tc, 'p')[0];
  for (const extra of kids(tc, 'p').slice(1)) tc.removeChild(extra);
  const runs = kids(p, 'r').filter((r) => all(r, 't').length > 0);
  let remaining = prefixLen;
  let valueTempl: El | null = null;
  for (const r of runs) {
    const t = textOf(r);
    if (remaining >= t.length && remaining > 0) {
      remaining -= t.length; // label run: keep as is
      continue;
    }
    if (remaining > 0) {
      // label and value share one run: keep the label part, reuse the run for the value
      valueTempl = r.cloneNode(true) as El;
      const kept = t.slice(0, remaining);
      for (const x of all(r, 't')) x.parentNode?.removeChild(x);
      const nt = doc.createElementNS(W, 'w:t') as El;
      nt.setAttribute('xml:space', 'preserve');
      nt.appendChild(doc.createTextNode(kept));
      r.appendChild(nt);
      remaining = 0;
      continue;
    }
    if (!valueTempl) valueTempl = r; // first run after the label
    p.removeChild(r);
  }
  if (value === '') return;
  const templ = valueTempl ?? runs[runs.length - 1] ?? null;
  const pPr = kids(p, 'pPr')[0];
  p.appendChild(makeRun(doc, templ, pPr ? kids(pPr, 'rPr')[0] ?? null : null, value));
}

function fillInfo(doc: Document, loc: Located, info: InfoFields, pagesField: string | null) {
  for (const key of Object.keys(info) as (keyof InfoFields)[]) {
    const cell = loc.infoCells[key];
    const v = info[key];
    if (!cell || v === undefined) continue;
    if (key === 'pages' && pagesField) {
      setInfoValue(doc, cell.tc, cell.prefixLen, '');
      const p = kids(cell.tc, 'p')[0];
      const last = kids(p, 'r').filter((r) => all(r, 't').length > 0).pop();
      const fld = doc.createElementNS(W, 'w:fldSimple') as El;
      fld.setAttributeNS(W, 'w:instr', ' NUMPAGES ');
      fld.appendChild(makeRun(doc, last ?? null, kids(kids(p, 'pPr')[0] ?? p, 'rPr')[0] ?? null, v));
      p.appendChild(fld);
    } else {
      setInfoValue(doc, cell.tc, cell.prefixLen, v);
    }
  }
}

function fillItems(doc: Document, loc: Located, data: FillData, fmt: (n: number) => string) {
  const table = loc.itemsTable;
  if (!table) return;
  const rows = kids(table, 'tr');
  const { cols } = loc;
  const amountCol = cols.amount!;
  const cellText = (r: El, i: number) => norm(textOf(kids(r, 'tc')[i] ?? r));
  const isNum = (s: string) => /^[\d,.\s]+$/.test(s) && /\d/.test(s);

  const bodyRows = rows.slice(1);
  const itemRows = bodyRows.filter((r) => isNum(cellText(r, cols.qty!)));
  const summaryRows = bodyRows.filter((r) => !itemRows.includes(r) && norm(textOf(r)) !== '');
  const proto = itemRows[0];
  if (!proto) return;

  const clones: El[] = [];
  const list = data.items.length > 0 ? data.items : [null];
  list.forEach((it, i) => {
    const row = proto.cloneNode(true) as El;
    const tcs = kids(row, 'tc');
    const put = (col: number | undefined, text: string) => { if (col !== undefined && col >= 0 && tcs[col]) setCellText(doc, tcs[col], text); };
    put(cols.sr, it ? String(i + 1) : '');
    put(cols.desc, it ? it.description : '');
    put(cols.unit, it ? it.uom : '');
    put(cols.qty, it ? String(it.qty) : '');
    put(cols.unitPrice, it ? fmt(it.unitPrice) : '');
    put(amountCol, it ? fmt(it.total) : '');
    clones.push(row);
  });
  const anchor = itemRows[itemRows.length - 1].nextSibling;
  for (const r of itemRows) table.removeChild(r);
  for (const c of clones) table.insertBefore(c, anchor);

  for (const r of summaryRows) {
    const tc = kids(r, 'tc')[amountCol];
    if (!tc) continue;
    const label = norm(textOf(r)).toLowerCase();
    const val = /payable|balance|grand/.test(label) ? data.grandTotal : /total|sub/.test(label) ? data.subtotal : null;
    if (val !== null) setCellText(doc, tc, fmt(val));
  }
}

function fillTerms(doc: Document, loc: Located, terms: string[]) {
  const paras = loc.termParas;
  if (paras.length === 0) return;
  const parent = paras[0].parentNode!;
  const anchor = paras[paras.length - 1].nextSibling;
  const plainProto = paras.find((p) => !all(p, 'b').some((b) => b.getAttributeNS(W, 'val') !== '0' && b.getAttribute('w:val') !== '0')) ?? paras[0];
  const labelProto = paras.find((p) => /^[^:]{2,40}:/.test(norm(textOf(p))) && all(p, 'b').some((b) => b.getAttribute('w:val') === '1')) ?? null;
  const byText = new Map(paras.map((p) => [norm(textOf(p)), p]));

  const boldRun = (): El | null => {
    const src = labelProto ?? null;
    return src ? firstTextRun(src) : null;
  };
  const plainRunSrc = firstTextRun(plainProto);

  const built: El[] = terms.map((t) => {
    const text = norm(t);
    const same = byText.get(text);
    if (same) return same.cloneNode(true) as El;
    const p = plainProto.cloneNode(true) as El;
    const pPr = kids(p, 'pPr')[0];
    for (const c of Array.from(p.childNodes)) if (c !== pPr) p.removeChild(c);
    const m = text.match(/^([^:]{2,40}):\s*(.*)$/);
    const rpr = pPr ? kids(pPr, 'rPr')[0] ?? null : null;
    if (m && boldRun()) {
      p.appendChild(makeRun(doc, boldRun(), rpr, m[1]));
      p.appendChild(makeRun(doc, plainRunSrc, rpr, `: ${m[2]}`));
    } else {
      p.appendChild(makeRun(doc, plainRunSrc, rpr, text));
    }
    return p;
  });
  for (const p of paras) parent.removeChild(p);
  for (const b of built) parent.insertBefore(b, anchor);
}

export interface FillResult {
  bytes: Uint8Array;
}

export async function fillMaster(master: ArrayBuffer | Uint8Array, data: FillData, opts: { dateFormat?: MasterDefaults['dateFormat'] } = {}): Promise<FillResult> {
  const zip = await JSZip.loadAsync(master);
  const { doc } = await loadDoc(zip);
  const loc = locate(doc);
  const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

  const info: InfoFields = { ...data.info };
  if (info.date && opts.dateFormat) info.date = formatDate(info.date, opts.dateFormat);
  if (loc.infoTable) fillInfo(doc, loc, { ...info, ...(data.pagesCached ? { pages: data.pagesCached } : {}) }, data.pagesCached ? 'field' : null);
  if (loc.greeting && data.greeting !== undefined) setParagraphText(doc, loc.greeting, data.greeting);
  if (loc.intro && data.intro !== undefined) setParagraphText(doc, loc.intro, data.intro);
  fillItems(doc, loc, data, fmt);
  fillTerms(doc, loc, data.terms);
  stripHighlight(loc.body); // highlighted text in the sample marks "fill me in"; a finished quote has none

  zip.file('word/document.xml', new XMLSerializer().serializeToString(doc as never));
  return { bytes: await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' }) };
}

// ─── helpers for the on-screen PREVIEW only (the downloaded file never goes through these) ───

/** The browser preview drops Word "fields" such as the page count. Show their text instead. */
export async function previewCopy(bytes: Uint8Array): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(bytes);
  const { doc } = await loadDoc(zip);
  for (const f of all(doc, 'fldSimple')) {
    const parent = f.parentNode;
    if (!parent) continue;
    for (const c of Array.from(f.childNodes)) parent.insertBefore(c, f);
    parent.removeChild(f);
  }
  zip.file('word/document.xml', new XMLSerializer().serializeToString(doc as never));
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}

export interface HeaderImagePlacement { leftPx: number; topPx: number; widthPx: number; heightPx: number }

/** Where the header picture (the logo) sits on the page, in screen pixels at 96 dpi. */
export async function readHeaderImagePlacement(bytes: Uint8Array): Promise<HeaderImagePlacement | null> {
  const zip = await JSZip.loadAsync(bytes);
  const h = zip.file('word/header1.xml');
  const d = zip.file('word/document.xml');
  if (!h || !d) return null;
  const hdoc = new DOMParser().parseFromString(await h.async('string'), 'text/xml') as unknown as Document;
  const anchor = Array.from(hdoc.getElementsByTagName('wp:anchor'))[0];
  if (!anchor) return null;
  const first = (n: Element, tag: string) => Array.from(n.getElementsByTagName(tag))[0] as Element | undefined;
  const posH = first(anchor, 'wp:positionH');
  const posV = first(anchor, 'wp:positionV');
  const ext = first(anchor, 'wp:extent');
  if (!posH || !posV || !ext) return null;
  const emu = (v: string | null | undefined) => (Number(v) || 0) / 9525;
  const ddoc = new DOMParser().parseFromString(await d.async('string'), 'text/xml') as unknown as Document;
  const mar = Array.from(ddoc.getElementsByTagNameNS(W, 'pgMar'))[0];
  const tw = (a: string) => ((Number(mar?.getAttributeNS(W, a) ?? mar?.getAttribute(`w:${a}`)) || 0) / 1440) * 96;
  const hRel = posH.getAttribute('relativeFrom');
  const vRel = posV.getAttribute('relativeFrom');
  const baseLeft = hRel === 'page' ? 0 : tw('left');
  const baseTop = vRel === 'page' ? 0 : vRel === 'margin' ? tw('top') : tw('header'); // "paragraph": the header starts at the header distance
  return {
    leftPx: baseLeft + emu(first(posH, 'wp:posOffset')?.textContent),
    topPx: baseTop + emu(first(posV, 'wp:posOffset')?.textContent),
    widthPx: emu(ext.getAttribute('cx')),
    heightPx: emu(ext.getAttribute('cy')),
  };
}
