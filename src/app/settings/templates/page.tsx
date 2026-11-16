'use client';

import React, { useEffect, useRef, useState } from 'react';
import { FileCog, Upload, CheckCircle2, AlertTriangle, Trash2, Plus, Lock, FileText, Info } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { DEFAULT_TAX_STATEMENT, extractOfficeTemplate, type TemplateDraft } from '@/lib/docx-template';
import type { OfficeTemplate, TemplateRules } from '@/types';

const EMPTY_RULES: TemplateRules = {
  defaultMarginPct: null,
  minMarginPct: null,
  defaultValidityDays: null,
  maxValidityDays: null,
  maxCreditDays: null,
};

const blankDraft = (): TemplateDraft => ({
  sourceDocName: '',
  letterhead: { lines: [], logoDataUrl: null, backgroundPdfDataUrl: null, backgroundPdfName: '', footerLines: [] },
  signatory: { company: '', name: '', designation: '' },
  terms: [],
  refHint: '',
  taxStatement: DEFAULT_TAX_STATEMENT,
  rules: { ...EMPTY_RULES },
});

const toDraft = (t: OfficeTemplate): TemplateDraft => {
  const { version, publishedAt, publishedBy, ...rest } = t;
  void version; void publishedAt; void publishedBy;
  return JSON.parse(JSON.stringify(rest)) as TemplateDraft;
};

const lines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);

// ─── Read-only preview of the template (used for everyone, and as the live preview for admins) ───
function TemplatePreview({ t }: { t: TemplateDraft }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-5 text-[11px] leading-relaxed text-slate-800">
      <div className="border-b border-slate-200 pb-3 mb-3 flex items-start gap-3">
        {t.letterhead.logoDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={t.letterhead.logoDataUrl} alt="Company logo" className="h-10 w-auto" />
        )}
        <div>
          {t.letterhead.lines.length ? (
            t.letterhead.lines.map((l, i) => (
              <div key={i} className={i === 0 ? 'font-bold text-xs' : 'text-slate-500'}>{l}</div>
            ))
          ) : (
            <div className="text-slate-400 italic">No letterhead yet</div>
          )}
        </div>
      </div>
      <div className="text-slate-400 italic mb-3">— quotation details and items are filled in for each quote —</div>
      <div className="mb-3">{t.taxStatement}</div>
      {t.terms.length > 0 && (
        <>
          <div className="font-bold mb-1">Terms &amp; Conditions</div>
          <ol className="list-decimal pl-4 space-y-0.5 mb-3">
            {t.terms.map((x, i) => <li key={i}>{x}</li>)}
          </ol>
        </>
      )}
      {(t.signatory.name || t.signatory.company) && (
        <div className="mt-4">
          <div>Regards,</div>
          {t.signatory.company && <div className="font-semibold">For {t.signatory.company}</div>}
          <div className="mt-5 font-semibold">{t.signatory.name}</div>
          <div className="text-slate-500">{t.signatory.designation}</div>
        </div>
      )}
      {t.letterhead.footerLines.length > 0 && (
        <div className="border-t border-slate-200 mt-4 pt-2 text-slate-500">
          {t.letterhead.footerLines.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}
    </div>
  );
}

