// ==============================================================================
// Reads a Word (.docx) sample quotation and proposes an office template from it.
// It only COPIES what is in the document (header lines, footer lines, logo, the
// terms between the "Terms & Conditions" heading and the closing, the signatory
// block). It never writes text of its own: anything it cannot find is left empty
// and reported, so the admin can fill it in or fix it before publishing.
//
// Mammoth does not read Word headers/footers (where letterheads live), so we
// read the .docx XML directly.
// ==============================================================================

import JSZip from 'jszip';
import type { OfficeTemplate } from '../types';

export type TemplateDraft = Omit<OfficeTemplate, 'version' | 'publishedAt' | 'publishedBy'>;

export interface ExtractResult {
  draft: TemplateDraft;
  /** Plain-language notes about what was found / not found, for the admin. */
  findings: string[];
}

const MAX_LOGO_BYTES = 300 * 1024;

export const DEFAULT_TAX_STATEMENT = 'Total payable is exclusive of GST and all other applicable taxes.';

const decode = (s: string): string =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&');

/** Paragraphs of one XML part, in document order, with a flag for paragraphs that are bullets or numbered items. */
export function paragraphsWithList(xml: string): { text: string; list: boolean }[] {
  const out: { text: string; list: boolean }[] = [];
  for (const p of xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? []) {
    const withBreaks = p.replace(/<w:tab\s*\/>/g, '<w:t> </w:t>').replace(/<w:br\s*\/>/g, '<w:t> </w:t>');
    let text = '';
    for (const m of withBreaks.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)) text += m[1];
    text = decode(text).replace(/\s+/g, ' ').trim();
    if (text && text !== out[out.length - 1]?.text) out.push({ text, list: /<w:numPr>/.test(p) }); // also drops mc:Fallback duplicates
  }
  return out;
}

/** Paragraph texts of one XML part, in document order. */
export function paragraphsOf(xml: string): string[] {
  return paragraphsWithList(xml).map((p) => p.text);
}

const partNames = (zip: JSZip, prefix: string): string[] =>
  Object.keys(zip.files)
    .filter((n) => new RegExp(`^word/${prefix}\\d*\\.xml$`).test(n))
    .sort();

const stripNumbering = (s: string): string => s.replace(/^\s*(?:\(?\d{1,2}[.)]|\(?[a-zA-Z][.)]|[•\-–·])\s+/, '').trim();

const TERMS_HEADING = /^(?:\d+[.)]\s*)?(?:general\s+)?terms\s*(?:(?:&|and)\s*conditions?)?\s*:?$/i;
const CLOSING = /^(?:best\s+|kind\s+|warm\s+)?(?:regards|yours\s+(?:sincerely|faithfully|truly)|sincerely|thanking\s+you|thank\s+you)\b/i;
const COMPANY_LINE = /^for\s+\S|\b(?:ltd|limited|pvt|llc|inc|solutions|company|enterprises|industries)\b\.?$/i;

async function logoFrom(zip: JSZip, headerNames: string[]): Promise<{ url: string | null; note: string | null }> {
  for (const name of headerNames) {
    const xml = await zip.file(name)!.async('string');
    const embed = xml.match(/r:embed="([^"]+)"/)?.[1];
    if (!embed) continue;
    const relsFile = zip.file(name.replace('word/', 'word/_rels/') + '.rels');
    if (!relsFile) continue;
    const rels = await relsFile.async('string');
    const rel = [...rels.matchAll(/<Relationship\b[^>]*>/g)].map((m) => m[0]).find((r) => r.includes(`Id="${embed}"`));
    const target = rel?.match(/Target="([^"]+)"/)?.[1];
    if (!target) continue;
    const path = 'word/' + target.replace(/^\.?\//, '');
    const img = zip.file(path);
    if (!img) continue;
    const ext = path.split('.').pop()?.toLowerCase();
    const mime = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : null;
    if (!mime) return { url: null, note: `The logo is a .${ext} image, which cannot be shown here. Upload the letterhead PDF instead.` };
    const b64 = await img.async('base64');
    if (b64.length * 0.75 > MAX_LOGO_BYTES) {
      return { url: null, note: 'The logo image is too large to store. Upload the letterhead PDF instead.' };
    }
    return { url: `data:${mime};base64,${b64}`, note: null };
  }
  return { url: null, note: null };
}

