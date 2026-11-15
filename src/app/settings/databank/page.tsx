'use client';

import React, { useState } from 'react';
import {
  Database,
  Plus,
  Trash2,
  Edit2,
  RotateCcw,
  Search,
  Check,
  Building,
  DollarSign,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { DataBankItem } from '@/types';

export default function DataBankPage() {
  const { dataBank, addDataBankItem, updateDataBankItem, deleteDataBankItem, resetDataBank } =
    useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formCompany, setFormCompany] = useState('');
  const [formMachine, setFormMachine] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formCategory, setFormCategory] = useState('Switchgear & Relays');

  const filteredItems = dataBank.filter((item) => {
    const s = searchTerm.toLowerCase();
    return (
      item.company.toLowerCase().includes(s) ||
      item.machineName.toLowerCase().includes(s) ||
      (item.category && item.category.toLowerCase().includes(s))
    );
  });

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCompany || !formMachine || !formPrice) return;

    if (editingId) {
      updateDataBankItem(editingId, {
        company: formCompany,
        machineName: formMachine,
        pricePKR: parseFloat(formPrice),
        lastCheckedDate: formDate,
        category: formCategory,
      });
      setEditingId(null);
    } else {
      addDataBankItem({
        company: formCompany,
        machineName: formMachine,
        pricePKR: parseFloat(formPrice),
        lastCheckedDate: formDate,
        category: formCategory,
      });
    }

    setFormCompany('');
    setFormMachine('');
    setFormPrice('');
    setShowAddModal(false);
  };

  const startEdit = (item: DataBankItem) => {
    setEditingId(item.id);
    setFormCompany(item.company);
    setFormMachine(item.machineName);
    setFormPrice(item.pricePKR.toString());
    setFormDate(item.lastCheckedDate);
    setFormCategory(item.category || 'Switchgear & Relays');
    setShowAddModal(true);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden text-slate-100">
      {/* Main Content inside Onyx Pod */}
      <main className="flex-1 space-y-5 overflow-y-auto">
        {/* Top Controls: Search Bar & Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
            <input
              type="text"
              placeholder="Search supplier, item, SKU, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#16171B] border border-white/10 rounded-full pl-11 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FF4D6D] font-mono shadow-md"
            />
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={resetDataBank}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              title="Reset to 5 Seed Industrial Items"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <button
              onClick={() => {
                setEditingId(null);
                setFormCompany('');
                setFormMachine('');
                setFormPrice('');
                setShowAddModal(true);
              }}
              className="flex items-center space-x-1.5 px-4 sm:px-5 py-2 rounded-full bg-[#FF4D6D] hover:bg-[#FA3B5E] text-white text-xs sm:text-sm font-bold shadow-md shadow-[#FF4D6D]/30 cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Benchmark Item</span>
            </button>
          </div>
        </div>

        {/* Mobile View: Touch Cards (<md) */}
        <div className="md:hidden space-y-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-[#16171B] border border-white/5 rounded-2xl p-4 shadow-lg space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-base text-white flex items-center space-x-2">
                  <Building className="w-4 h-4 text-[#FF4D6D]" />
                  <span>{item.company}</span>
                </span>
                <span className="font-mono font-bold text-base text-[#FF4D6D]">
                  Rs. {new Intl.NumberFormat('en-PK').format(item.pricePKR)}
                </span>
              </div>
              <div className="text-sm font-medium text-slate-200">
                {item.machineName}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono pt-2 border-t border-[#262830]">
                <span className="bg-black/40 px-2.5 py-0.5 rounded-full border border-white/5">
                  {item.lastCheckedDate}
                </span>
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => startEdit(item)}
                    className="p-2 bg-white/10 hover:bg-white/20 text-[#FF4D6D] rounded-full text-xs"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteDataBankItem(item.id)}
                    className="p-2 bg-white/10 hover:bg-rose-500/20 text-rose-400 rounded-full text-xs"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View: Full Spreadsheet Table (>=md) */}
        <div className="hidden md:block bg-[#16171B] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-5 border-b border-[#262830] flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Industrial Pricing Memory</h2>
              <p className="text-xs text-slate-400 mt-0.5">{filteredItems.length} verified supplier price records</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm text-left">
              <thead>
                <tr className="bg-[#121316] border-b border-[#262830] text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-5">#</th>
                  <th className="py-4 px-5">Company (Supplier)</th>
                  <th className="py-4 px-5">Machine / Instrument Name (SKU)</th>
                  <th className="py-4 px-5 text-right">Price (PKR)</th>
                  <th className="py-4 px-5 text-center">Last Checked Date</th>
                  <th className="py-4 px-5">Category</th>
                  <th className="py-4 px-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#23252E]">
                {filteredItems.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-4 px-5 font-mono text-slate-500">{idx + 1}</td>
                    <td className="py-4 px-5">
                      <div className="font-bold text-base text-slate-100 flex items-center space-x-2">
                        <Building className="w-4 h-4 text-[#FF4D6D] flex-shrink-0" />
                        <span>{item.company}</span>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="font-semibold text-slate-200 text-sm">{item.machineName}</div>
                      {item.notes && (
                        <div className="text-xs text-slate-400 mt-0.5">{item.notes}</div>
                      )}
                    </td>
                    <td className="py-4 px-5 text-right font-mono font-bold text-base text-[#FF4D6D]">
                      Rs. {new Intl.NumberFormat('en-PK').format(item.pricePKR)}
                    </td>
                    <td className="py-4 px-5 text-center font-mono text-slate-300">
                      <span className="inline-flex items-center space-x-1.5 bg-black/40 px-3 py-1 rounded-full border border-white/5 text-xs">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{item.lastCheckedDate}</span>
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <span className="text-xs bg-white/10 text-slate-200 px-3 py-1 rounded-full font-mono font-semibold">
                        {item.category || 'Industrial'}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => startEdit(item)}
                          className="p-1.5 text-slate-300 hover:text-[#FF4D6D] hover:bg-white/10 rounded-full transition-colors"
                          title="Edit Item"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteDataBankItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-full transition-colors"
                          title="Delete Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col text-xs text-slate-200">
            <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="font-bold text-sm text-white flex items-center space-x-2">
                <Database className="w-4 h-4 text-amber-400" />
                <span>{editingId ? 'Edit Benchmark Item' : 'Add New Data Bank Benchmark'}</span>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-5 space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Company (Supplier / Wholesaler):
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Brandt Industrial Lahore, Al-Madina Brandreth Rd"
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Machine / Instrument Name (with exact SKU):
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Siemens SIRIUS Contactor Relay 24V DC (3RH2122-1BB40)"
                  value={formMachine}
                  onChange={(e) => setFormMachine(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Price in PKR:
                  </label>
                  <input
                    type="number"
                    required
                    step="any"
                    placeholder="e.g. 14500"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Last Checked Date:
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Category:
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="Switchgear & Relays">Switchgear &amp; Relays</option>
                  <option value="Automation & PLC">Automation &amp; PLC</option>
                  <option value="Variable Speed Drives">Variable Speed Drives</option>
                  <option value="Sensors & Instrumentation">Sensors &amp; Instrumentation</option>
                  <option value="Valves & Mechanical">Valves &amp; Mechanical</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md cursor-pointer"
                >
                  {editingId ? 'Save Changes' : 'Add to Data Bank'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
