'use client';

import React, { useState } from 'react';
import { Users, UserPlus, Shield, ShieldCheck, Check, X, ToggleLeft, ToggleRight } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { UserRole } from '@/types';

export default function UserManagementPage() {
  const { users, addUser, updateUserFeatures } = useApp();
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
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden text-slate-100">
      {/* Header */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center space-x-2">
              <span>User Management &amp; Feature Access</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                {users.length} Active Staff
              </span>
            </h1>
            <p className="text-[10px] text-slate-400">
              Manage procurement team permissions, margin override rights, and export access
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/40 cursor-pointer transition-all"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>+ Invite Procurement Member</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 space-y-4 overflow-y-auto">
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs text-left">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4 text-center">Direct PDF Export</th>
                  <th className="py-3 px-4 text-center">Data Bank Write</th>
                  <th className="py-3 px-4 text-center">Margin Override</th>
                  <th className="py-3 px-4 text-center">WhatsApp Bot</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-850/60 transition-colors">
                    {/* User Info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 font-bold flex items-center justify-center text-xs">
                          {user.avatar || 'U'}
                        </div>
                        <div>
                          <div className="font-bold text-white text-xs">{user.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{user.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          user.role === 'Super Admin'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : user.role === 'Procurement Engineer'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>

                    {/* Feature Toggle 1: Direct PDF Export */}
                    <td className="py-3 px-4 text-center">
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
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold text-[10px]">
                            <Check className="w-3 h-3" />
                            <span>Enabled</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-800 text-slate-500 text-[10px]">
                            <X className="w-3 h-3" />
                            <span>Disabled</span>
                          </span>
                        )}
                      </button>
                    </td>

                    {/* Feature Toggle 2: Data Bank Write */}
                    <td className="py-3 px-4 text-center">
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
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold text-[10px]">
                            <Check className="w-3 h-3" />
                            <span>Enabled</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-800 text-slate-500 text-[10px]">
                            <X className="w-3 h-3" />
                            <span>Disabled</span>
                          </span>
                        )}
                      </button>
                    </td>

                    {/* Feature Toggle 3: Margin Override */}
                    <td className="py-3 px-4 text-center">
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
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold text-[10px]">
                            <Check className="w-3 h-3" />
                            <span>Enabled</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-800 text-slate-500 text-[10px]">
                            <X className="w-3 h-3" />
                            <span>Disabled</span>
                          </span>
                        )}
                      </button>
                    </td>

                    {/* Feature Toggle 4: WhatsApp Bot */}
                    <td className="py-3 px-4 text-center">
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
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold text-[10px]">
                            <Check className="w-3 h-3" />
                            <span>Enabled</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-800 text-slate-500 text-[10px]">
                            <X className="w-3 h-3" />
                            <span>Disabled</span>
                          </span>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col text-xs text-slate-200">
            <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="font-bold text-sm text-white flex items-center space-x-2">
                <UserPlus className="w-4 h-4 text-emerald-400" />
                <span>Invite Procurement Team Member</span>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInvite} className="p-5 space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Full Name:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Usman Afzal"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Work Email:
                </label>
                <input
                  type="email"
                  required
                  placeholder="usman@qriprocurement.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Assigned Role:
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                >
                  <option value="Procurement Engineer">Procurement Engineer</option>
                  <option value="Super Admin">Super Admin</option>
                  <option value="Viewer">Viewer (Read Only)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer"
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
