'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Settings,
  Users,
  Trophy,
  Upload,
  FileCheck,
  Save,
  CheckCircle,
  Plus,
  RefreshCw,
  Sliders,
  Smartphone,
  Hash,
  Download,
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { QuickAddRateModal } from '@/components/QuickAddRateModal';
import { SystemSettings, User } from '@/lib/db';

export default function CtoAdminGodMode() {
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Letterhead upload & test stamp
  const [letterheadBase64, setLetterheadBase64] = useState<string | null>(null);
  const [letterheadFileName, setLetterheadFileName] = useState<string>('');
  const [isTestStamping, setIsTestStamping] = useState(false);

  // New user form state
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('+923');
  const [newUserStart, setNewUserStart] = useState('4000');
  const [newUserEnd, setNewUserEnd] = useState('4999');

  const fetchAdminData = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (data.settings) setSettings(data.settings);
      if (data.users) setUsers(data.users);
      if (data.leaderboard) setLeaderboard(data.leaderboard);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleSaveSettings = async () => {
    if (!settings) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settingsUpdates: settings,
          userUpdates: users.map((u) => ({
            id: u.id,
            ref_range_start: u.ref_range_start,
            ref_range_end: u.ref_range_end,
            whatsapp_phone: u.whatsapp_phone,
          })),
        }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
        fetchAdminData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserPhone) return;

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newUser: {
            full_name: newUserName,
            email: newUserEmail || `${newUserName.toLowerCase().replace(/\s+/g, '')}@oosprocurement.com`,
            whatsapp_phone: newUserPhone,
            ref_range_start: parseInt(newUserStart, 10),
            ref_range_end: parseInt(newUserEnd, 10),
          },
        }),
      });

      if (res.ok) {
        setShowAddUser(false);
        setNewUserName('');
        setNewUserPhone('+923');
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle letterhead PDF file upload
  const handleLetterheadUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLetterheadFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setLetterheadBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Test-Stamp Letterhead PDF
  const handleTestStampLetterhead = async () => {
    if (!settings) return;
    setIsTestStamping(true);

    try {
      const testQuoteCase = {
        id: 'test-case-admin',
        case_ref_number: 'QT-2026-TEST',
        customer_name: 'TEST LETTERHEAD VALIDATION CLIENT',
        target_country: 'Pakistan',
        base_currency: 'PKR',
        tax_mode: 'WITHOUT_GST',
        custom_tax_pct: 0,
        wht_pct: 0,
        delivery_terms: 'Ex-Stock Test',
        payment_terms: '100% Advance',
        validity_days: 7,
        split_rfq_by_category: false,
        status: 'DRAFT',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const testLines = [
        {
          id: 'test-line-1',
          quote_case_id: 'test-case-admin',
          raw_input_text: 'Siemens SIRIUS Contactor Relay 24V DC',
          custom_description: 'Siemens SIRIUS Contactor Relay 24V DC, 2NO+2NC, Size S00',
          qty: 10,
          unit_of_measure: 'PCS',
          selected_cost: 14500,
          currency: 'PKR',
          suggested_margin_pct: 15,
          margin_pct: 15,
          final_unit_price: 16675,
          line_total: 166750,
          confidence_level: 'GREEN',
          incoterm_code: 'DDP',
          is_alternative: false,
          sort_order: 0,
          created_at: new Date().toISOString(),
          item: {
            id: 'item-test-1',
            official_sku: '3RH2122-1BB40',
            brand: 'Siemens',
            category: 'Switchgear & Relays',
            plain_english_description: 'Contactor Relay 24V DC',
            local_market_aliases: [],
            unit_of_measure: 'PCS',
            created_at: '',
          },
        },
      ];

      const res = await fetch('/api/pdf/stamp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'FINAL_CLIENT_QUOTE',
          quoteCase: testQuoteCase,
          lineItems: testLines,
          letterheadBase64: letterheadBase64 || undefined,
        }),
      });

      if (!res.ok) throw new Error('Test stamp failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Test-Stamp-Margins-Top${settings.pdf_top_margin_pt}pt-Bottom${settings.pdf_bottom_margin_pt}pt.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      alert('Test stamp failed');
    } finally {
      setIsTestStamping(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navigation onOpenQuickAdd={() => setIsQuickAddOpen(true)} />

      <main className="flex-1 p-3 space-y-3 max-w-[1920px] mx-auto w-full">
        {/* Admin Header */}
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex flex-wrap items-center justify-between gap-3 shadow-md">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white flex items-center space-x-1.5">
                <span>CTO God Mode Admin Control Panel</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-mono">
                  Master Authority
                </span>
              </h1>
              <p className="text-[10px] text-slate-400">
                Manage Reference Number Ranges, PDF Letterhead Safe Margins, Phone Whitelist &amp; Leaderboards
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {saveSuccess && (
              <span className="text-emerald-400 text-xs font-semibold flex items-center space-x-1 animate-in fade-in">
                <CheckCircle className="w-4 h-4" />
                <span>Changes Saved &amp; Synced!</span>
              </span>
            )}
            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded shadow-md shadow-emerald-900/30 transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save All Settings'}</span>
            </button>
          </div>
        </div>

        {/* 3-COLUMN OR 2-COLUMN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* COLUMN 1: SYSTEM SETTINGS & LETTERHEAD MARGINS */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-4 shadow-sm">
            <div className="flex items-center space-x-1.5 border-b border-slate-800 pb-2">
              <Settings className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                System Formats &amp; Letterhead Safe Margins
              </h2>
            </div>

            {settings && (
              <div className="space-y-3 text-xs">
                {/* Reference Number Format */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Quotation Reference Format Pattern:
                  </label>
                  <input
                    type="text"
                    value={settings.quote_ref_format}
                    onChange={(e) => setSettings({ ...settings, quote_ref_format: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-amber-400 font-mono focus:outline-none focus:border-amber-400"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Replaces {'{YYYY}'} with year, {'{SEQ}'} with sequence (e.g. QT-2026-1001)
                  </p>
                </div>

                {/* Country & Currency & USD Rate */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Target Country:
                    </label>
                    <input
                      type="text"
                      value={settings.default_target_country}
                      onChange={(e) => setSettings({ ...settings, default_target_country: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      USD to PKR Rate:
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={settings.usd_to_pkr_rate}
                      onChange={(e) =>
                        setSettings({ ...settings, usd_to_pkr_rate: parseFloat(e.target.value) || 278.5 })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                {/* Top & Bottom Margin PT */}
                <div className="p-3 bg-slate-950 border border-slate-800 rounded space-y-2">
                  <div className="font-semibold text-slate-200 text-xs flex items-center justify-between">
                    <span>PDF Letterhead Safe Margins (Points)</span>
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">
                        Top Margin (pt) [Default: 140]:
                      </label>
                      <input
                        type="number"
                        value={settings.pdf_top_margin_pt}
                        onChange={(e) =>
                          setSettings({ ...settings, pdf_top_margin_pt: parseInt(e.target.value, 10) || 140 })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">
                        Bottom Margin (pt) [Default: 90]:
                      </label>
                      <input
                        type="number"
                        value={settings.pdf_bottom_margin_pt}
                        onChange={(e) =>
                          setSettings({ ...settings, pdf_bottom_margin_pt: parseInt(e.target.value, 10) || 90 })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Letterhead File Upload */}
                  <div className="pt-2 border-t border-slate-800">
                    <label className="block text-[10px] text-slate-400 mb-1">
                      Upload Blank Pre-Printed Letterhead PDF:
                    </label>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handleLetterheadUpload}
                      className="w-full text-slate-400 text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                    />
                    {letterheadFileName && (
                      <div className="text-[10px] text-emerald-400 mt-1 flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>Loaded: {letterheadFileName}</span>
                      </div>
                    )}
                  </div>

                  {/* Test-Stamp Button */}
                  <button
                    type="button"
                    onClick={handleTestStampLetterhead}
                    disabled={isTestStamping}
                    className="w-full mt-2 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-xs rounded border border-amber-500/30 flex items-center justify-center space-x-1.5 cursor-pointer transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isTestStamping ? 'Stamping Test...' : 'Test-Stamp Blank Letterhead'}</span>
                  </button>
                </div>

                {/* CTO Approval Bypass V1 */}
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-200 text-xs">V1 CTO Approval Bypass</div>
                    <div className="text-[10px] text-slate-400">
                      Allows staff to stamp quotes immediately without manual signoff
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.cto_approval_bypass_v1}
                    onChange={(e) =>
                      setSettings({ ...settings, cto_approval_bypass_v1: e.target.checked })
                    }
                    className="accent-amber-400 rounded w-4 h-4 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* COLUMN 2: EMPLOYEE SEQUENCE RANGES & WHATSAPP PHONE WHITELIST */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-3 shadow-sm lg:col-span-1">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-1.5">
                <Users className="w-4 h-4 text-emerald-400" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                  Employee Sequence Ranges &amp; WhatsApp Whitelist
                </h2>
              </div>
              <button
                onClick={() => setShowAddUser(!showAddUser)}
                className="px-2 py-0.5 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded text-[10px] font-bold flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add User</span>
              </button>
            </div>

            {/* Add User Collapsible Form */}
            {showAddUser && (
              <form onSubmit={handleAddUser} className="p-2.5 bg-slate-950 border border-emerald-500/40 rounded space-y-2 text-xs">
                <div className="font-semibold text-emerald-300 text-[11px]">Authorize New Employee</div>
                <input
                  type="text"
                  placeholder="Full Name (e.g. Usman Afzal)"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs"
                />
                <input
                  type="text"
                  placeholder="WhatsApp Phone (E.164, e.g. +923001234567)"
                  required
                  value={newUserPhone}
                  onChange={(e) => setNewUserPhone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs font-mono"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Range Start (4000)"
                    value={newUserStart}
                    onChange={(e) => setNewUserStart(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs font-mono"
                  />
                  <input
                    type="number"
                    placeholder="Range End (4999)"
                    value={newUserEnd}
                    onChange={(e) => setNewUserEnd(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs font-mono"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddUser(false)}
                    className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-[10px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-emerald-600 text-white font-bold rounded text-[10px]"
                  >
                    Save &amp; Authorize
                  </button>
                </div>
              </form>
            )}

            {/* User List */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {users.map((u, i) => (
                <div
                  key={u.id}
                  className="p-2.5 bg-slate-950 border border-slate-800 rounded space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">{u.full_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{u.email}</div>
                    </div>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                        u.role === 'CTO_ADMIN'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                      }`}
                    >
                      {u.role}
                    </span>
                  </div>

                  {/* Whitelisted WhatsApp Phone */}
                  <div className="flex items-center space-x-1.5 text-[11px]">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-slate-400">Whitelisted Phone:</span>
                    <input
                      type="text"
                      value={u.whatsapp_phone}
                      onChange={(e) => {
                        const updated = [...users];
                        updated[i].whatsapp_phone = e.target.value;
                        setUsers(updated);
                      }}
                      className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-emerald-300 font-mono text-[11px] focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Allocated Sequence Range */}
                  <div className="flex items-center space-x-2 text-[11px] font-mono">
                    <Hash className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-slate-400">Range:</span>
                    <input
                      type="number"
                      value={u.ref_range_start}
                      onChange={(e) => {
                        const updated = [...users];
                        updated[i].ref_range_start = parseInt(e.target.value, 10) || 0;
                        setUsers(updated);
                      }}
                      className="w-16 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-center text-white"
                    />
                    <span className="text-slate-500">&ndash;</span>
                    <input
                      type="number"
                      value={u.ref_range_end}
                      onChange={(e) => {
                        const updated = [...users];
                        updated[i].ref_range_end = parseInt(e.target.value, 10) || 0;
                        setUsers(updated);
                      }}
                      className="w-16 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-center text-white"
                    />
                    <span className="text-slate-400 text-[10px]">
                      (Current: <strong className="text-amber-400">{u.ref_current_seq}</strong>)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* COLUMN 3: GOLD MINE CONTRIBUTOR LEADERBOARD */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-3 shadow-sm lg:col-span-1">
            <div className="flex items-center space-x-1.5 border-b border-slate-800 pb-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Gold Mine Contributor Leaderboard
              </h2>
            </div>
            <p className="text-[10px] text-slate-400">
              Procurement engineers ranked by verified local market rates logged into the system this month
            </p>

            <div className="space-y-2">
              {leaderboard.map((item, index) => {
                let badgeColor = 'bg-slate-800 text-slate-400';
                let medal = `#${index + 1}`;
                if (index === 0) {
                  badgeColor = 'bg-amber-500/20 text-amber-300 border border-amber-500/50';
                  medal = '🥇 1st';
                } else if (index === 1) {
                  badgeColor = 'bg-slate-300/20 text-slate-200 border border-slate-400/50';
                  medal = '🥈 2nd';
                } else if (index === 2) {
                  badgeColor = 'bg-amber-700/20 text-amber-600 border border-amber-700/50';
                  medal = '🥉 3rd';
                }

                return (
                  <div
                    key={item.user.id}
                    className={`p-3 rounded-lg border flex items-center justify-between ${
                      index === 0 ? 'bg-amber-500/[0.06] border-amber-500/30' : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className={`px-2 py-1 rounded text-xs font-bold font-mono ${badgeColor}`}>
                        {medal}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-white">{item.user.full_name}</div>
                        <div className="text-[10px] text-slate-400">{item.user.role}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold font-mono text-emerald-400">
                        {item.totalContributions} Rates Logged
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {item.verifiedCount} Verified Proofs
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      <QuickAddRateModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        masterItems={[]}
        masterSuppliers={[]}
      />
    </div>
  );
}
