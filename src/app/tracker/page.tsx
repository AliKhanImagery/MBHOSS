'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Search, AlertTriangle, CalendarClock, Bot, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { attention, daysSince, dueState, KIND_LABEL, matches, sortCases, STATUS_LABEL } from '@/lib/project-cases';
import type { CaseStatus, CaseUpdateKind, ProjectCase } from '@/types';

const today = () => new Date().toISOString().slice(0, 10);
const chip = (s: CaseStatus) =>
  s === 'closed' ? 'bg-slate-100 text-slate-600 border-slate-200' : s === 'quoted' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-800 border-amber-200';
const input = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#FF4D6D] focus:bg-white';
const ago = (n: number) => (n === 0 ? 'today' : n === 1 ? '1 day ago' : `${n} days ago`);
const REASON: Record<string, string> = { overdue: 'Overdue', today: 'Due today', no_next_action: 'No next step set' };

export default function TrackerPage() {
  const { projectCases, addProjectCase, addCaseUpdate, patchProjectCase, refreshFromCloud } = useApp();
  const [tab, setTab] = useState<'active' | 'closed'>('active');
  const [term, setTerm] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { void refreshFromCloud(); /* pick up anything added through Claude */ }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('case');
    if (id) setOpenId(id);
  }, []);

  const now = new Date();
  const t = today();
  const needs = useMemo(() => attention(projectCases, t), [projectCases, t]);
  const rows = useMemo(() => {
    const list = projectCases.filter((c) => (tab === 'closed' ? c.status === 'closed' : c.status !== 'closed')).filter((c) => matches(c, term));
    return sortCases(list, tab === 'closed');
  }, [projectCases, tab, term]);
  const open = projectCases.find((c) => c.id === openId) ?? null;

  const refresh = async () => { setBusy(true); await refreshFromCloud(); setBusy(false); };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto text-slate-900">
      <div className="space-y-4 pb-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Case Tracker</h1>
            <p className="text-xs text-slate-500">One tracker per project or enquiry. Cases are closed, never deleted.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refresh} className="p-2 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer" title="Refresh">
              <RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => setShowNew(true)} className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-slate-900 hover:bg-black text-white text-sm font-bold cursor-pointer">
              <Plus className="w-4 h-4 text-[#FF4D6D]" /> New case
            </button>
          </div>
        </div>

        {needs.length > 0 && (
          <section className="bg-white border border-slate-200/80 rounded-2xl shadow-xs">
            <h2 className="px-4 py-3 border-b border-slate-100 text-sm font-bold flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-[#FF4D6D]" /> Needs you ({needs.length})</h2>
            <ul className="divide-y divide-slate-100">
              {needs.map(({ c, reason }) => (
                <li key={c.id}>
                  <button onClick={() => setOpenId(c.id)} className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 cursor-pointer text-xs">
                    <span className={`font-bold w-32 flex-shrink-0 ${reason === 'overdue' ? 'text-rose-700' : reason === 'today' ? 'text-amber-700' : 'text-slate-500'}`}>{REASON[reason]}</span>
                    <span className="font-semibold text-slate-900 truncate">{c.title}{c.client ? ` · ${c.client}` : ''}</span>
                    <span className="text-slate-500 truncate ml-auto">{c.nextAction ? `${c.nextAction}${c.nextActionDue ? ` (${c.nextActionDue})` : ''}` : 'Last update ' + ago(daysSince(c.updatedAt, now))}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-1 text-sm" role="tablist">
            {([['active', 'Active'], ['closed', 'Closed']] as const).map(([k, label]) => (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                className={`px-4 py-1.5 rounded-full border font-bold cursor-pointer ${tab === k ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{label}</button>
            ))}
          </div>
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-2.5" />
            <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search title, client, or anything said in an update..."
              className="w-full bg-white border border-slate-200/80 rounded-full pl-11 pr-4 py-2 text-sm placeholder-slate-400 focus:outline-none focus:border-[#FF4D6D]" />
          </div>
        </div>

        {rows.length === 0 && (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center text-sm text-slate-500">
            {projectCases.length === 0 ? 'No cases yet. Add one, or tell Claude about a call and ask it to add a case.' : 'Nothing here.'}
          </div>
        )}

        <div className="grid gap-3 lg:grid-cols-2">
          {rows.map((c) => {
            const d = dueState(c, t);
            return (
              <button key={c.id} onClick={() => setOpenId(c.id)} className="text-left bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs hover:border-slate-300 cursor-pointer space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-base text-slate-900 truncate">{c.title}</div>
                    <div className="text-xs text-slate-500 truncate">{[c.client, c.origin && `from ${c.origin}`, c.quoteRef].filter(Boolean).join(' · ') || 'No client recorded'}</div>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border flex-shrink-0 ${chip(c.status)}`}>{STATUS_LABEL[c.status]}</span>
                </div>
                {c.nextAction ? (
                  <div className={`text-xs flex items-start gap-1.5 ${d === 'overdue' ? 'text-rose-700 font-semibold' : d === 'today' ? 'text-amber-700 font-semibold' : 'text-slate-700'}`}>
                    <CalendarClock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>Next: {c.nextAction}{c.nextActionDue ? ` · ${c.nextActionDue}` : ''}{d === 'overdue' ? ' (overdue)' : d === 'today' ? ' (today)' : ''}</span>
                  </div>
                ) : c.status !== 'closed' ? <div className="text-xs text-slate-400">No next step set</div> : null}
                <div className="text-[11px] text-slate-400">Last update {ago(daysSince(c.updatedAt, now))} · {c.updates.filter((u) => u.kind !== 'system').length} notes</div>
              </button>
            );
          })}
        </div>
      </div>

      {showNew && <NewCase onClose={() => setShowNew(false)} onSave={(inp) => { const made = addProjectCase(inp); if (made) { setShowNew(false); setOpenId(made.id); } }} />}
      {open && <Detail c={open} onClose={() => setOpenId(null)} onPatch={(p) => patchProjectCase(open.id, p)} onUpdate={(text, kind) => addCaseUpdate(open.id, { text, kind })} />}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white border border-slate-200 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-xs text-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="font-bold text-sm">{title}</div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer" aria-label="Close"><X className="w-4 h-4" /></button>
        </div>
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block font-bold mb-1">{label}</label>{children}</div>;
}

function NewCase({ onClose, onSave }: { onClose: () => void; onSave: (i: Record<string, string>) => void }) {
  const [f, setF] = useState({ title: '', client: '', origin: '', summary: '', nextAction: '', nextActionDue: '', note: '' });
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    try { onSave(f); } catch (x) { setErr(x instanceof Error ? x.message : 'Could not save.'); }
  };
  return (
    <Modal title="New case" onClose={onClose}>
      <form onSubmit={submit} className="p-5 space-y-3">
        <Field label="What is it? (only this is required)"><input required autoFocus className={input} value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Syrup tank enquiry" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Client"><input className={input} value={f.client} onChange={(e) => set('client', e.target.value)} /></Field>
          <Field label="Where did it come from?"><input className={input} value={f.origin} onChange={(e) => set('origin', e.target.value)} placeholder="boss, phone call, email…" /></Field>
        </div>
        <Field label="What was said or asked"><textarea rows={3} className={input} value={f.note} onChange={(e) => set('note', e.target.value)} placeholder="Write it as you heard it. It is saved as the first entry." /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Next step"><input className={input} value={f.nextAction} onChange={(e) => set('nextAction', e.target.value)} /></Field>
          <Field label="By when"><input type="date" className={input} value={f.nextActionDue} onChange={(e) => set('nextActionDue', e.target.value)} /></Field>
        </div>
        {err && <p className="text-rose-700">{err}</p>}
        <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold cursor-pointer">Cancel</button>
          <button type="submit" className="px-4 py-2 rounded-full bg-slate-900 hover:bg-black text-white font-bold cursor-pointer">Add case</button>
        </div>
      </form>
    </Modal>
  );
}

function Detail({ c, onClose, onPatch, onUpdate }: { c: ProjectCase; onClose: () => void; onPatch: (p: Record<string, string>) => void; onUpdate: (text: string, kind: CaseUpdateKind) => void }) {
  const [text, setText] = useState('');
  const [kind, setKind] = useState<CaseUpdateKind>('note');
  const [err, setErr] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: c.title, client: c.client ?? '', origin: c.origin ?? '', quoteRef: c.quoteRef ?? '', summary: c.summary ?? '', nextAction: c.nextAction ?? '', nextActionDue: c.nextActionDue ?? '' });
  const dirty = (Object.keys(draft) as (keyof typeof draft)[]).some((k) => draft[k] !== ((c as unknown as Record<string, string | undefined>)[k] ?? ''));
  const set = (k: keyof typeof draft, v: string) => setDraft((p) => ({ ...p, [k]: v }));
  const guard = (fn: () => void) => { try { setErr(null); fn(); } catch (x) { setErr(x instanceof Error ? x.message : 'Could not save.'); } };

  return (
    <Modal title={c.title} onClose={onClose}>
      <div className="p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold">Status</span>
          {(['open', 'quoted', 'closed'] as CaseStatus[]).map((s) => (
            <button key={s} onClick={() => guard(() => onPatch({ status: s }))}
              className={`px-3 py-1 rounded-full border font-semibold cursor-pointer ${c.status === s ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{STATUS_LABEL[s]}</button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Title"><input className={input} value={draft.title} onChange={(e) => set('title', e.target.value)} /></Field>
          <Field label="Client"><input className={input} value={draft.client} onChange={(e) => set('client', e.target.value)} /></Field>
          <Field label="Came from"><input className={input} value={draft.origin} onChange={(e) => set('origin', e.target.value)} /></Field>
          <Field label="Quotation number"><input className={input} value={draft.quoteRef} onChange={(e) => set('quoteRef', e.target.value)} /></Field>
        </div>
        <Field label="Summary"><textarea rows={2} className={input} value={draft.summary} onChange={(e) => set('summary', e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Next step"><input className={input} value={draft.nextAction} onChange={(e) => set('nextAction', e.target.value)} /></Field>
          <Field label="By when"><input type="date" className={input} value={draft.nextActionDue} onChange={(e) => set('nextActionDue', e.target.value)} /></Field>
        </div>
        {dirty && (
          <button onClick={() => guard(() => onPatch(draft))} className="px-4 py-2 rounded-full bg-slate-900 hover:bg-black text-white font-bold cursor-pointer">Save changes</button>
        )}

        <div className="pt-3 border-t border-slate-100 space-y-2">
          <div className="font-bold text-sm">Add to the timeline</div>
          <div className="flex gap-2">
            <select className={`${input} !w-36`} value={kind} onChange={(e) => setKind(e.target.value as CaseUpdateKind)}>
              {(['note', 'call', 'voice', 'photo', 'quote'] as CaseUpdateKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
            </select>
            <textarea rows={2} className={input} value={text} onChange={(e) => setText(e.target.value)} placeholder="What was said, decided or sent…" />
          </div>
          <button disabled={!text.trim()} onClick={() => guard(() => { onUpdate(text, kind); setText(''); })} className="px-4 py-2 rounded-full bg-slate-900 disabled:bg-slate-300 text-white font-bold cursor-pointer">Add</button>
        </div>
        {err && <p className="text-rose-700">{err}</p>}

        <ol className="space-y-2 pt-1">
          {[...c.updates].reverse().map((u) => (
            <li key={u.id} className={`rounded-xl px-3 py-2 border ${u.kind === 'system' ? 'bg-slate-50 border-slate-100 text-slate-500' : 'bg-white border-slate-200 text-slate-800'}`}>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="font-semibold">{KIND_LABEL[u.kind]}</span>
                <span>{u.at.slice(0, 16).replace('T', ' ')}</span>
                <span className="truncate">{u.by}</span>
                {u.via === 'claude' && <span className="inline-flex items-center gap-0.5 text-violet-600 font-semibold"><Bot className="w-3 h-3" /> via Claude</span>}
              </div>
              <div className="mt-0.5 whitespace-pre-wrap">{u.text}</div>
            </li>
          ))}
          {c.updates.length === 0 && <li className="text-slate-400">Nothing recorded yet.</li>}
        </ol>
      </div>
    </Modal>
  );
}
