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
  const { dataBank, addDataBankItem, updateDataBankItem, deleteDataBankItem } = useApp();
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
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden text-slate-900 select-none">
      {/* Main Content inside Clean White Card */}
      <main className="flex-1 space-y-4 overflow-y-auto">
        {/* Top Controls: Search Bar & Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3" />
            <input
              type="text"
              placeholder="Search supplier, item, SKU, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200/80 rounded-full pl-11 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#FF4D6D] font-mono shadow-xs"
            />
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setEditingId(null);
                setFormCompany('');
                setFormMachine('');
                setFormPrice('');
                setShowAddModal(true);
              }}
              className="flex items-center space-x-1.5 px-4 sm:px-5 py-2 rounded-full bg-slate-900 hover:bg-black text-white text-xs sm:text-sm font-bold shadow-xs cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4 text-[#FF4D6D]" />
              <span>+ Add Benchmark Item</span>
            </button>
          </div>
        </div>

        {/* Mobile View: Touch Cards (<md) */}
        <div className="md:hidden space-y-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-base text-slate-900 flex items-center space-x-2">
                  <Building className="w-4 h-4 text-[#FF4D6D]" />
                  <span>{item.company}</span>
                </span>
                <span className="font-mono font-bold text-base text-[#FF4D6D]">
                  Rs. {new Intl.NumberFormat('en-PK').format(item.pricePKR)}
                </span>
              </div>
              <div className="text-sm font-medium text-slate-700">
                {item.machineName}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 font-mono pt-2 border-t border-slate-100">
                <span className="bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                  {item.lastCheckedDate}
                </span>
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => startEdit(item)}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteDataBankItem(item.id)}
                    className="p-2 bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-full text-xs"
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
        <div className="hidden md:block bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Industrial Pricing Memory</h2>
              <p className="text-xs text-slate-500 mt-0.5">{filteredItems.length} verified supplier price records</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5">#</th>
                  <th className="py-3.5 px-5">Company (Supplier)</th>
                  <th className="py-3.5 px-5">Machine / Instrument Name (SKU)</th>
                  <th className="py-3.5 px-5 text-right">Price (PKR)</th>
                  <th className="py-3.5 px-5 text-center">Last Checked Date</th>
                  <th className="py-3.5 px-5">Category</th>
                  <th className="py-3.5 px-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-5 font-mono text-slate-400 text-xs">{idx + 1}</td>
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                        <Building className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span>{item.company}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-slate-800 text-sm">{item.machineName}</div>
                      {item.notes && (
                        <div className="text-xs text-slate-400 mt-0.5">{item.notes}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono font-bold text-sm text-[#FF4D6D]">
                      Rs. {new Intl.NumberFormat('en-PK').format(item.pricePKR)}
                    </td>
                    <td className="py-3.5 px-5 text-center font-mono text-slate-600">
                      <span className="inline-flex items-center space-x-1.5 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 text-xs">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{item.lastCheckedDate}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-mono font-medium border border-slate-200">
                        {item.category || 'Industrial'}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => startEdit(item)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
                          title="Edit Item"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteDataBankItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors"
                          title="Delete Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col text-xs text-slate-900">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                <Database className="w-4 h-4 text-[#FF4D6D]" />
                <span>{editingId ? 'Edit Benchmark Item' : 'Add New Data Bank Benchmark'}</span>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold px-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Company (Supplier / Wholesaler):
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Brandt Industrial Lahore, Al-Madina Brandreth Rd"
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#FF4D6D] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Machine / Instrument Name (with exact SKU):
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Siemens SIRIUS Contactor Relay 24V DC (3RH2122-1BB40)"
                  value={formMachine}
                  onChange={(e) => setFormMachine(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#FF4D6D] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Price in PKR:
                  </label>
                  <input
                    type="number"
                    required
                    step="any"
                    placeholder="e.g. 14500"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-[#FF4D6D] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Last Checked Date:
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#FF4D6D] focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Category:
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#FF4D6D] focus:bg-white"
                >
                  <option value="Switchgear & Relays">Switchgear &amp; Relays</option>
                  <option value="Automation & PLC">Automation &amp; PLC</option>
                  <option value="Variable Speed Drives">Variable Speed Drives</option>
                  <option value="Sensors & Instrumentation">Sensors &amp; Instrumentation</option>
                  <option value="Valves & Mechanical">Valves &amp; Mechanical</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-full bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
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
