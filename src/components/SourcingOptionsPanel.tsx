'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Trash2, Edit2, Mail, Phone, Globe, MapPin, AlertTriangle, Send } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { filterOptions, hasUsableEmail, type SourcingFilter } from '@/lib/sourcing-options';
import type { SourcingOption, SourcingTier } from '@/types';

const CHIPS: [SourcingFilter, string][] = [
  ['all', 'All'],
  ['confirmed', 'Grades confirmed'],
  ['to_confirm', 'Confirm on RFQ'],
  ['no_email', 'No email'],
];

type Form = {
  companyName: string; category: string; location: string; address: string; website: string;
  email: string; phone: string; grades: string; capabilities: string; tier: SourcingTier;
  confirmOnRfq: string; flag: string; notes: string;
};
const EMPTY: Form = {
  companyName: '', category: 'Stainless steel tank fabrication', location: '', address: '', website: '',
  email: '', phone: '', grades: '', capabilities: '', tier: 'to_confirm', confirmOnRfq: '', flag: '', notes: '',
};

const clean = (v: string) => (v.trim() ? v.trim() : undefined);

export default function SourcingOptionsPanel() {
  const { sourcingOptions, addSourcingOption, updateSourcingOption, deleteSourcingOption } = useApp();
  const [term, setTerm] = useState('');
  const [filter, setFilter] = useState<SourcingFilter>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const list = filterOptions(sourcingOptions, filter, term);
  const emailable = sourcingOptions.filter(hasUsableEmail).length;

  const openAdd = () => { setEditingId(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = (o: SourcingOption) => {
    setEditingId(o.id);
    setForm({
      companyName: o.companyName, category: o.category, location: o.location ?? '', address: o.address ?? '',
      website: o.website ?? '', email: o.email ?? '', phone: o.phone ?? '', grades: o.grades.join(', '),
      capabilities: o.capabilities ?? '', tier: o.tier, confirmOnRfq: o.confirmOnRfq ?? '', flag: o.flag ?? '', notes: o.notes ?? '',
    });
    setShowModal(true);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName.trim()) return;
    const body = {
      companyName: form.companyName.trim(),
      category: form.category.trim() || 'Other',
      location: clean(form.location), address: clean(form.address), website: clean(form.website),
      email: clean(form.email), phone: clean(form.phone),
      grades: form.grades.split(',').map((g) => g.trim()).filter(Boolean),
      capabilities: clean(form.capabilities), tier: form.tier,
      confirmOnRfq: clean(form.confirmOnRfq), flag: clean(form.flag), notes: clean(form.notes),
    };
    if (editingId) updateSourcingOption(editingId, body);
    else addSourcingOption({ ...body, source: 'Added by the team', addedDate: new Date().toISOString().slice(0, 10) });
    setShowModal(false);
  };

  const input = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#FF4D6D] focus:bg-white';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-lg">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3" />
          <input
            type="text" placeholder="Search supplier, place, grade or what they make..." value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="w-full bg-white border border-slate-200/80 rounded-full pl-11 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#FF4D6D] shadow-xs"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1 text-xs" role="group" aria-label="Show">
          {CHIPS.map(([k, label]) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`px-3 py-1.5 rounded-full border font-semibold cursor-pointer ${filter === k ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={openAdd}
          className="flex items-center space-x-1.5 px-4 sm:px-5 py-2 rounded-full bg-slate-900 hover:bg-black text-white text-xs sm:text-sm font-bold shadow-xs cursor-pointer transition-all">
          <Plus className="w-4 h-4 text-[#FF4D6D]" /><span>Add sourcing option</span>
        </button>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{list.length} of {sourcingOptions.length} suppliers · {emailable} with an email on file</span>
        <Link href="/sourcing" className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900">
          <Send className="w-3.5 h-3.5" /> Go to RFQ dispatcher
        </Link>
      </div>

      {list.length === 0 && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center text-sm text-slate-500">No suppliers match.</div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {list.map((o) => (
          <div key={o.id} className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-2.5 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-bold text-base text-slate-900">{o.companyName}</div>
                <div className="text-xs text-slate-500">{o.category}{o.location ? ` · ${o.location}` : ''}</div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${o.tier === 'confirmed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
                  {o.tier === 'confirmed' ? 'Grades confirmed' : 'Confirm on RFQ'}
                </span>
                <button onClick={() => openEdit(o)} className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => { if (window.confirm(`Remove ${o.companyName} from sourcing options?`)) deleteSourcingOption(o.id); }}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>

            {o.grades.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {o.grades.map((g) => <span key={g} className="text-[11px] font-mono bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-full">{g}</span>)}
              </div>
            )}
            {o.capabilities && <p className="text-xs text-slate-700 leading-relaxed">{o.capabilities}</p>}
            {o.confirmOnRfq && <p className="text-xs text-amber-800">To confirm on the RFQ: {o.confirmOnRfq}.</p>}
            {o.flag && (
              <p className="text-xs text-rose-700 flex items-start gap-1.5"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />{o.flag}</p>
            )}

            <div className="grid gap-1 text-xs text-slate-600 pt-2 border-t border-slate-100">
              {o.address && <div className="flex items-start gap-1.5"><MapPin className="w-3.5 h-3.5 mt-0.5 text-slate-400 flex-shrink-0" />{o.address}</div>}
              {o.email ? <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400" /><span className="font-mono">{o.email}</span></div>
                : <div className="flex items-center gap-1.5 text-slate-400"><Mail className="w-3.5 h-3.5" />No email on file</div>}
              {o.phone && <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" /><span className="font-mono">{o.phone}</span></div>}
              {o.website && <div className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-slate-400" /><span className="font-mono">{o.website}</span></div>}
            </div>
            <div className="text-[11px] text-slate-400">Source: {o.source ?? 'not recorded'} · added {o.addedDate}</div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border border-slate-200 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-xs text-slate-900">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="font-bold text-sm">{editingId ? 'Edit sourcing option' : 'Add sourcing option'}</div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 font-bold px-1">✕</button>
            </div>
            <form onSubmit={save} className="p-5 space-y-3 overflow-y-auto">
              <div><label className="block font-bold mb-1">Company</label><input required className={input} value={form.companyName} onChange={(e) => set('companyName', e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block font-bold mb-1">What they do</label><input className={input} value={form.category} onChange={(e) => set('category', e.target.value)} /></div>
                <div><label className="block font-bold mb-1">City / area</label><input className={input} value={form.location} onChange={(e) => set('location', e.target.value)} /></div>
              </div>
              <div><label className="block font-bold mb-1">Address</label><input className={input} value={form.address} onChange={(e) => set('address', e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block font-bold mb-1">Email</label><input type="email" className={input} value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="leave empty if unknown" /></div>
                <div><label className="block font-bold mb-1">Phone</label><input className={input} value={form.phone} onChange={(e) => set('phone', e.target.value)} /></div>
              </div>
              <div><label className="block font-bold mb-1">Website</label><input className={input} value={form.website} onChange={(e) => set('website', e.target.value)} /></div>
              <div><label className="block font-bold mb-1">Grades / materials (comma separated)</label><input className={input} value={form.grades} onChange={(e) => set('grades', e.target.value)} placeholder="SS 304, SS 316" /></div>
              <div><label className="block font-bold mb-1">What they make</label><textarea rows={3} className={input} value={form.capabilities} onChange={(e) => set('capabilities', e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Status</label>
                  <select className={input} value={form.tier} onChange={(e) => set('tier', e.target.value)}>
                    <option value="confirmed">Grades confirmed</option>
                    <option value="to_confirm">Confirm on RFQ</option>
                  </select>
                </div>
                <div><label className="block font-bold mb-1">Still to confirm</label><input className={input} value={form.confirmOnRfq} onChange={(e) => set('confirmOnRfq', e.target.value)} /></div>
              </div>
              <div><label className="block font-bold mb-1">Check before contacting (optional)</label><input className={input} value={form.flag} onChange={(e) => set('flag', e.target.value)} /></div>
              <div><label className="block font-bold mb-1">Notes</label><input className={input} value={form.notes} onChange={(e) => set('notes', e.target.value)} /></div>
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-full bg-slate-900 hover:bg-black text-white font-bold cursor-pointer">{editingId ? 'Save changes' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