export async function extractOfficeTemplate(data: ArrayBuffer | Uint8Array, fileName: string): Promise<ExtractResult> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(data);
  } catch {
    throw new Error('This file could not be opened. Please upload a Word (.docx) file.');
  }
  const docFile = zip.file('word/document.xml');
  if (!docFile) throw new Error('This does not look like a Word (.docx) file.');

  const findings: string[] = [];
  const bodyP = paragraphsWithList(await docFile.async('string'));
  const body = bodyP.map((p) => p.text);

  // Letterhead (header) and footer lines
  const headerNames = partNames(zip, 'header');
  const footerNames = partNames(zip, 'footer');
  const uniq = (xs: string[]) => [...new Set(xs)];
  const headerLines = uniq((await Promise.all(headerNames.map(async (n) => paragraphsOf(await zip.file(n)!.async('string'))))).flat());
  const footerLines = uniq((await Promise.all(footerNames.map(async (n) => paragraphsOf(await zip.file(n)!.async('string'))))).flat());
  const logo = await logoFrom(zip, headerNames);

  if (headerLines.length === 0) findings.push('No letterhead text was found in the document header. Type the company name and address below, or upload the letterhead PDF.');
  else findings.push(`Letterhead: ${headerLines.length} line(s) copied from the document header.`);
  if (footerLines.length) findings.push(`Footer: ${footerLines.length} line(s) copied.`);
  if (logo.url) findings.push('Logo image copied from the header.');
  if (logo.note) findings.push(logo.note);

  // Terms between the heading and the closing
  const termsAt = body.findIndex((l) => TERMS_HEADING.test(l));
  const closingAt = body.findIndex((l, i) => i > Math.max(termsAt, -1) && CLOSING.test(l));
  let terms: string[] = [];
  if (termsAt >= 0) {
    let end = closingAt > termsAt ? closingAt : Math.min(body.length, termsAt + 1 + 15);
    // When the clauses are a bulleted/numbered list in Word, the terms are exactly that list;
    // paragraphs after it (a sign-off, a note) are not terms.
    if (bodyP[termsAt + 1]?.list) {
      let k = termsAt + 1;
      while (k < bodyP.length && bodyP[k].list) k++;
      end = Math.min(end, k);
    }
    terms = body.slice(termsAt + 1, end).map(stripNumbering).filter(Boolean);
    findings.push(`Terms & Conditions: ${terms.length} clause(s) copied word for word.`);
    if (closingAt < 0) findings.push('No closing ("Regards") was found after the terms, so please check where the terms end.');
  } else {
    findings.push('No "Terms & Conditions" heading was found. Paste the standard terms below.');
  }

  // Signatory block after the closing line
  let signatory = { company: '', name: '', designation: '' };
  if (closingAt >= 0) {
    // "Thank you!" followed by "Best Regards," are both closings: the signature starts after the last one.
    let sigFrom = closingAt + 1;
    while (sigFrom < body.length && CLOSING.test(body[sigFrom])) sigFrom++;
    // Phone numbers are personal to whoever sends the quote; never copy one into the shared template.
    const after = body.slice(sigFrom, sigFrom + 4).filter((l) => !/^\+?[\d\s().-]{7,}$/.test(l) && l.length <= 60 && !/^note\b/i.test(l));
    const companyLine = after.find((l) => COMPANY_LINE.test(l));
    const rest = after.filter((l) => l !== companyLine);
    signatory = {
      company: companyLine ? companyLine.replace(/^for\s+/i, '').trim() : '',
      name: rest[0] ?? '',
      designation: rest[1] ?? '',
    };
    findings.push(signatory.name ? 'Signatory copied. Please check it.' : 'No signatory name was found. Please fill it in.');
  } else {
    findings.push('No signatory block was found. Please fill it in.');
  }

  // Quote-number example and tax statement, only if the document has them
  const refHint = body.find((l) => /^(?:our\s+)?(?:ref(?:erence)?|quotation\s*(?:no|number|#))\b.*[:#]/i.test(l)) ?? '';
  const taxLine = body.find((l) => /\b(?:exclusive|inclusive)\b.*\b(?:gst|tax)/i.test(l));
  const taxStatement = taxLine ?? DEFAULT_TAX_STATEMENT;
  if (!taxLine) findings.push('The sample has no GST/tax line, so the standard "exclusive of GST and taxes" line is pre-filled. Change it if needed.');

  return {
    draft: {
      sourceDocName: fileName,
      letterhead: {
        lines: headerLines,
        logoDataUrl: logo.url,
        backgroundPdfDataUrl: null,
        backgroundPdfName: '',
        footerLines,
      },
      signatory,
      terms,
      refHint,
      taxStatement,
      rules: { defaultMarginPct: null, minMarginPct: null, defaultValidityDays: null, maxValidityDays: null, maxCreditDays: null },
    },
    findings,
  };
}
