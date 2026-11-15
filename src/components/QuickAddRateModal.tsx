'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, Upload, Sparkles, Building, Calendar, DollarSign, FileText } from 'lucide-react';
import { MasterItem, MasterSupplier } from '@/lib/db';
import { IncotermCode } from '@/lib/commercial-math';

interface QuickAddRateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRateAdded?: () => void;
  masterItems: MasterItem[];
  masterSuppliers: MasterSupplier[];
}

export function QuickAddRateModal({
  isOpen,
  onClose,
  onRateAdded,
  masterItems,
  masterSuppliers,
}: QuickAddRateModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [currency, setCurrency] = useState<'PKR' | 'USD'>('PKR');
  const [incoterm, setIncoterm] = useState<IncotermCode>('DDP');
  const [sourceOrigin, setSourceOrigin] = useState<'LOCAL_MARKET_QUICKADD' | 'WHATSAPP_BOT' | 'EMAIL_RFQ_QUOTE' | 'GEMINI_DEEP_RESEARCH'>('LOCAL_MARKET_QUICKADD');
  const [validityDate, setValidityDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Auto-select first item/supplier if available
  useEffect(() => {
    if (masterItems.length > 0 && !selectedItemId) {
      setSelectedItemId(masterItems[0].id);
    }
    if (masterSuppliers.length > 0 && !selectedSupplierId) {
      setSelectedSupplierId(masterSuppliers[0].id);
    }
  }, [masterItems, masterSuppliers, selectedItemId, selectedSupplierId]);

  if (!isOpen) return null;

  // Filter items matching search term or aliases
  const filteredItems = masterItems.filter((item) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      item.official_sku.toLowerCase().includes(s) ||
      item.brand.toLowerCase().includes(s) ||
      item.plain_english_description.toLowerCase().includes(s) ||
      item.local_market_aliases?.some((a) => a.toLowerCase().includes(s))
    );
  }).slice(0, 3); // Top 3 plain English matches

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || !unitCost) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: selectedItemId,
          supplier_id: selectedSupplierId || undefined,
          unit_cost: parseFloat(unitCost),
          currency,
          incoterm_code: incoterm,
          source_origin: sourceOrigin,
          source_validity_date: new Date(validityDate).toISOString(),
          evidence_url: evidenceUrl || undefined,
          notes: notes || undefined,
        }),
      });

      if (res.ok) {
        setSuccessMessage('Rate logged to Gold Mine successfully!');
        if (onRateAdded) onRateAdded();
        setTimeout(() => {
          setSuccessMessage('');
          onClose();
        }, 1000);
      }
    } catch (err) {
      console.error('Failed to log rate:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedItem = masterItems.find((i) => i.id === selectedItemId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-lg shadow-2xl overflow-hidden flex flex-col text-xs text-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-bold text-sm text-white">Log Local Market Rate to Gold Mine</span>
            <span className="bg-slate-800 text-[10px] text-slate-400 px-1.5 py-0.5 rounded font-mono">
              10-Sec Quick-Add
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="p-4 space-y-4">
          {successMessage && (
            <div className="bg-emerald-500/20 border border-emerald-500 text-emerald-300 p-2.5 rounded flex items-center space-x-2 font-medium">
              <Check className="w-4 h-4" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Item Search & Top 3 Plain English Matcher */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Search Master Item / Slang Alias:
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. 24V Chota Relay, LC1D25, Schneider 9A, S7-1200..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>

            {/* Top 3 Matches */}
            <div className="mt-2 space-y-1.5">
              <div className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Top Matching Master Parts (Select One):</span>
              </div>
              <div className="grid grid-cols-1 gap-1">
                {filteredItems.map((item) => {
                  const isSelected = item.id === selectedItemId;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      className={`p-2 rounded border cursor-pointer transition-all flex items-start justify-between ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-500/50 text-white'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-950'
                      }`}
                    >
                      <div>
                        <div className="font-bold flex items-center space-x-1.5">
                          <span className="text-amber-400 font-mono">{item.official_sku}</span>
                          <span className="text-[10px] bg-slate-800 px-1.5 rounded text-slate-300">
                            {item.brand}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300 mt-0.5 line-clamp-1">
                          {item.plain_english_description}
                        </div>
                        {item.local_market_aliases && item.local_market_aliases.length > 0 && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Aliases: {item.local_market_aliases.join(', ')}
                          </div>
                        )}
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-amber-400 flex-shrink-0 mt-1" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Supplier & Price Grid */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* Supplier Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center space-x-1">
                <Building className="w-3 h-3 text-slate-400" />
                <span>Supplier / Wholesaler:</span>
              </label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
              >
                {masterSuppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.company_name} ({s.verification_status})
                  </option>
                ))}
              </select>
            </div>

            {/* Price & Currency */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center space-x-1">
                <DollarSign className="w-3 h-3 text-slate-400" />
                <span>Unit Cost &amp; Currency:</span>
              </label>
              <div className="flex space-x-1.5">
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 14500"
                  required
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as any)}
                  className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-amber-400 font-bold focus:outline-none"
                >
                  <option value="PKR">PKR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>
          </div>

          {/* Incoterm & Source Origin */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Incoterm / Carriage Terms:
              </label>
              <select
                value={incoterm}
                onChange={(e) => setIncoterm(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
              >
                <option value="DDP">🚚 DDP - Delivered to Door</option>
                <option value="EXW">🏭 EXW - Pick Up at Counter / Factory</option>
                <option value="FOB">🚢 FOB - Port Delivery</option>
                <option value="CIF">🚢 CIF - Sea Freight Included</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Source Channel:
              </label>
              <select
                value={sourceOrigin}
                onChange={(e) => setSourceOrigin(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
              >
                <option value="LOCAL_MARKET_QUICKADD">🏢 Local Market Shop Visit</option>
                <option value="WHATSAPP_BOT">💬 WhatsApp Chat Quote</option>
                <option value="EMAIL_RFQ_QUOTE">📧 Email RFQ Quote</option>
                <option value="GEMINI_DEEP_RESEARCH">🔍 Gemini Deep Research</option>
              </select>
            </div>
          </div>

          {/* Date & Evidence URL */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center space-x-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>Supplier Validity Date:</span>
              </label>
              <input
                type="date"
                value={validityDate}
                onChange={(e) => setValidityDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center space-x-1">
                <Upload className="w-3 h-3 text-slate-400" />
                <span>Screenshot Evidence URL (Optional):</span>
              </label>
              <input
                type="text"
                placeholder="https://... or paste image link"
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center space-x-1">
              <FileText className="w-3 h-3 text-slate-400" />
              <span>Notes / Stock Availability:</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Cash counter price, ready stock in Lahore, sealed factory packing"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Action Footer */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <div className="text-[10px] text-slate-400">
              * Rates update the Gold Mine and feed live quotation suggestions.
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !selectedItemId || !unitCost}
                className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-900/30 flex items-center space-x-1.5 cursor-pointer"
              >
                {isSubmitting ? 'Saving...' : 'Commit to Gold Mine'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
