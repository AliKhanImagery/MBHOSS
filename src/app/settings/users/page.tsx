'use client';

import React, { useState } from 'react';
import { Users, UserPlus, Shield, ShieldCheck, Check, X, ToggleLeft, ToggleRight } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { UserRole, User } from '@/types';
import { formatRef, nextRef, rangesOverlap, validateRange, type QuoteRange } from '@/lib/quote-range';

export default function UserManagementPage() {
  const { users, addUser, updateUserFeatures, activeCases, isAdmin } = useApp();
  const [rangeFor, setRangeFor] = useState<User | null>(null);
  const [rf, setRf] = useState({ prefix: '', digits: '5', start: '', end: '' });
  const [rangeErrors, setRangeErrors] = useState<string[]>([]);
  const [rangeSaving, setRangeSaving] = useState(false);

  const openRange = (u: User) => {
    const r = u.features?.quoteRange;
    setRf({ prefix: r?.prefix ?? '', digits: String(r?.digits ?? 5), start: r ? String(r.start) : '', end: r ? String(r.end) : '' });
    setRangeErrors([]);
    setRangeFor(u);
  };

  const saveRange = async (clear = false) => {
    if (!rangeFor) return;
    if (clear) {
      setRangeSaving(true);
      const ok = await updateUserFeatures(rangeFor.id, { quoteRange: undefined });
      setRangeSaving(false);
      if (!ok) return setRangeErrors(['Removed here, but the cloud did not accept it. Check your connection or sign-in and try again.']);
      return setRangeFor(null);
    }
    const r: QuoteRange = { prefix: rf.prefix.trim(), digits: Number(rf.digits), start: Number(rf.start), end: Number(rf.end) };
    const errs = validateRange(r);
    if (rf.start.trim() === '' || rf.end.trim() === '') errs.push('Fill in both From and To.');
    for (const o of users) {
      const or = o.features?.quoteRange;
      if (o.id !== rangeFor.id && or && rangesOverlap(r, or)) errs.push(`This overlaps ${o.name}'s range (${formatRef(or, or.start)} to ${formatRef(or, or.end)}).`);
    }
    if (errs.length) return setRangeErrors(errs);
    setRangeSaving(true);
    const ok = await updateUserFeatures(rangeFor.id, { quoteRange: r });
    setRangeSaving(false);
    if (!ok) return setRangeErrors(['Saved here, but the cloud did not accept it. Check your connection or sign-in and try again.']);
    setRangeFor(null);
  };
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('Procurement Engineer');

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName || !inviteEmail) return;

    addUser({
      name: inviteName,
      email: inviteEmail,
      role: inviteRole,
      features: {
        directPdfExport: inviteRole === 'Super Admin' || inviteRole === 'Procurement Engineer',
        dataBankWrite: inviteRole === 'Super Admin',
        marginOverride: inviteRole === 'Super Admin',
        whatsappBot: true,
      },
    });

    setInviteName('');
    setInviteEmail('');
    setShowInviteModal(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden text-slate-900 select-none">
      {/* Sub Header & Actions */}
      <div className="bg-white border border-slate-200/80 rounded-2xl px-5 py-3.5 mb-4 flex items-center justify-between flex-shrink-0 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 flex items-center space-x-2">
              <span>User Management &amp; Access Control</span>
              <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-mono font-semibold border border-slate-200">
                {users.length} Active Staff
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Manage procurement team permissions, margin override rights, and export access
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-full bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
        >
          <UserPlus className="w-3.5 h-3.5 text-[#FF4D6D]" />
          <span>+ Invite Member</span>
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 space-y-4 overflow-y-auto">
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5">User</th>
                  <th className="py-3.5 px-5">Role</th>
                  <th className="py-3.5 px-5 text-center">Direct PDF Export</th>
                  <th className="py-3.5 px-5 text-center">Data Bank Write</th>
                  <th className="py-3.5 px-5 text-center">Margin Override</th>
                  <th className="py-3.5 px-5 text-center">WhatsApp Bot</th>
                  <th className="py-3.5 px-5">Quotation numbers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* User Info */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
                          {user.avatar || 'U'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs">{user.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{user.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                          user.role === 'Super Admin'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : user.role === 'Procurement Engineer'
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>

                    {/* Feature Toggle 1: Direct PDF Export */}
                    <td className="py-3.5 px-5 text-center">
                      <button
                        onClick={() =>
                          updateUserFeatures(user.id, {
                            directPdfExport: !user.features?.directPdfExport,
                          })
                        }
                        className="cursor-pointer"
                        title="Toggle Direct PDF Export"
                      >
                        {user.features?.directPdfExport ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-xs">
                            <Check className="w-3 h-3" />
                            <span>Enabled</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs border border-slate-200">
                            <X className="w-3 h-3" />
                            <span>Disabled</span>
                          </span>
                        )}
                      </button>
                    </td>

                    {/* Feature Toggle 2: Data Bank Write */}
                    <td className="py-3.5 px-5 text-center">
                      <button
                        onClick={() =>
                          updateUserFeatures(user.id, {
                            dataBankWrite: !user.features?.dataBankWrite,
                          })
                        }
                        className="cursor-pointer"
                        title="Toggle Data Bank Write Access"
                      >
                        {user.features?.dataBankWrite ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-xs">
                            <Check className="w-3 h-3" />
                            <span>Enabled</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs border border-slate-200">
                            <X className="w-3 h-3" />
                            <span>Disabled</span>
                          </span>
                        )}
                      </button>
                    </td>

                    {/* Feature Toggle 3: Margin Override */}
                    <td className="py-3.5 px-5 text-center">
                      <button
                        onClick={() =>
                          updateUserFeatures(user.id, {
                            marginOverride: !user.features?.marginOverride,
                          })
                        }
                        className="cursor-pointer"
                        title="Toggle Margin Override"
                      >
                        {user.features?.marginOverride ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-xs">
                            <Check className="w-3 h-3" />
                            <span>Enabled</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs border border-slate-200">
                            <X className="w-3 h-3" />
                            <span>Disabled</span>
                          </span>
                        )}
                      </button>
                    </td>

                    {/* Feature Toggle 4: WhatsApp Bot */}
                    <td className="py-3.5 px-5 text-center">
                      <button
                        onClick={() =>
                          updateUserFeatures(user.id, {
                            whatsappBot: !user.features?.whatsappBot,
                          })
                        }
                        className="cursor-pointer"
                        title="Toggle WhatsApp Bot Access"
                      >
                        {user.features?.whatsappBot ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-xs">
                            <Check className="w-3 h-3" />
                            <span>Enabled</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs border border-slate-200">
                            <X className="w-3 h-3" />
                            <span>Disabled</span>
                          </span>
                        )}
                      </button>
                    </td>

                    {/* Quotation number range (admin-assigned) */}
                    <td className="py-3.5 px-5">
                      {(() => {
                        const r = user.features?.quoteRange;
                        const used = activeCases.map((c) => c.caseRef);
                        const n = r ? nextRef(r, used) : null;
                        return (
                          <div className="flex items-center gap-2">
                            <div className="text-[11px] leading-tight">
                              {r ? (
                                <>
                                  <div className="font-mono font-semibold text-slate-800">{formatRef(r, r.start)} – {formatRef(r, r.end)}</div>
                                  <div className="text-slate-500">{n && n.ok ? `next: ${n.ref}` : 'range used up'}</div>
                                </>
                              ) : (
                                <span className="text-slate-400">Not assigned</span>
                              )}
                            </div>
                            {isAdmin && (
                              <button onClick={() => openRange(user)} className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-[11px] font-semibold text-slate-700 cursor-pointer">{r ? 'Edit' : 'Assign'}</button>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>


      {/* Quotation number range modal */}
      {rangeFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden text-xs text-slate-900">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="font-bold text-sm">Quotation numbers for {rangeFor.name}</div>
              <button onClick={() => setRangeFor(null)} className="text-slate-400 hover:text-slate-700 font-bold px-1">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-slate-600">Each new quotation gets the next free number from this range. Only this person can use it, so two people never issue the same number.</p>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="block font-bold mb-1">Starting letters</span>
                  <input value={rf.prefix} onChange={(e) => setRf({ ...rf, prefix: e.target.value })} placeholder="e.g. Q26" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-[#FF4D6D]" /></label>
                <label className="block"><span className="block font-bold mb-1">Number length (digits)</span>
                  <input type="number" min={1} max={8} value={rf.digits} onChange={(e) => setRf({ ...rf, digits: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-[#FF4D6D]" /></label>
                <label className="block"><span className="block font-bold mb-1">From</span>
                  <input type="number" min={0} value={rf.start} onChange={(e) => setRf({ ...rf, start: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-[#FF4D6D]" /></label>
                <label className="block"><span className="block font-bold mb-1">To</span>
                  <input type="number" min={0} value={rf.end} onChange={(e) => setRf({ ...rf, end: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-[#FF4D6D]" /></label>
              </div>
              {(() => {
                const s0 = Number(rf.start), e0 = Number(rf.end), dg = Number(rf.digits);
                const ok = rf.start !== '' && rf.end !== '' && validateRange({ prefix: rf.prefix.trim(), digits: dg, start: s0, end: e0 }).length === 0;
                return ok ? <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 font-mono">First number: {formatRef({ prefix: rf.prefix.trim(), digits: dg, start: s0, end: e0 }, s0)}</div> : null;
              })()}
              {rangeErrors.length > 0 && (
                <ul className="rounded-lg bg-red-50 text-red-800 px-3 py-2 space-y-1">{rangeErrors.map((e, i) => <li key={i}>{e}</li>)}</ul>
              )}
              <div className="pt-2 flex items-center justify-between">
                <button onClick={() => void saveRange(true)} disabled={rangeSaving || !rangeFor.features?.quoteRange} className="text-[11px] font-semibold text-red-700 hover:underline disabled:opacity-30 cursor-pointer">Remove range</button>
                <div className="flex gap-2">
                  <button onClick={() => setRangeFor(null)} className="px-4 py-2 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold cursor-pointer">Cancel</button>
                  <button onClick={() => void saveRange()} disabled={rangeSaving} className="px-4 py-2 rounded-full bg-slate-900 hover:bg-black text-white font-bold disabled:opacity-50 cursor-pointer">{rangeSaving ? 'Saving…' : 'Save'}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col text-xs text-slate-900">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                <UserPlus className="w-4 h-4 text-[#FF4D6D]" />
                <span>Invite Procurement Team Member</span>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold px-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInvite} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Usman Afzal"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#FF4D6D] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Work Email:
                </label>
                <input
                  type="email"
                  required
                  placeholder="usman@qriprocurement.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#FF4D6D] focus:bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Assigned Role:
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#FF4D6D] focus:bg-white"
                >
                  <option value="Procurement Engineer">Procurement Engineer</option>
                  <option value="Super Admin">Super Admin</option>
                  <option value="Viewer">Viewer (Read Only)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-full bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
                >
                  Send Access Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
