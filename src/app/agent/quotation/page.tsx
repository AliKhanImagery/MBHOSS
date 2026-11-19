'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Archive, AlertTriangle, Check, CheckCircle2, Clock, ChevronsRight, Download, Eye, FilePlus2, Pencil, MessageSquare, Paperclip, Plus, Save, Send, Trash2, Undo2, X, XCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { checkQuote, formatPKR } from '@/lib/quote-engine';
import { formatRef, freedSlots, nextRef, numberInRange, withIgnored } from '@/lib/quote-range';
import { authHeaders } from '@/lib/supabase';
import { TopBarActions } from '@/components/TopBarActions';
import { prepareImage, type PreparedImage } from '@/lib/image-prepare';
import { fillMaster } from '@/lib/docx-master';
import { approvalChecks, approvalState, approve, cancelApproval, canDecide, requestApproval, sendBack } from '@/lib/quote-approval';
import { canArchive, confirmPrices, followUpState, hold, isArchived, lifecycleChecks, priceAgeDays, resume, STALE_PRICE_DAYS, WAITING_LABEL, WAITING_REASONS } from '@/lib/quote-lifecycle';
import type { WaitingReason } from '@/types';
import { base64ToBytes, buildFillData, masterChecks } from '@/lib/quote-master';
import { MasterPreview, estimatePages } from '@/components/MasterPreview';
import type { QuotationTemplate } from '@/types';

interface AssistantResponse {
  ok: boolean;
  error?: string;
  quote?: QuotationTemplate;
  reply?: string;
  changes?: string[];
}

const STARTERS = [
  'Client is [client name]',
  'Add [number] of [item name] at [margin]% margin',
  'Delivery in [number] weeks, payment [terms]',
];

// Plain inline field: looks like a form box on screen, like normal text when printed.
const inline =
  'bg-transparent border-b border-dashed border-slate-300 focus:border-[#FF4D6D] focus:outline-none px-0.5 py-0.5 print:border-0 w-full';

// Text box that grows to fit its text, so nothing is ever cut off on screen or in the PDF.
function AutoText({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; };
    fit();
    window.addEventListener('resize', fit);
    window.addEventListener('beforeprint', fit);
    return () => { window.removeEventListener('resize', fit); window.removeEventListener('beforeprint', fit); };
  }, [value]);
  return <textarea ref={ref} rows={1} value={value} onChange={(e) => onChange(e.target.value)} className={className} />;
}

