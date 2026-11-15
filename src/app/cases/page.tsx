'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FolderKanban,
  Plus,
  ExternalLink,
  Trash2,
  Calendar,
  Building,
  CheckCircle2,
  Clock,
  FileEdit,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function ActiveCasesPage() {
  const router = useRouter();
  const { activeCases, loadCase, deleteCase } = useApp();

  const handleOpenCase = (caseId: string) => {
    loadCase(caseId);
    router.push('/agent/quotation');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'Sourcing':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden text-slate-100">
      {/* Header */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <FolderKanban className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center space-x-2">
              <span>Active Quotation Cases</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                {activeCases.length} Ongoing RFQs
              </span>
            </h1>
            <p className="text-[10px] text-slate-400">
              Track ongoing procurement quotations across Draft, Sourcing, and Completed states
            </p>
          </div>
        </div>

        <Link
          href="/agent/quotation"
          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-md shadow-amber-950/40 cursor-pointer transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New AI Quote</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-3 sm:p-6 space-y-4 overflow-y-auto">
        {/* Mobile View: High-Density Touch Cards (<md) */}
        <div className="md:hidden space-y-2.5">
          {activeCases.map((qc) => (
            <div
              key={qc.id}
              onClick={() => handleOpenCase(qc.id)}
              className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 active:bg-slate-800/80 transition-colors shadow-sm space-y-2.5 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-amber-400">{qc.caseRef}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${getStatusBadge(qc.status)}`}>
                  {qc.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="font-bold text-white flex items-center space-x-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  <span>{qc.clientName}</span>
                </div>
                <div className="font-mono font-bold text-slate-100">
                  Rs. {new Intl.NumberFormat('en-PK').format(qc.totalPKR)}
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1.5 border-t border-slate-800/80">
                <span>{qc.itemCount} items • {qc.createdAt}</span>
                <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleOpenCase(qc.id)}
                    className="text-amber-400 font-sans font-bold text-[10px] flex items-center space-x-0.5"
                  >
                    <span>Open</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => deleteCase(qc.id)}
                    className="p-1 text-slate-500 hover:text-rose-400"
                    title="Delete Case"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View: Full Spreadsheet Table (>=md) */}
        <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs text-left">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Quote Ref</th>
                  <th className="py-3 px-4">Client Name</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Items</th>
                  <th className="py-3 px-4 text-right">Total Amount (PKR)</th>
                  <th className="py-3 px-4 text-center">Date Created</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {activeCases.map((qc) => (
                  <tr
                    key={qc.id}
                    onClick={() => handleOpenCase(qc.id)}
                    className="hover:bg-slate-850/60 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-amber-400">
                      {qc.caseRef}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-white flex items-center space-x-1.5">
                        <Building className="w-3 h-3 text-slate-400" />
                        <span>{qc.clientName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono border ${getStatusBadge(
                          qc.status
                        )}`}
                      >
                        {qc.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-300">
                      {qc.itemCount} items
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-100">
                      Rs. {new Intl.NumberFormat('en-PK').format(qc.totalPKR)}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-400 text-[11px]">
                      {qc.createdAt}
                    </td>
                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleOpenCase(qc.id)}
                          className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[10px] font-bold flex items-center space-x-1"
                        >
                          <span>Open in Qri</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => deleteCase(qc.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded"
                          title="Delete Case"
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
    </div>
  );
}