export default function TemplateSettingsPage() {
  const { officeTemplate, publishTemplate, isAdmin } = useApp();

  const [draft, setDraft] = useState<TemplateDraft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [findings, setFindings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ savedToCloud: boolean; version: number } | null>(null);

  const docxRef = useRef<HTMLInputElement>(null);

  // Start from the published template, unless the admin is mid-edit.
  useEffect(() => {
    if (!dirty && officeTemplate) setDraft(toDraft(officeTemplate));
  }, [officeTemplate, dirty]);

  const edit = (fn: (d: TemplateDraft) => TemplateDraft) => {
    setDraft((d) => fn(d ?? blankDraft()));
    setDirty(true);
    setResult(null);
  };

  const onDocx = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    if (!file.name.toLowerCase().endsWith('.docx')) {
      setError('Please choose a Word file that ends in .docx. (Old .doc files: open them in Word and "Save As" .docx first.)');
      return;
    }
    setBusy(true);
    try {
      const out = await extractOfficeTemplate(await file.arrayBuffer(), file.name);
      // keep the limits the admin already set
      setDraft((prev) => ({ ...out.draft, rules: prev?.rules ?? out.draft.rules }));
      setFindings(out.findings);
      setDirty(true);
      setResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That file could not be read.');
    } finally {
      setBusy(false);
    }
  };

  const num = (v: string): number | null => {
    if (v.trim() === '') return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  const problems: string[] = [];
  if (draft) {
    const hasLetterhead = draft.letterhead.lines.length > 0 || !!draft.letterhead.logoDataUrl;
    if (!hasLetterhead) problems.push('Add the company letterhead (company name and address, or a logo).');
    if (!draft.signatory.name.trim()) problems.push('Add the name of the person who signs quotations.');
    const r = draft.rules;
    if (r.minMarginPct !== null && r.defaultMarginPct !== null && r.defaultMarginPct < r.minMarginPct) {
      problems.push('The default margin is lower than the minimum margin.');
    }
    if (r.maxValidityDays !== null && r.defaultValidityDays !== null && r.defaultValidityDays > r.maxValidityDays) {
      problems.push('The default validity is longer than the maximum validity.');
    }
  }

  const onPublish = async () => {
    if (!draft || problems.length) return;
    setBusy(true);
    setError(null);
    const res = await publishTemplate(draft);
    setBusy(false);
    if (!res.ok) {
      setError('Only an admin can publish the template.');
      return;
    }
    setDirty(false);
    setResult({ savedToCloud: res.savedToCloud, version: (officeTemplate?.version ?? 0) + 1 });
  };

  // ── Everyone except admins: read-only view ──────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto p-4 sm:p-8 overflow-y-auto h-full select-text">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2"><FileCog className="w-5 h-5 text-[#FF4D6D]" /> Quote Template</h1>
        <p className="text-sm text-slate-600 mt-1 mb-5 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Set by your admin. All quotations use it exactly as it is.</p>
        {officeTemplate ? (
          <>
            <p className="text-xs text-slate-500 mb-3">Version {officeTemplate.version} · published by {officeTemplate.publishedBy} on {new Date(officeTemplate.publishedAt).toLocaleDateString()}</p>
            <TemplatePreview t={toDraft(officeTemplate)} />
          </>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">The template has not been set up yet. Please ask an admin to set it up.</div>
        )}
      </div>
    );
  }

  // ── Admin ───────────────────────────────────────────────────────────────────
  const d = draft;
  const label = 'block text-xs font-semibold text-slate-700 mb-1';
  const field = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:border-[#FF4D6D]';

  return (
    <div className="h-full overflow-y-auto select-text">
      <div className="max-w-6xl mx-auto p-4 sm:p-8 grid lg:grid-cols-[1fr_380px] gap-6">
        <div className="space-y-6 min-w-0">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2"><FileCog className="w-5 h-5 text-[#FF4D6D]" /> Quote Template</h1>
            <p className="text-sm text-slate-600 mt-1">
              Set this up once. Employees can only fill in the quote details. They cannot change the letterhead or terms.
              {officeTemplate && <> Currently published: <b>version {officeTemplate.version}</b> by {officeTemplate.publishedBy}.</>}
            </p>
          </div>

          {/* Step 1 */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5">
            <h2 className="font-bold text-slate-900 text-sm mb-1">Step 1 · Upload a sample quotation</h2>
            <p className="text-xs text-slate-600 mb-3">
              Choose one of your real, approved quotations as a Word file (.docx). We copy the letterhead, terms and signature from it word for word. We never write any text ourselves.
            </p>
            <input ref={docxRef} type="file" accept=".docx" onChange={onDocx} className="hidden" />
            <div className="flex flex-wrap gap-2">
              <button onClick={() => docxRef.current?.click()} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-900 hover:bg-black text-white text-sm font-semibold disabled:opacity-50 cursor-pointer">
                <Upload className="w-4 h-4" /> {busy ? 'Reading…' : d ? 'Upload a different sample' : 'Choose Word file'}
              </button>
              {!d && (
                <button onClick={() => { setDraft(blankDraft()); setDirty(true); }} className="px-4 py-2.5 rounded-full border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
                  I will type it in myself
                </button>
              )}
            </div>
            {d?.sourceDocName && <p className="text-xs text-slate-500 mt-2 flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Copied from {d.sourceDocName}</p>}
            {findings.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-slate-700">
                {findings.map((f, i) => (
                  <li key={i} className="flex gap-1.5"><Info className="w-3.5 h-3.5 mt-0.5 text-slate-400 flex-shrink-0" />{f}</li>
                ))}
              </ul>
            )}
          </section>

          {error && <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm p-3 flex gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />{error}</div>}

          {d && (
            <>
              {/* Step 2 */}
              <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <h2 className="font-bold text-slate-900 text-sm">Step 2 · Check what was copied</h2>

                <div>
                  <label className={label}>Letterhead (one line each — company name first)</label>
                  <textarea rows={3} className={field} value={d.letterhead.lines.join('\n')} onChange={(e) => edit((x) => ({ ...x, letterhead: { ...x.letterhead, lines: lines(e.target.value) } }))} />
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                    {d.letterhead.logoDataUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={d.letterhead.logoDataUrl} alt="Logo" className="h-8 w-auto border border-slate-200 rounded" />
                        <button onClick={() => edit((x) => ({ ...x, letterhead: { ...x.letterhead, logoDataUrl: null } }))} className="text-red-600 font-semibold cursor-pointer">Remove logo</button>
                      </>
                    ) : <span className="text-slate-500">No logo copied.</span>}
                  </div>
                </div>

                <div>
                  <label className={label}>Footer lines (optional)</label>
                  <textarea rows={2} className={field} value={d.letterhead.footerLines.join('\n')} onChange={(e) => edit((x) => ({ ...x, letterhead: { ...x.letterhead, footerLines: lines(e.target.value) } }))} />
                </div>

                <div>
                  <label className={label}>Standard terms &amp; conditions (printed on every quote, in this order)</label>
                  <div className="space-y-2">
                    {d.terms.map((t, i) => (
                      <div key={i} className="flex gap-2 items-start">
                        <span className="text-xs text-slate-400 w-5 pt-2.5 text-right">{i + 1}.</span>
                        <textarea rows={2} className={field} value={t} onChange={(e) => edit((x) => ({ ...x, terms: x.terms.map((y, j) => (j === i ? e.target.value : y)) }))} />
                        <button onClick={() => edit((x) => ({ ...x, terms: x.terms.filter((_, j) => j !== i) }))} className="p-2 text-slate-400 hover:text-red-600 cursor-pointer" title="Remove this clause"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                    <button onClick={() => edit((x) => ({ ...x, terms: [...x.terms, ''] }))} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-black cursor-pointer"><Plus className="w-3.5 h-3.5" /> Add a clause</button>
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                  <div><label className={label}>Signing company</label><input className={field} value={d.signatory.company} onChange={(e) => edit((x) => ({ ...x, signatory: { ...x.signatory, company: e.target.value } }))} /></div>
                  <div><label className={label}>Signatory name</label><input className={field} value={d.signatory.name} onChange={(e) => edit((x) => ({ ...x, signatory: { ...x.signatory, name: e.target.value } }))} /></div>
                  <div><label className={label}>Designation</label><input className={field} value={d.signatory.designation} onChange={(e) => edit((x) => ({ ...x, signatory: { ...x.signatory, designation: e.target.value } }))} /></div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className={label}>Quotation number format (shown as a hint to employees)</label>
                    <input className={field} value={d.refHint} placeholder="e.g. the sample's own “Ref:” line" onChange={(e) => edit((x) => ({ ...x, refHint: e.target.value }))} />
                  </div>
                  <div>
                    <label className={label}>Tax statement printed under the total</label>
                    <input className={field} value={d.taxStatement} onChange={(e) => edit((x) => ({ ...x, taxStatement: e.target.value }))} />
                  </div>
                </div>
              </section>

              {/* Optional rules */}
              <section className="bg-white border border-slate-200 rounded-2xl p-5">
                <h2 className="font-bold text-slate-900 text-sm mb-1">Company limits (optional)</h2>
                <p className="text-xs text-slate-600 mb-3">Leave a box empty if there is no such rule. Nothing is assumed. Employees get a clear warning when a quote goes outside a limit you set.</p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {([
                    ['defaultMarginPct', 'Usual margin (%)', 'Used when an employee does not say a margin'],
                    ['minMarginPct', 'Lowest allowed margin (%)', 'Warn below this'],
                    ['defaultValidityDays', 'Usual validity (days)', 'Pre-filled on new quotes'],
                    ['maxValidityDays', 'Longest validity (days)', 'Warn above this'],
                    ['maxCreditDays', 'Longest credit (days)', 'Warn if payment terms mention more'],
                  ] as [keyof TemplateRules, string, string][]).map(([k, t, hint]) => (
                    <div key={k}>
                      <label className={label}>{t}</label>
                      <input type="number" min={0} className={field} value={d.rules[k] ?? ''} onChange={(e) => edit((x) => ({ ...x, rules: { ...x.rules, [k]: num(e.target.value) } }))} />
                      <div className="text-[11px] text-slate-500 mt-0.5">{hint}</div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Step 3 */}
              <section className="bg-white border border-slate-200 rounded-2xl p-5">
                <h2 className="font-bold text-slate-900 text-sm mb-2">Step 3 · Publish</h2>
                {problems.length > 0 && (
                  <ul className="mb-3 space-y-1 text-xs text-red-700">
                    {problems.map((p, i) => <li key={i} className="flex gap-1.5"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />{p}</li>)}
                  </ul>
                )}
                {d.terms.some((t) => !t.trim()) && <p className="text-xs text-amber-700 mb-3">Some terms are empty. Empty clauses are skipped.</p>}
                <button onClick={onPublish} disabled={busy || problems.length > 0 || (!dirty && !!officeTemplate)} className="px-5 py-2.5 rounded-full bg-[#FF4D6D] hover:bg-[#FA3B5E] text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                  {officeTemplate ? `Publish as version ${officeTemplate.version + 1}` : 'Publish template'}
                </button>
                {!dirty && officeTemplate && !result && <span className="text-xs text-slate-500 ml-3">No changes to publish.</span>}
                {result && (
                  <div className="mt-3 text-sm">
                    <div className="text-emerald-700 flex items-center gap-1.5 font-semibold"><CheckCircle2 className="w-4 h-4" /> Published as version {result.version}. New quotes use it now.</div>
                    {!result.savedToCloud && (
                      <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-xs p-2.5">
                        It is saved on this computer only. The shared database did not accept it, so other computers will not see it yet.
                      </div>
                    )}
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        {/* Live preview */}
        <aside className="lg:sticky lg:top-6 self-start">
          <div className="text-xs font-semibold text-slate-500 mb-2">What employees will get</div>
          {d ? <TemplatePreview t={d} /> : <div className="text-xs text-slate-500 border border-dashed border-slate-300 rounded-xl p-6 text-center">Upload a sample to see the preview.</div>}
        </aside>
      </div>
    </div>
  );
}
