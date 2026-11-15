'use client';

import React, { useState } from 'react';
import { X, Send, Download, CheckCircle, Split, FileText, AlertCircle } from 'lucide-react';
import { MasterSupplier, QuoteCase, QuoteLineItem } from '@/lib/db';

interface RfqDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  quoteCase: QuoteCase;
  lineItems: QuoteLineItem[];
  masterSuppliers: MasterSupplier[];
  splitByCategory: boolean;
}

export function RfqDispatchModal({
  isOpen,
  onClose,
  quoteCase,
  lineItems,
  masterSuppliers,
  splitByCategory,
}: RfqDispatchModalProps) {
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(masterSuppliers[0]?.id || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState<any>(null);

  if (!isOpen) return null;

  // Extract unique categories from line items
  const categories = Array.from(
    new Set(
      lineItems
        .map((l) => l.item?.category)
        .filter(Boolean) as string[]
    )
  );

  const selectedSupplier = masterSuppliers.find((s) => s.id === selectedSupplierId) || masterSuppliers[0];

  // Stamped PDF download
  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      const res = await fetch('/api/pdf/stamp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'OUTBOUND_SUPPLIER_RFQ',
          quoteCase,
          lineItems,
          supplierName: selectedSupplier?.company_name,
          rfqCategory: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        }),
      });

      if (!res.ok) throw new Error('PDF stamping failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RFQ-${quoteCase.case_ref_number}-${selectedCategory !== 'ALL' ? selectedCategory : 'Full'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      alert('Failed to stamp RFQ PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  // Dispatch Email + Sync Thunderbird
  const handleDispatch = async () => {
    setIsDispatching(true);
    setDispatchStatus(null);
    try {
      const res = await fetch('/api/mail/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedSupplier?.email || 'quotes@supplier.com',
          supplierName: selectedSupplier?.company_name,
          caseRefNumber: quoteCase.case_ref_number,
          category: selectedCategory !== 'ALL' ? selectedCategory : 'General Industrial',
          bodyText: `Dear ${selectedSupplier?.company_name},\n\nPlease find attached our formal RFQ sheet Ref #${quoteCase.case_ref_number}.\nPlease quote your best ex-stock / lead-time prices.\n\nRegards,\nOOS Procurement Team`,
        }),
      });

      const data = await res.json();
      setDispatchStatus(data);
    } catch (err: any) {
      setDispatchStatus({ success: false, error: err.message });
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-lg shadow-2xl overflow-hidden flex flex-col text-xs text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-sm text-white">Stamp &amp; Dispatch Outbound Supplier RFQ</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Notice about margins and client privacy */}
          <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
            <div>
              <strong>Confidentiality Protection Active:</strong> Outbound supplier RFQs omit all target client margins, client names, and sales prices. Suppliers only see technical specs, quantities, and blank price/lead-time boxes.
            </div>
          </div>

          {/* Supplier Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Target Wholesaler / Supplier:
            </label>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
            >
              {masterSuppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.company_name} — {s.phone} ({s.email || 'No email'})
                </option>
              ))}
            </select>
          </div>

          {/* Category Split Option */}
          {categories.length > 1 && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center space-x-1.5">
                <Split className="w-3.5 h-3.5 text-amber-400" />
                <span>Split by Category Scope:</span>
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
              >
                <option value="ALL">All Categories ({lineItems.length} Items)</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    Only Category: {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Dispatch Status Report */}
          {dispatchStatus && (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded font-mono text-[11px] space-y-1">
              <div className="flex items-center space-x-1.5 text-emerald-400 font-bold">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>RFQ Dispatch Completed</span>
              </div>
              <div className="text-slate-400">Recipient: {dispatchStatus.recipient}</div>
              <div className="text-slate-400">Thunderbird IMAP Sent Sync: {dispatchStatus.appendedToImapSent ? 'Synced' : 'Simulated (Dev Mode)'}</div>
              <div className="text-slate-300 text-[10px] mt-1">{dispatchStatus.notice}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isDownloading ? 'Stamping...' : 'Download Stamped PDF'}</span>
          </button>

          <button
            onClick={handleDispatch}
            disabled={isDispatching}
            className="flex items-center space-x-1.5 px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-900/30 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isDispatching ? 'Dispatching...' : 'Dispatch Email & Sync Thunderbird'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
