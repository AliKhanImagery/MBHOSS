'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Archive, ArchiveRestore, ArrowRight, Building, Clock, Play, Plus, Trash2, TriangleAlert } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { attentionList, canArchive, canDeleteForever, followUpState, isArchived, WAITING_LABEL } from '@/lib/quote-lifecycle';
import { approvalState, inboxFor } from '@/lib/quote-approval';
import type { QuotationCase } from '@/types';

type Tab = 'active' | 'hold' | 'archived';
const todayIso = () => new Date().toISOString().slice(0, 10);

const statusBadge = (status: string) =>
  status === 'Completed'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : status === 'Sourcing'
      ? 'bg-rose-50 text-[#FF4D6D] border-rose-200'
      : 'bg-blue-50 text-blue-700 border-blue-200';

export default function ActiveCasesPage() {
  const router = useRouter();
  const { activeCases, loadCase, deleteCase, archiveCase, restoreCase, resumeCase, currentUser } = useApp();
  const [tab, setTab] = useState<Tab>('active');
  const [note, setNote] = useState<string | null>(null);
  const today = todayIso();
  const who = currentUser ? { id: currentUser.id, name: currentUser.name, role: currentUser.role } : null;

  const say = (m: string) => { setNote(m); setTimeout(() => setNote(null), 6000); };

  const lists = useMemo(() => {
    const live = activeCases.filter((c) => !isArchived(c.templateState?.lifecycle));
    return {
      active: live,
      hold: live.filter((c) => !!c.templateState?.lifecycle?.waiting),
      archived: activeCases.filter((c) => isArchived(c.templateState?.lifecycle)),
    };
  }, [activeCases]);
  const rows = lists[tab];
  const waitingForMe = useMemo(() => inboxFor(activeCases, who, new Date()).filter((i) => i.needsAction), [activeCases, who?.id]);
  const attention = useMemo(() => attentionList(activeCases, today), [activeCases, today]);

  const open = (id: string) => { loadCase(id); router.push('/agent/quotation'); };

  const doArchive = (c: QuotationCase) => {
    if (archiveCase(c.id)) say(`Archived ${c.caseRef}. Its number stays reserved. You can restore it any time from the Archived tab.`);
    else say('Only the person who made this quotation, or an admin, can archive it.');
  };
  const doRestore = (c: QuotationCase) => { if (restoreCase(c.id)) say(`Restored ${c.caseRef}.`); else say('Only the person who made this quotation, or an admin, can restore it.'); };
  const doResume = (c: QuotationCase) => { if (resumeCase(c.id)) say(`${c.caseRef} is off hold.`); else say('Only the person who made this quotation, or an admin, can take it off hold.'); };
  const doDelete = (c: QuotationCase) => {
    const ref = c.caseRef?.trim();
    const msg = `Delete ${ref || 'this quotation'} (${c.clientName || 'no client'}) for good?\n\n${ref ? `Its number ${ref} becomes free: its owner will be offered ${ref} back the next time they start a quotation.\n\n` : ''}This cannot be undone.`;
    if (window.confirm(msg)) { if (!deleteCase(c.id)) say('Only an admin can delete a quotation for good.'); }
  };

  const waitingBadge = (c: QuotationCase) => {
    const w = c.templateState?.lifecycle?.waiting;
    if (!w) return null;
    const fu = followUpState(w, today);
    const tone = fu === 'overdue' ? 'bg-red-50 text-red-700 border-red-200' : fu === 'today' ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-amber-50 text-amber-800 border-amber-200';
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${tone}`} title={w.note || undefined}>
        <Clock className="w-3 h-3" /> {WAITING_LABEL[w.reason]}{w.followUp ? ` · ${w.followUp}` : ''}
      </span>
    );
  };

  const approvalBadge = (c: QuotationCase) => {
    const q = c.templateState;
    const a = q?.lifecycle?.approval;
    if (!q || !a || isArchived(q.lifecycle)) return null;
    const st = approvalState(q);
    const [text, tone] =
      st === 'awaiting' ? [`Awaiting ${a.requestedFromName}`, 'bg-blue-50 text-blue-700 border-blue-200']
      : st === 'approved' ? [`Approved by ${a.decidedByName ?? a.requestedFromName}`, 'bg-emerald-50 text-emerald-700 border-emerald-200']
      : st === 'sent_back' ? ['Sent back', 'bg-amber-50 text-amber-800 border-amber-200']
      : ['Changed since approval', 'bg-amber-50 text-amber-800 border-amber-200'];
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${tone}`}>{text}</span>;
  };

  const actions = (c: QuotationCase) => {
    const lc = c.templateState?.lifecycle;
    const mine = who ? canArchive(lc, who) : false;
    const archived = isArchived(lc);
    return (
      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => open(c.id)} className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-[#FF4D6D] border border-rose-200 rounded-full text-xs font-bold inline-flex items-center gap-1 cursor-pointer">Open <ArrowRight className="w-3.5 h-3.5" /></button>
        {!archived && lc?.waiting && mine && (
          <button onClick={() => doResume(c)} title="Take off hold" className="p-1.5 text-slate-500 hover:text-emerald-700 rounded-full hover:bg-slate-100 cursor-pointer"><Play className="w-4 h-4" /></button>
        )}
        {!archived && mine && (
          <button onClick={() => doArchive(c)} title="Archive (hide it; the number stays reserved)" className="p-1.5 text-slate-500 hover:text-slate-900 rounded-full hover:bg-slate-100 cursor-pointer"><Archive className="w-4 h-4" /></button>
        )}
        {archived && mine && (
          <button onClick={() => doRestore(c)} title="Restore" className="p-1.5 text-slate-500 hover:text-slate-900 rounded-full hover:bg-slate-100 cursor-pointer"><ArchiveRestore className="w-4 h-4" /></button>
        )}
        {who && canDeleteForever(lc, who) && (
          <button onClick={() => doDelete(c)} title="Delete for good (admin)" className="p-1.5 text-slate-400 hover:text-rose-600 rounded-full hover:bg-slate-100 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
        )}
      </div>
    );
  };

  const tabs: [Tab, string][] = [['active', 'Active'], ['hold', 'On hold'], ['archived', 'Archived']];

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden text-slate-900 select-none">
      <main className="flex-1 space-y-4 overflow-y-auto">
        {note && <div role="status" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-xs">{note}</div>}

        {waitingForMe.length > 0 && (
          <section className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4" data-testid="waiting-for-me">
            <h2 className="text-sm font-bold text-blue-900 mb-2">Waiting for your approval ({waitingForMe.length})</h2>
            <ul className="space-y-1.5">
              {waitingForMe.map((a) => (
                <li key={a.key}>
                  <button onClick={() => open(a.caseId)} className="w-full text-left flex flex-wrap items-baseline gap-x-2 rounded-lg bg-white/80 hover:bg-white border border-blue-100 px-3 py-2 text-xs cursor-pointer">
                    <span className="font-mono font-bold text-[#FF4D6D]">{a.caseRef}</span>
                    <span className="font-semibold text-slate-800">{a.clientName}</span>
                    <span className="text-blue-900">{a.text}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {attention.length > 0 && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
            <h2 className="text-sm font-bold text-amber-900 flex items-center gap-1.5 mb-2"><TriangleAlert className="w-4 h-4" /> Needs your attention ({attention.length})</h2>
            <ul className="space-y-1.5">
              {attention.slice(0, 8).map((a, i) => (
                <li key={`${a.caseId}-${a.kind}-${i}`}>
                  <button onClick={() => open(a.caseId)} className="w-full text-left flex flex-wrap items-baseline gap-x-2 rounded-lg bg-white/80 hover:bg-white border border-amber-100 px-3 py-2 text-xs cursor-pointer">
                    <span className="font-mono font-bold text-[#FF4D6D]">{a.caseRef}</span>
                    <span className="font-semibold text-slate-800">{a.clientName}</span>
                    <span className={a.kind === 'overdue' || a.kind === 'expired' ? 'text-red-700' : 'text-amber-900'}>{a.text}</span>
                  </button>
                </li>
              ))}
            </ul>
            {attention.length > 8 && <p className="text-[11px] text-amber-900 mt-2">…and {attention.length - 8} more.</p>}
          </section>
        )}

        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Quotations</h2>
              <div className="mt-2 inline-flex rounded-full bg-slate-100 p-0.5 text-xs font-semibold">
                {tabs.map(([k, label]) => (
                  <button key={k} onClick={() => setTab(k)} className={`px-3 py-1.5 rounded-full cursor-pointer ${tab === k ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}>
                    {label} <span className="opacity-70">{lists[k].length}</span>
                  </button>
                ))}
              </div>
            </div>
            <Link href="/agent/quotation" className="px-4 py-2 rounded-full bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-xs flex items-center gap-1.5"><Plus className="w-4 h-4" /> Create New Quote</Link>
          </div>

          {rows.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              {tab === 'active' ? 'No quotations yet.' : tab === 'hold' ? 'Nothing is on hold.' : 'Nothing is archived.'}
            </div>
          ) : (
            <>
              {/* Phone */}
              <div className="md:hidden divide-y divide-slate-100">
                {rows.map((c) => (
                  <div key={c.id} onClick={() => open(c.id)} className="p-4 space-y-2 active:bg-slate-50 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sm text-[#FF4D6D]">{c.caseRef}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono border font-bold ${statusBadge(c.status)}`}>{c.status}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-bold text-slate-900 flex items-center gap-2 min-w-0"><Building className="w-4 h-4 text-slate-400 shrink-0" /><span className="truncate">{c.clientName}</span></div>
                      <div className="font-mono font-bold text-sm whitespace-nowrap">Rs. {new Intl.NumberFormat('en-PK').format(c.totalPKR)}</div>
                    </div>
                    {waitingBadge(c)}
                    {approvalBadge(c)}
                    <div className="flex items-center justify-between text-xs text-slate-500 font-mono pt-2 border-t border-slate-100">
                      <span>{c.itemCount} items · {c.templateState?.lifecycle?.ownerName ?? 'no owner'}</span>
                      {actions(c)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse text-sm text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200/80 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-5">Quote Ref</th>
                      <th className="py-3.5 px-5">Client</th>
                      <th className="py-3.5 px-5">Status</th>
                      <th className="py-3.5 px-5">Owner</th>
                      <th className="py-3.5 px-5 text-right">Total (PKR)</th>
                      <th className="py-3.5 px-5 text-center">Created</th>
                      <th className="py-3.5 px-5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((c) => (
                      <tr key={c.id} onClick={() => open(c.id)} className="hover:bg-slate-50/70 transition-colors cursor-pointer">
                        <td className="py-3.5 px-5 font-mono font-bold text-sm text-[#FF4D6D]">{c.caseRef}</td>
                        <td className="py-3.5 px-5"><div className="font-bold text-slate-900 flex items-center gap-2"><Building className="w-4 h-4 text-slate-400" /><span>{c.clientName}</span></div></td>
                        <td className="py-3.5 px-5">
                          <div className="flex flex-col items-start gap-1">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-mono border font-bold ${statusBadge(c.status)}`}>{c.status}</span>
                            {waitingBadge(c)}
                            {approvalBadge(c)}
                          </div>
                        </td>
                        <td className="py-3.5 px-5 text-xs text-slate-600">{c.templateState?.lifecycle?.ownerName ?? <span className="text-slate-400">not recorded</span>}</td>
                        <td className="py-3.5 px-5 text-right font-mono font-bold">Rs. {new Intl.NumberFormat('en-PK').format(c.totalPKR)}</td>
                        <td className="py-3.5 px-5 text-center font-mono text-slate-500 text-xs">{c.createdAt}</td>
                        <td className="py-3.5 px-5"><div className="flex justify-center">{actions(c)}</div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
        {tab === 'archived' && rows.length > 0 && <p className="text-xs text-slate-500 px-1">Archived quotations keep their number reserved. Only an admin can delete one for good, which frees its number.</p>}
      </main>
    </div>
  );
}