function QuotationContent() {
  const params = useSearchParams();
  const deepLinkPrompt = params.get('prompt');
  const deepLinkSent = useRef(false);

  const {
    currentUser, isAdmin, officeTemplate, dataBank, users, activeCases, updateUserFeatures,
    templateState: q, updateTemplateField, updateLineItem, addLineItem, removeLineItem,
    applyQuote, undoQuote, canUndo, startNewQuote, saveCurrentCase, restoreCase,
    chatMessages, addChatMessage,
  } = useApp();

  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [tab, setTab] = useState<'quote' | 'assistant'>('quote');
  const [chatOpen, setChatOpen] = useState(true);
  const [attached, setAttached] = useState<PreparedImage | null>(null);
  const [attachNote, setAttachNote] = useState<string | null>(null);
  const [holdOpen, setHoldOpen] = useState(false);
  const [holdForm, setHoldForm] = useState<{ reason: WaitingReason; note: string; owner: string; followUp: string }>({ reason: 'ceo_confirming', note: '', owner: '', followUp: '' });
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  const [previewBytes, setPreviewBytes] = useState<Uint8Array | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const feedEnd = useRef<HTMLDivElement>(null);

  // remember whether the assistant panel was left open or collapsed
  useEffect(() => {
    try { if (localStorage.getItem('qri_chat_open') === '0') setChatOpen(false); } catch { /* ignore */ }
  }, []);
  const setChat = (open: boolean) => {
    setChatOpen(open);
    try { localStorage.setItem('qri_chat_open', open ? '1' : '0'); } catch { /* ignore */ }
  };

  const canSeeCosts = !!currentUser?.features.marginOverride;
  const canDownload = !!currentUser?.features.directPdfExport;
  const rules = officeTemplate?.rules;

  // The number range an admin assigned to this person (looked up live so admin edits show up after a sync)
  const range = users.find((u) => u.id === currentUser?.id)?.features?.quoteRange ?? currentUser?.features.quoteRange;
  const usedRefs = useMemo(() => activeCases.map((c) => c.caseRef), [activeCases]);
  const upcoming = useMemo(() => (range ? nextRef(range, usedRefs) : null), [range, usedRefs]);
  const rangeLocked = !!range && !isAdmin;

  // Numbers freed by deleted quotes: offered once per quote, never forced.
  const freed = useMemo(() => (range ? freedSlots(range, usedRefs) : []), [range, usedRefs]);
  const [keptNormalFor, setKeptNormalFor] = useState<string | null>(null);
  const offer = freed[0];
  const showFreedOffer =
    !!range && offer !== undefined && upcoming?.ok === true && q.quoteRef === upcoming.ref && keptNormalFor !== q.quoteRef && !usedRefs.includes(q.quoteRef);
  const ignoreFreed = async (numbers: number[]) => {
    if (!range || !currentUser) return;
    const ok = await updateUserFeatures(currentUser.id, { quoteRange: withIgnored(range, numbers) });
    flash(ok ? 'Done. That number will not be offered again.' : 'Done on this device, but the cloud did not save it.');
  };

  // A blank quotation takes the next number from the person's own range automatically.
  useEffect(() => {
    if (officeTemplate && upcoming && upcoming.ok && !q.quoteRef.trim()) updateTemplateField('quoteRef', upcoming.ref);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [officeTemplate, upcoming?.ok ? upcoming.ref : null, q.quoteRef]);

  const checks = useMemo(() => {
    const base = rules ? checkQuote(q, rules) : [];
    const extra: typeof base = [];
    if (range && upcoming && !upcoming.ok && !q.quoteRef.trim()) {
      extra.push({ severity: 'block', code: 'ref_range_used_up', message: 'Your quotation numbers have run out. Please ask an admin for a new range.' });
    } else if (range && q.quoteRef.trim() && numberInRange(range, q.quoteRef) === null) {
      extra.push({ severity: isAdmin ? 'warn' : 'block', code: 'ref_out_of_range', message: 'This quotation number is outside the range assigned to you.' });
    } else if (!range && !isAdmin) {
      extra.push({ severity: 'warn', code: 'no_range', message: 'No quotation number range is assigned to you yet. Please ask an admin.' });
    }
    const masterExtra = officeTemplate?.masterDocxBase64 ? masterChecks(q, officeTemplate) : [];
    const life = lifecycleChecks(q, new Date().toISOString().slice(0, 10));
    const baseKept = base.filter((c) => !(c.code === 'no_price' && q.lineItems.find((l) => l.id === c.lineId)?.ratePending)); // a pending rate is already reported
    const actorNow = currentUser ? { id: currentUser.id, name: currentUser.name, role: currentUser.role } : null;
    const all = [...extra, ...masterExtra, ...life, ...approvalChecks(q, actorNow), ...baseKept];
    return all.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'block' ? -1 : 1));
  }, [q, rules, range, upcoming, isAdmin, officeTemplate, currentUser?.id, currentUser?.role]);
  const blocking = checks.filter((c) => c.severity === 'block');

  useEffect(() => {
    feedEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, thinking]);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // ── Life of the quote: hold, resume, recheck prices ──
  const who = currentUser ? { id: currentUser.id, name: currentUser.name, role: currentUser.role } : null;
  const today = new Date().toISOString().slice(0, 10);
  const lc = q.lifecycle;
  const archived = isArchived(lc);
  const savedCase = activeCases.find((c) => c.caseRef === q.quoteRef.trim());
  const mayManage = !!who && (!savedCase || canArchive(lc, who)); // an unsaved quote is the maker's own; a saved one needs owner or admin
  const persist = (msg: string) => {
    if (saveCurrentCase()) flash(msg);
    else flash('Add the quotation number first, so this can be saved.');
  };
  const applyHold = () => {
    if (!who) return;
    updateTemplateField('lifecycle', hold(lc, { ...holdForm, followUp: holdForm.followUp || null }, who, new Date()));
    setHoldOpen(false);
    persist('Put on hold and saved.');
  };
  const resumeQuote = () => { if (!who) return; updateTemplateField('lifecycle', resume(lc, who, new Date())); persist('Taken off hold and saved.'); };
  const recheckPrices = () => { if (!who) return; updateTemplateField('lifecycle', confirmPrices(lc, who, new Date())); persist('Prices marked as rechecked today.'); };
  const priceAge = priceAgeDays(q, today);

  // ── Approval: ask one colleague; they may edit, then approve or send back ──
  const [askOpen, setAskOpen] = useState(false);
  const [askTarget, setAskTarget] = useState('');
  const [askNote, setAskNote] = useState('');
  const [backOpen, setBackOpen] = useState(false);
  const [backNote, setBackNote] = useState('');
  const aState = approvalState(q);
  const appr = lc?.approval;
  const askable = users.filter((u) => !who || u.id !== who.id || isAdmin);
  const sendAsk = () => {
    const target = users.find((u) => u.id === askTarget);
    if (!who || !target) return;
    updateTemplateField('lifecycle', requestApproval(lc, { id: target.id, name: target.name }, who, askNote, new Date()));
    setAskOpen(false); setAskNote('');
    persist(`Asked ${target.name} to approve.`);
  };
  const doApprove = () => { if (!who) return; updateTemplateField('lifecycle', approve(lc, q, who, new Date())); persist('Approved and saved.'); };
  const doSendBack = () => { if (!who || !backNote.trim()) return; updateTemplateField('lifecycle', sendBack(lc, who, backNote, new Date())); setBackOpen(false); setBackNote(''); persist('Sent back and saved.'); };
  const doCancelAsk = () => { if (!who) return; updateTemplateField('lifecycle', cancelApproval(lc, who, new Date())); persist('Request cancelled.'); };
  const iDecide = !!who && canDecide(lc, who);

  // ── Word master: the document is made by filling the admin's approved .docx ──
  const isMaster = !!officeTemplate?.masterDocxBase64;
  const makeWord = async (): Promise<Uint8Array> => {
    const t0 = officeTemplate!;
    const master = base64ToBytes(t0.masterDocxBase64!);
    const opts = { dateFormat: t0.master?.dateFormat };
    const from = currentUser?.name ?? '';
    // The PAGES box needs the page count, which depends on the content: fill once, measure, fill again.
    const first = await fillMaster(master, buildFillData(q, t0, from), opts);
    let pages = 1;
    try { pages = await estimatePages(first.bytes); } catch { /* keep 1; Word recalculates the page count itself */ }
    const digits = t0.master?.pagesDigits ?? 2;
    const final = await fillMaster(master, buildFillData(q, t0, from, String(pages).padStart(digits, '0')), opts);
    return final.bytes;
  };

  // keep the preview in step with the form (a short pause so typing stays smooth)
  useEffect(() => {
    if (!isMaster || view !== 'preview') return;
    let alive = true;
    setPreviewError(null);
    const timer = setTimeout(async () => {
      try {
        const bytes = await makeWord();
        if (alive) setPreviewBytes(bytes);
      } catch (e) {
        if (alive) setPreviewError(e instanceof Error ? e.message : 'The preview could not be built.');
      }
    }, 300);
    return () => { alive = false; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMaster, view, q, officeTemplate, currentUser?.name]);

  const downloadWord = async () => {
    if (building) return;
    setBuilding(true);
    try {
      const bytes = await makeWord();
      const blob = new Blob([bytes as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${(q.quoteRef || 'Quotation').replace(/[^\w.-]+/g, '_')}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'The Word file could not be made.');
    } finally {
      setBuilding(false);
    }
  };

  const attach = async (file: File | undefined | null) => {
    if (!file) return;
    setAttachNote(null);
    try {
      const img = await prepareImage(file);
      setAttached(img);
      if (img.resized) setAttachNote('Picture was larger than 1 MP, so it was shrunk before sending.');
    } catch (e) {
      setAttached(null);
      setAttachNote(e instanceof Error ? e.message : 'That picture could not be used.');
    }
  };

  const send = async (raw?: string) => {
    const typed = (raw ?? input).trim();
    const image = raw === undefined ? attached : null;
    if ((!typed && !image) || thinking || !officeTemplate) return;
    const text = typed || 'Please read the attached picture.';
    const history = chatMessages
      .filter((m) => m.sender === 'user' || m.sender === 'agent')
      .slice(-8)
      .map((m) => ({ role: (m.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant', content: m.text }));

    addChatMessage({ sender: 'user', text: image ? `${text}\n[Picture attached]` : text });
    setInput('');
    setAttached(null);
    setAttachNote(null);
    setThinking(true);
    try {
      const res = await fetch('/api/qri-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ instruction: typed, quote: q, history, dataBank, rules: officeTemplate.rules, ...(image ? { image: { mime: image.mime, data: image.data } } : {}) }),
      });
      const data = (await res.json().catch(() => null)) as AssistantResponse | null;
      if (!data || !data.ok || !data.quote) {
        addChatMessage({ sender: 'agent', text: data?.error ?? 'Sorry, I could not reach the assistant. Nothing was changed. Please try again.', systemLog: 'error' });
      } else {
        const changed = (data.changes?.length ?? 0) > 0;
        if (changed) applyQuote({ ...data.quote, templateVersion: officeTemplate.version });
        addChatMessage({ sender: 'agent', text: data.reply ?? '', systemLog: changed ? 'changed' : undefined });
      }
    } catch {
      addChatMessage({ sender: 'agent', text: 'Sorry, I could not reach the assistant. Check the internet connection. Nothing was changed.', systemLog: 'error' });
    } finally {
      setThinking(false);
    }
  };

  // Dashboard "type a request" box hands its text over in the address
  useEffect(() => {
    if (deepLinkPrompt && officeTemplate && !deepLinkSent.current) {
      deepLinkSent.current = true;
      void send(deepLinkPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkPrompt, officeTemplate]);

  // ── No template yet ─────────────────────────────────────────────────────────
  if (!officeTemplate) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="max-w-md bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-xs">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
          <h1 className="font-bold text-slate-900 mb-1">The quotation template is not ready</h1>
          {isAdmin ? (
            <>
              <p className="text-sm text-slate-600 mb-4">Upload one of your approved quotations once, and everyone can then make quotes on it.</p>
              <Link href="/settings/templates" className="inline-block px-5 py-2.5 rounded-full bg-slate-900 text-white text-sm font-semibold">Set up the template</Link>
            </>
          ) : (
            <p className="text-sm text-slate-600">Please ask an admin to set it up. Quotes cannot be made until then.</p>
          )}
        </div>
      </div>
    );
  }

  const t = officeTemplate;
  const terms = q.terms ?? t.terms;
  const hasTerms = terms.some((x) => x.trim());
  const lastChangedId = [...chatMessages].reverse().find((m) => m.systemLog === 'changed')?.id;
  const th = 'py-2 px-1.5 text-left font-semibold text-[10px] uppercase tracking-wide text-slate-600 border-b-2 border-slate-800';

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden bg-[#F4F5F7]">
      {/* Phone / small screen switch */}
      <div className="lg:hidden flex border-b border-slate-200 bg-white print:hidden">
        {(['quote', 'assistant'] as const).map((k) => (
          <button key={k} onClick={() => setTab(k)} className={`flex-1 py-2.5 text-sm font-semibold cursor-pointer ${tab === k ? 'text-[#FF4D6D] border-b-2 border-[#FF4D6D]' : 'text-slate-500'}`}>
            {k === 'quote' ? 'Quotation' : `Assistant${blocking.length ? ` (${blocking.length})` : ''}`}
          </button>
        ))}
      </div>

      {/* ═════ LEFT: the document ═════ */}
      <div className={`${tab === 'quote' ? 'flex' : 'hidden'} lg:flex flex-1 min-w-0 flex-col`}>
        <TopBarActions>
          <button onClick={() => { if (q.lineItems.length === 0 || window.confirm('Start a new quotation? Anything not saved in this one will be lost.')) startNewQuote(); }} title="New quotation" className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"><FilePlus2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">New quotation</span></button>
          <button onClick={undoQuote} disabled={!canUndo} title="Undo" className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"><Undo2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Undo</span></button>
          <div className="flex-1" />
          {toast && <span className="text-xs font-semibold text-slate-700">{toast}</span>}
          <button onClick={() => (saveCurrentCase() ? flash('Saved') : flash('Add the quotation number first'))} title="Save" className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-800 cursor-pointer"><Save className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Save</span></button>
          {canDownload && isMaster && (
            <button onClick={() => void downloadWord()} disabled={blocking.length > 0 || building} title={blocking.length ? 'Fix the red items first' : 'Downloads your company Word file, filled in. This is the exact document.'} className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-slate-900 hover:bg-black text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"><Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{building ? 'Making…' : 'Download Word'}</span></button>
          )}
          {canDownload && !isMaster && (
            <button onClick={() => window.print()} disabled={blocking.length > 0} title={blocking.length ? 'Fix the red items first' : 'In the print window, choose “Save as PDF”'} className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-slate-900 hover:bg-black text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"><Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Download PDF</span></button>
          )}
        </TopBarActions>

        <div className="flex-1 overflow-auto p-3 sm:p-6 select-text">
          {q.templateVersion !== undefined && q.templateVersion !== t.version && (
            <div className="max-w-[794px] mx-auto mb-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-xs p-2.5 print:hidden">
              This quotation was started on template version {q.templateVersion}. It now prints with the latest version ({t.version}).
            </div>
          )}

          {showFreedOffer && range && offer !== undefined && (
            <div className="max-w-[794px] mx-auto mb-3 rounded-lg border border-sky-200 bg-sky-50 text-sky-900 text-xs p-3 print:hidden">
              <div className="font-semibold mb-0.5">{formatRef(range, offer)} is free again{freed.length > 1 ? ` (${freed.length} free numbers in your range)` : ''}.</div>
              <div className="mb-2 text-sky-800">A quotation that used it was deleted. This quotation is numbered {q.quoteRef} as normal. You can take the free number instead, or carry on.</div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => updateTemplateField('quoteRef', formatRef(range, offer))} className="px-3 py-1.5 rounded-full bg-sky-700 hover:bg-sky-800 text-white font-semibold cursor-pointer">Use {formatRef(range, offer)}</button>
                <button onClick={() => setKeptNormalFor(q.quoteRef)} className="px-3 py-1.5 rounded-full border border-sky-300 bg-white hover:bg-sky-100 font-semibold cursor-pointer">Keep {q.quoteRef}</button>
                <button onClick={() => void ignoreFreed([offer])} className="px-3 py-1.5 rounded-full border border-sky-300 bg-white hover:bg-sky-100 font-semibold cursor-pointer">Never offer {formatRef(range, offer)} again</button>
                {freed.length > 1 && (
                  <button onClick={() => void ignoreFreed(freed)} className="px-3 py-1.5 rounded-full text-sky-800 hover:underline font-semibold cursor-pointer">Never offer any of these</button>
                )}
              </div>
            </div>
          )}

          {archived && (
            <div className="max-w-[794px] mx-auto mb-3 rounded-lg border border-slate-300 bg-slate-100 text-slate-800 text-xs p-3 print:hidden flex flex-wrap items-center gap-3">
              <Archive className="w-4 h-4" />
              <span className="flex-1 min-w-[200px]"><b>This quotation is archived.</b> It is hidden from the active list and its number stays reserved.</span>
              {savedCase && who && canArchive(lc, who) && (
                <button onClick={() => { if (restoreCase(savedCase.id)) flash('Restored.'); }} className="px-3 py-1.5 rounded-full bg-slate-900 text-white font-semibold cursor-pointer">Restore</button>
              )}
            </div>
          )}

          {!archived && (
            <div className="max-w-[794px] mx-auto mb-3 print:hidden">
              {lc?.waiting ? (
                <div className={`rounded-lg border p-3 text-xs flex flex-wrap items-start gap-3 ${followUpState(lc.waiting, today) === 'overdue' ? 'border-red-300 bg-red-50 text-red-900' : 'border-amber-300 bg-amber-50 text-amber-900'}`}>
                  <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-[220px]">
                    <div className="font-bold">On hold — {WAITING_LABEL[lc.waiting.reason]}</div>
                    {lc.waiting.note && <div className="mt-0.5">{lc.waiting.note}</div>}
                    <div className="mt-0.5 opacity-80">Next move: {lc.waiting.owner || 'not set'} · since {lc.waiting.since.slice(0, 10)}{lc.waiting.followUp ? ` · follow up ${lc.waiting.followUp}${followUpState(lc.waiting, today) === 'overdue' ? ' (overdue)' : ''}` : ''}</div>
                  </div>
                  {mayManage && (
                    <div className="flex gap-2">
                      <button onClick={() => { setHoldForm({ reason: lc.waiting!.reason, note: lc.waiting!.note, owner: lc.waiting!.owner, followUp: lc.waiting!.followUp ?? '' }); setHoldOpen(true); }} className="px-3 py-1.5 rounded-full border border-current font-semibold cursor-pointer">Edit</button>
                      <button onClick={resumeQuote} className="px-3 py-1.5 rounded-full bg-slate-900 text-white font-semibold cursor-pointer">Resume</button>
                    </div>
                  )}
                </div>
              ) : (
                mayManage && !holdOpen && (
                  <button onClick={() => { setHoldForm((f) => ({ ...f, owner: f.owner || who?.name || '' })); setHoldOpen(true); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"><Clock className="w-3.5 h-3.5" /> Put on hold…</button>
                )
              )}

              {holdOpen && (
                <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3 text-xs space-y-2">
                  <div className="font-bold text-slate-800">What is this quote waiting for?</div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    <label className="block"><span className="block font-semibold mb-0.5">Waiting for</span>
                      <select value={holdForm.reason} onChange={(e) => setHoldForm({ ...holdForm, reason: e.target.value as WaitingReason })} className="w-full border border-slate-200 rounded-lg px-2 py-1.5">
                        {WAITING_REASONS.map((r) => <option key={r} value={r}>{WAITING_LABEL[r]}</option>)}
                      </select></label>
                    <label className="block"><span className="block font-semibold mb-0.5">Who has the next move</span>
                      <select value={holdForm.owner} onChange={(e) => setHoldForm({ ...holdForm, owner: e.target.value })} className="w-full border border-slate-200 rounded-lg px-2 py-1.5">
                        {[...new Set([holdForm.owner, ...users.map((u) => u.name)].filter(Boolean))].map((n) => <option key={n} value={n}>{n}</option>)}
                      </select></label>
                    <label className="block sm:col-span-2"><span className="block font-semibold mb-0.5">Note (optional)</span>
                      <input value={holdForm.note} maxLength={200} onChange={(e) => setHoldForm({ ...holdForm, note: e.target.value })} placeholder="e.g. waiting for Siemens to confirm the rate" className="w-full border border-slate-200 rounded-lg px-2 py-1.5" /></label>
                    <label className="block"><span className="block font-semibold mb-0.5">Look at it again on (optional)</span>
                      <input type="date" value={holdForm.followUp} onChange={(e) => setHoldForm({ ...holdForm, followUp: e.target.value })} className="w-full border border-slate-200 rounded-lg px-2 py-1.5" /></label>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={applyHold} className="px-3 py-1.5 rounded-full bg-slate-900 text-white font-semibold cursor-pointer">Save hold</button>
                    <button onClick={() => setHoldOpen(false)} className="px-3 py-1.5 rounded-full border border-slate-300 font-semibold cursor-pointer">Cancel</button>
                  </div>
                </div>
              )}

              {q.lineItems.length > 0 && priceAge > STALE_PRICE_DAYS && (
                <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-xs p-3 flex flex-wrap items-center gap-3">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 min-w-[200px]">Prices were last confirmed <b>{priceAge} days ago</b> (limit {STALE_PRICE_DAYS}). Check them with your suppliers before sending.</span>
                  {mayManage && <button onClick={recheckPrices} className="px-3 py-1.5 rounded-full bg-slate-900 text-white font-semibold cursor-pointer">I rechecked the prices</button>}
                </div>
              )}
            </div>
          )}

          {!archived && (
            <div className="max-w-[794px] mx-auto mb-3 print:hidden" data-testid="approval-panel">
              {aState === 'approved' && (
                <div className="rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-900 text-xs p-3 flex flex-wrap items-center gap-3">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 min-w-[200px]"><b>Approved</b> by {appr?.decidedByName} on {appr?.decidedAt?.slice(0, 10)}. Changing anything will withdraw this approval.</span>
                </div>
              )}
              {aState === 'awaiting' && (
                <div className="rounded-lg border border-blue-300 bg-blue-50 text-blue-900 text-xs p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 min-w-[200px]"><b>Waiting for {appr?.requestedFromName} to approve</b> — asked by {appr?.requestedByName} on {appr?.requestedAt.slice(0, 10)}.{appr?.note ? ` “${appr.note}”` : ''} You can keep editing.</span>
                    {iDecide && !backOpen && (
                      <div className="flex gap-2">
                        <button onClick={doApprove} className="px-3 py-1.5 rounded-full bg-slate-900 text-white font-semibold cursor-pointer">Approve</button>
                        <button onClick={() => setBackOpen(true)} className="px-3 py-1.5 rounded-full border border-slate-300 bg-white font-semibold cursor-pointer">Send back…</button>
                      </div>
                    )}
                    {!iDecide && mayManage && <button onClick={doCancelAsk} className="px-3 py-1.5 rounded-full border border-slate-300 bg-white font-semibold cursor-pointer">Cancel request</button>}
                  </div>
                  {iDecide && <div className="text-[11px] opacity-80">You may change anything on this quote, prices included, before you approve it.</div>}
                  {iDecide && backOpen && (
                    <div className="flex flex-wrap gap-2 items-center">
                      <input value={backNote} maxLength={200} onChange={(e) => setBackNote(e.target.value)} placeholder="What should be fixed? (required)" className="flex-1 min-w-[200px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white" />
                      <button onClick={doSendBack} disabled={!backNote.trim()} className="px-3 py-1.5 rounded-full bg-slate-900 text-white font-semibold disabled:opacity-40 cursor-pointer">Send back</button>
                      <button onClick={() => setBackOpen(false)} className="px-3 py-1.5 rounded-full border border-slate-300 bg-white font-semibold cursor-pointer">Cancel</button>
                    </div>
                  )}
                </div>
              )}
              {(aState === 'sent_back' || aState === 'changed') && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-xs p-3 flex flex-wrap items-center gap-3 mb-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 min-w-[200px]">{aState === 'sent_back' ? <><b>{appr?.decidedByName} sent this back</b>{appr?.note ? `: “${appr.note}”` : ''}. Fix it, then ask again.</> : <><b>Approval withdrawn.</b> The quote was changed after {appr?.decidedByName} approved it. Ask again.</>}</span>
                </div>
              )}
              {(aState === 'none' || aState === 'sent_back' || aState === 'changed') && mayManage && !askOpen && (
                <button onClick={() => { setAskTarget((t) => t || askable[0]?.id || ''); setAskOpen(true); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 cursor-pointer"><Check className="w-3.5 h-3.5" /> Ask for approval…</button>
              )}
              {askOpen && (
                <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs space-y-2">
                  <div className="font-bold text-slate-800">Who should approve this quote?</div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    <label className="block"><span className="block font-semibold mb-0.5">Colleague</span>
                      <select value={askTarget} onChange={(e) => setAskTarget(e.target.value)} className="w-full border border-slate-200 rounded-lg px-2 py-1.5">
                        {askable.map((u) => <option key={u.id} value={u.id}>{u.name}{u.role ? ` · ${u.role}` : ''}</option>)}
                      </select></label>
                    <label className="block"><span className="block font-semibold mb-0.5">Message (optional)</span>
                      <input value={askNote} maxLength={200} onChange={(e) => setAskNote(e.target.value)} placeholder="e.g. please check the margin" className="w-full border border-slate-200 rounded-lg px-2 py-1.5" /></label>
                  </div>
                  <p className="text-[11px] text-slate-500">They can change anything, prices included, then approve or send it back. The quote is saved when you ask.</p>
                  <div className="flex gap-2 pt-1">
                    <button onClick={sendAsk} disabled={!askTarget} className="px-3 py-1.5 rounded-full bg-slate-900 text-white font-semibold disabled:opacity-40 cursor-pointer">Ask</button>
                    <button onClick={() => setAskOpen(false)} className="px-3 py-1.5 rounded-full border border-slate-300 font-semibold cursor-pointer">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {isMaster && (
            <div className="max-w-[794px] mx-auto mb-3 print:hidden">
              <div className="inline-flex rounded-full bg-white border border-slate-200 p-0.5 text-xs font-semibold">
                <button onClick={() => setView('edit')} className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full cursor-pointer ${view === 'edit' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}><Pencil className="w-3.5 h-3.5" /> Edit</button>
                <button onClick={() => setView('preview')} className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full cursor-pointer ${view === 'preview' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}><Eye className="w-3.5 h-3.5" /> Preview</button>
              </div>
              {view === 'edit' && (
                <p className="text-[11px] text-slate-500 mt-2">You are filling in the details. Your company letterhead, footer and signature come from the approved Word file and are added when you download. Press <b>Preview</b> to see how it will look.</p>
              )}
            </div>
          )}

          {isMaster && view === 'preview' && (
            <div className="max-w-[794px] mx-auto print:hidden">
              <div role="status" className="mb-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-xs p-3 flex gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-bold uppercase tracking-wide text-[11px] mb-0.5">Preview only — not the final output</div>
                  This is a quick picture drawn by the browser. Fonts and line breaks can look slightly different from Word. <b>The Word file you download is the exact company document.</b> Always check the downloaded file before sending it.
                </div>
              </div>
              {previewError && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 text-red-800 text-xs p-3">{previewError}</div>}
              <div className="relative rounded-md overflow-auto bg-slate-300/60 p-3 border border-slate-200">
                <div className="absolute top-2 right-3 z-10 rounded-full bg-amber-500 text-white text-[10px] font-bold tracking-wide px-2.5 py-1 shadow">PREVIEW ONLY</div>
                {previewBytes ? <MasterPreview bytes={previewBytes} onError={setPreviewError} /> : !previewError && <div className="p-8 text-center text-xs text-slate-500">Building the preview…</div>}
              </div>
            </div>
          )}

          {/* A4 sheet */}
          <div id="quotation-printable-document" className={`${isMaster && view === 'preview' ? 'hidden' : ''} mx-auto bg-white shadow-md border border-slate-200 text-slate-900 text-[12px] leading-relaxed w-[794px] min-w-[794px] min-h-[1123px] p-10 flex flex-col`}>
            {!isMaster && <div className="flex items-start gap-4 border-b-2 border-slate-800 pb-3 mb-4">
              {t.letterhead.logoDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.letterhead.logoDataUrl} alt="Company logo" className="h-14 w-auto" />
              )}
              <div>
                {t.letterhead.lines.map((l, i) => (
                  <div key={i} className={i === 0 ? 'text-base font-bold' : 'text-[11px] text-slate-600'}>{l}</div>
                ))}
              </div>
            </div>}

            {!isMaster && <h2 className="text-center font-bold tracking-widest text-sm mb-4">QUOTATION</h2>}

            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mb-4">
              <label className="flex items-center gap-2"><span className="font-semibold whitespace-nowrap">Quotation No:</span>
                <input className={inline} value={q.quoteRef} readOnly={rangeLocked} title={rangeLocked ? 'Issued automatically from your assigned range' : undefined} placeholder={(t.refHint || '').replace(/^[^:#]*[:#]\s*/, '') || 'type it here'} onChange={(e) => updateTemplateField('quoteRef', e.target.value)} /></label>
              <label className="flex items-center gap-2"><span className="font-semibold">Date:</span>
                <input type="date" className={inline} value={q.date} onChange={(e) => updateTemplateField('date', e.target.value)} /></label>
              <label className="flex items-center gap-2"><span className="font-semibold">To:</span>
                <input className={inline} value={q.clientName} placeholder="client name" onChange={(e) => updateTemplateField('clientName', e.target.value)} /></label>
              <label className="flex items-center gap-2"><span className="font-semibold whitespace-nowrap">Attention:</span>
                <input className={inline} value={q.clientContact} placeholder="contact person" onChange={(e) => updateTemplateField('clientContact', e.target.value)} /></label>
              <label className="flex items-center gap-2"><span className="font-semibold">Delivery:</span>
                <input className={inline} value={q.deliveryTerms} onChange={(e) => updateTemplateField('deliveryTerms', e.target.value)} /></label>
              <label className="flex items-center gap-2"><span className="font-semibold">Payment:</span>
                <input className={inline} value={q.paymentTerms} onChange={(e) => updateTemplateField('paymentTerms', e.target.value)} /></label>
              <label className="flex items-center gap-2"><span className="font-semibold whitespace-nowrap">Valid for (days):</span>
                <input type="number" min={0} className={inline} value={q.validityDays || ''} onChange={(e) => updateTemplateField('validityDays', Number(e.target.value) || 0)} /></label>
            </div>

            {isMaster && (
              <div className="mb-4 space-y-2">
                <label className="flex items-center gap-2"><span className="font-semibold whitespace-nowrap">Subject:</span>
                  <input className={inline} value={q.subject ?? ''} placeholder="what this quotation is for" onChange={(e) => updateTemplateField('subject', e.target.value)} /></label>
                <label className="flex items-start gap-2"><span className="font-semibold whitespace-nowrap pt-0.5">Greeting:</span>
                  <input className={inline} value={q.greeting ?? officeTemplate?.master?.greeting ?? ''} onChange={(e) => updateTemplateField('greeting', e.target.value)} /></label>
                <div>
                  <div className="font-semibold mb-0.5">Opening paragraph:</div>
                  <AutoText value={q.intro ?? officeTemplate?.master?.intro ?? ''} onChange={(v) => updateTemplateField('intro', v)} className="w-full resize-none bg-transparent border border-dashed border-slate-300 focus:border-[#FF4D6D] focus:outline-none rounded px-1.5 py-1 leading-relaxed overflow-hidden" />
                </div>
                <p className="text-[11px] text-slate-500">Delivery, Payment and Valid-for are written into the matching lines of Terms &amp; Conditions. Only values you fill in here are used; if a box is empty, the standard wording stays.</p>
              </div>
            )}

            <table className="w-full border-collapse mb-2">
              <thead>
                <tr>
                  <th className={`${th} w-6`}>#</th>
                  <th className={th}>Description</th>
                  <th className={`${th} w-24`}>Brand / Model</th>
                  <th className={`${th} w-14`}>Qty</th>
                  <th className={`${th} w-14`}>Unit</th>
                  <th className={`${th} w-24 text-right`}>Unit price</th>
                  <th className={`${th} w-28 text-right`}>Total</th>
                  <th className={`${th} w-6 print:hidden`}></th>
                </tr>
              </thead>
              <tbody>
                {q.lineItems.length === 0 && (
                  <tr><td colSpan={8} className="py-6 text-center text-slate-400 italic print:hidden">No items yet. Ask the assistant on the right, or press “Add item” below.</td></tr>
                )}
                {q.lineItems.map((l, i) => {
                  const priceEditable = canSeeCosts || !(l.unitCost > 0);
                  return (
                    <tr key={l.id} className="border-b border-slate-200 align-top">
                      <td className="py-1.5 px-1.5 text-slate-500">{i + 1}</td>
                      <td className="py-1 px-1"><input className={inline} value={l.description} placeholder="description" onChange={(e) => updateLineItem(l.id, { description: e.target.value })} /></td>
                      <td className="py-1 px-1"><input className={inline} value={[l.brand, l.partNumber].filter(Boolean).join(' ')} onChange={(e) => updateLineItem(l.id, { brand: e.target.value, partNumber: '' })} /></td>
                      <td className="py-1 px-1"><input type="number" min={0} className={inline} value={l.qty || ''} onChange={(e) => updateLineItem(l.id, { qty: Number(e.target.value) || 0 })} /></td>
                      <td className="py-1 px-1"><input className={inline} value={l.uom} onChange={(e) => updateLineItem(l.id, { uom: e.target.value.toUpperCase() })} /></td>
                      <td className="py-1 px-1 text-right">
                        {priceEditable ? (
                          <input type="number" min={0} className={`${inline} text-right`} value={l.unitPrice || ''} onChange={(e) => { const n = Number(e.target.value) || 0; updateLineItem(l.id, n > 0 ? { unitPrice: n, ratePending: false } : { unitPrice: n }); }} />
                        ) : (
                          <span className="font-mono">{formatPKR(l.unitPrice)}</span>
                        )}
                        {l.preowned && <span className="mt-0.5 mr-1 inline-block text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200 px-1.5 rounded-full print:hidden" title="Internal only — not printed, not in the Word file">Pre-owned · internal</span>}
                        {l.costSource === 'picture' && (
                          <label className="mt-0.5 block text-[10px] text-amber-900 bg-amber-50 border border-amber-200 rounded px-1.5 py-1 text-left cursor-pointer print:hidden" title="Read from the picture by the AI">
                            <input type="checkbox" className="mr-1 align-middle" checked={!!l.pictureChecked} onChange={(e) => updateLineItem(l.id, { pictureChecked: e.target.checked })} />
                            Picture cost Rs. {formatPKR(l.unitCost)} — I checked it
                            {l.pictureNote && <span className="block text-amber-800/80 truncate max-w-[200px]">“{l.pictureNote}”</span>}
                          </label>
                        )}
                        <label className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-slate-500 cursor-pointer print:hidden"><input type="checkbox" checked={!!l.ratePending} onChange={(e) => updateLineItem(l.id, { ratePending: e.target.checked })} /> rate pending</label>
                      </td>
                      <td className="py-1.5 px-1.5 text-right font-mono font-semibold">{formatPKR(l.total)}</td>
                      <td className="py-1 px-1 print:hidden"><button onClick={() => removeLineItem(l.id)} title="Remove this item" className="text-slate-300 hover:text-red-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <button onClick={addLineItem} className="self-start inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-black mb-3 print:hidden cursor-pointer"><Plus className="w-3 h-3" /> Add item</button>

            <div className="self-end text-right mb-1">
              <div className="font-bold text-sm">Total ({q.currency}): <span className="font-mono">{formatPKR(q.grandTotal)}</span></div>
              {!isMaster && <div className="text-[11px] text-slate-600">{t.taxStatement}</div>}
            </div>

            {(q.notes.length > 0) && (
              <div className="mt-3">
                <div className="font-bold mb-1">Additional terms for this quotation</div>
                <ul className="list-disc pl-4 space-y-0.5">
                  {q.notes.map((n, i) => (
                    <li key={i}>{n} <button onClick={() => updateTemplateField('notes', q.notes.filter((_, j) => j !== i))} className="text-slate-300 hover:text-red-600 ml-1 print:hidden cursor-pointer" title="Remove"><XCircle className="w-3 h-3 inline" /></button></li>
                  ))}
                </ul>
              </div>
            )}

            {(
              <div className={`mt-4 ${hasTerms ? '' : 'print:hidden'}`}>
                <div className="flex items-center justify-between">
                  <div className="font-bold mb-1">Terms &amp; Conditions</div>
                  <button onClick={() => updateTemplateField('terms', [...t.terms])} className="text-[11px] font-semibold text-slate-400 hover:text-slate-700 print:hidden cursor-pointer" title="Put back the company's standard terms">Reset to standard</button>
                </div>
                <ol className="list-decimal pl-4 space-y-1">
                  {terms.map((x, i) => (
                    <li key={i} className={`pl-1 ${x.trim() ? '' : 'print:hidden'}`}>
                      <div className="flex items-start gap-1">
                        <AutoText
                          value={x}
                          onChange={(v) => updateTemplateField('terms', terms.map((y, j) => (j === i ? v : y)))}
                          className="flex-1 resize-none bg-transparent border-0 border-b border-dashed border-transparent hover:border-slate-300 focus:border-[#FF4D6D] focus:outline-none px-0.5 py-0 leading-relaxed print:border-0 overflow-hidden"
                        />
                        <button onClick={() => updateTemplateField('terms', terms.filter((_, j) => j !== i))} className="text-slate-300 hover:text-red-600 mt-0.5 print:hidden cursor-pointer" title="Remove this term"><XCircle className="w-3.5 h-3.5" /></button>
                      </div>
                    </li>
                  ))}
                </ol>
                <button onClick={() => updateTemplateField('terms', [...terms, ''])} className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-black print:hidden cursor-pointer"><Plus className="w-3 h-3" /> Add a term</button>
              </div>
            )}

            {!isMaster && <div className="mt-6">
              <div>Regards,</div>
              {t.signatory.company && <div className="font-semibold">For {t.signatory.company}</div>}
              <div className="mt-8 font-semibold">{t.signatory.name}</div>
              <div className="text-slate-600">{t.signatory.designation}</div>
            </div>}

            <div className="flex-1" />
            {!isMaster && t.letterhead.footerLines.length > 0 && (
              <div className="border-t border-slate-300 mt-6 pt-2 text-[10px] text-slate-500 text-center">
                {t.letterhead.footerLines.map((l, i) => <div key={i}>{l}</div>)}
              </div>
            )}
          </div>

          {/* Internal pricing (never printed) */}
          {canSeeCosts && q.lineItems.length > 0 && (
            <div className="max-w-[794px] mx-auto mt-4 bg-white border border-slate-200 rounded-xl p-4 print:hidden">
              <div className="text-xs font-bold text-slate-700 mb-0.5">Pricing details — internal, not printed</div>
              <p className="text-[11px] text-slate-500 mb-2">Cost and margin are only visible to people allowed to change margins.</p>
              <table className="w-full text-xs">
                <thead><tr className="text-left text-slate-500"><th className="py-1">Item</th><th>Cost (each)</th><th>Margin %</th><th className="text-right">Price (each)</th></tr></thead>
                <tbody>
                  {q.lineItems.map((l, i) => (
                    <tr key={l.id} className="border-t border-slate-100">
                      <td className="py-1.5 pr-2 truncate max-w-[220px]">{i + 1}. {l.description || '—'}{l.preowned && <span className="ml-1 text-[10px] font-bold uppercase text-amber-800">Pre-owned</span>}</td>
                      <td><input type="number" min={0} className="w-24 border border-slate-200 rounded px-1.5 py-0.5" value={l.unitCost || ''} onChange={(e) => updateLineItem(l.id, { unitCost: Number(e.target.value) || 0 })} /></td>
                      <td><input type="number" min={0} className="w-16 border border-slate-200 rounded px-1.5 py-0.5" value={l.marginPct || ''} onChange={(e) => updateLineItem(l.id, { marginPct: Number(e.target.value) || 0 })} /></td>
                      <td className="text-right font-mono">{formatPKR(l.unitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ═════ RIGHT: checks + assistant ═════ */}
      <aside className={`${tab === 'assistant' ? 'flex' : 'hidden'} ${chatOpen ? 'lg:flex' : 'lg:hidden'} w-full lg:w-[400px] flex-shrink-0 flex-col bg-white border-l border-slate-200 min-h-0 print:hidden`}>
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-bold text-slate-700">Before you download</div>
            <button onClick={() => setChat(false)} className="hidden lg:inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold text-slate-500 hover:bg-slate-100 cursor-pointer" title="Collapse the assistant"><ChevronsRight className="w-3.5 h-3.5" /> Hide</button>
          </div>
          {checks.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-emerald-700 font-semibold"><CheckCircle2 className="w-4 h-4" /> Everything looks complete.</div>
          ) : (
            <ul className="space-y-1.5 max-h-40 overflow-y-auto">
              {checks.map((c, i) => (
                <li key={i} className={`flex gap-2 text-xs rounded-lg px-2.5 py-1.5 ${c.severity === 'block' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-900'}`}>
                  {c.severity === 'block' ? <XCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />}
                  <span>{c.message}</span>
                </li>
              ))}
            </ul>
          )}
          {checks.length > 0 && <p className="text-[11px] text-slate-500 mt-2">Red items must be fixed before downloading. Amber items are worth a second look.</p>}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {chatMessages.length === 0 && !thinking && (
            <div className="text-sm text-slate-600">
              <p className="font-semibold text-slate-900 mb-1">Tell me what to put on the quotation.</p>
              <p className="text-xs mb-3">I only use prices from your Data Bank or ones you type. If something is missing, I will ask. Tap an example to start, then fill in the brackets.</p>
              <div className="flex flex-col gap-1.5">
                {STARTERS.map((s) => (
                  <button key={s} onClick={() => setInput(s)} className="text-left text-xs px-3 py-2 rounded-xl border border-slate-200 hover:border-[#FF4D6D] hover:bg-rose-50/40 text-slate-700 cursor-pointer">{s}</button>
                ))}
              </div>
            </div>
          )}
          {chatMessages.map((m) => (
            <div key={m.id} className={m.sender === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13px] whitespace-pre-line ${m.sender === 'user' ? 'bg-slate-900 text-white' : m.systemLog === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-slate-100 text-slate-900'}`}>
                {m.text}
                {m.id === lastChangedId && canUndo && (
                  <button onClick={undoQuote} className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#FF4D6D] hover:underline cursor-pointer"><Undo2 className="w-3 h-3" /> Undo this change</button>
                )}
              </div>
            </div>
          ))}
          {thinking && <div className="text-xs text-slate-500 animate-pulse">Working on it…</div>}
          <div ref={feedEnd} />
        </div>

        <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="p-3 border-t border-slate-200">
          {(attached || attachNote) && (
            <div className="mb-2 flex items-center gap-2">
              {attached && (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={attached.previewUrl} alt="Attached picture" className="h-14 w-14 object-cover rounded-lg border border-slate-200" />
                  <button type="button" onClick={() => { setAttached(null); setAttachNote(null); }} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center cursor-pointer" title="Remove picture"><X className="w-3 h-3" /></button>
                </div>
              )}
              {attachNote && <span className={`text-[11px] ${attached ? 'text-slate-500' : 'text-red-700'}`}>{attachNote}</span>}
            </div>
          )}
          <div className="flex gap-2 items-end">
            <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { void attach(e.target.files?.[0]); e.target.value = ''; }} />
            <button type="button" onClick={() => fileInput.current?.click()} disabled={thinking} className="p-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer" title="Attach a picture (a client's list, a note, a screenshot)"><Paperclip className="w-4 h-4" /></button>
            <textarea
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
              onPaste={(e) => { const f = Array.from(e.clipboardData.files).find((x) => x.type.startsWith('image/')); if (f) { e.preventDefault(); void attach(f); } }}
              placeholder="Type what to add or change… (you can paste or attach a picture)"
              maxLength={1500}
              className="flex-1 resize-none border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#FF4D6D]"
            />
            <button type="submit" disabled={thinking || (!input.trim() && !attached)} className="p-3 rounded-xl bg-[#FF4D6D] hover:bg-[#FA3B5E] text-white disabled:opacity-40 cursor-pointer" title="Send"><Send className="w-4 h-4" /></button>
          </div>
        </form>
      </aside>

      {/* Collapsed: small round chip to bring the assistant back (large screens) */}
      {!chatOpen && (
        <button
          onClick={() => setChat(true)}
          className="hidden lg:flex fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-[#FF4D6D] hover:bg-[#FA3B5E] text-white shadow-lg items-center justify-center cursor-pointer print:hidden"
          title="Open the assistant"
        >
          <MessageSquare className="w-6 h-6" />
          {blocking.length > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center">{blocking.length}</span>
          )}
        </button>
      )}
    </div>
  );
}

export default function QuotationPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}>
      <QuotationContent />
    </Suspense>
  );
}
