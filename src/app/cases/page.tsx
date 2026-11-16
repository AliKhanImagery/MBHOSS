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
  const confirmDelete = (qc: { id: string; caseRef: string; clientName: string }) => {
    const ref = qc.caseRef?.trim();
    const msg = ref
      ? `Delete quotation ${ref} (${qc.clientName || 'no client'})?\n\nIts number ${ref} becomes free. The next time its owner starts a quotation they will be offered ${ref} back, and can use it, skip it, or choose never to see it again.\n\nThis cannot be undone.`
      : `Delete this quotation (${qc.clientName || 'no client'})?\n\nThis cannot be undone.`;
    if (window.confirm(msg)) deleteCase(qc.id);
  };

  const handleOpenCase = (caseId: string) => {
    loadCase(caseId);
    router.push('/agent/quotation');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
      case 'Sourcing':
        return 'bg-rose-50 text-[#FF4D6D] border-rose-200 font-bold';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200 font-bold';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden text-slate-900 select-none">
      {/* Main Content inside Clean White Card */}
      <main className="flex-1 space-y-4 overflow-y-auto">
        {/* Mobile View: High-Density Touch Cards (<md) */}
        <div className="md:hidden space-y-3">
          {activeCases.map((qc) => (
            <div
              key={qc.id}
              onClick={() => handleOpenCase(qc.id)}
              className="bg-white border border-slate-200/80 rounded-2xl p-4 active:bg-slate-50 transition-colors shadow-xs space-y-3 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-sm text-[#FF4D6D]">{qc.caseRef}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono border ${getStatusBadge(qc.status)}`}>
                  {qc.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="font-bold text-base text-slate-900 flex items-center space-x-2">
                  <Building className="w-4 h-4 text-slate-400" />
                  <span>{qc.clientName}</span>
                </div>
                <div className="font-mono font-bold text-base text-slate-900">
                  Rs. {new Intl.NumberFormat('en-PK').format(qc.totalPKR)}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 font-mono pt-2 border-t border-slate-100">
                <span>{qc.itemCount} items • {qc.createdAt}</span>
                <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleOpenCase(qc.id)}
                    className="text-[#FF4D6D] font-sans font-bold text-xs flex items-center space-x-1 hover:text-rose-700"
                  >
                    <span>Open Quote</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => confirmDelete(qc)}
                    className="p-1 text-slate-400 hover:text-rose-600"
                    title="Delete Case"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View: Full Spreadsheet Table inside Clean White Card (>=md) */}
        <div className="hidden md:block bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Quotation Pipeline Cases</h2>
              <p className="text-xs text-slate-500 mt-0.5">Tracking {activeCases.length} active client RFQs</p>
            </div>
            <Link
              href="/agent/quotation"
              className="px-4 py-2 rounded-full bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Quote</span>
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Quote Ref</th>
                  <th className="py-3.5 px-5">Client Name</th>
                  <th className="py-3.5 px-5 text-center">Status</th>
                  <th className="py-3.5 px-5 text-center">Items</th>
                  <th className="py-3.5 px-5 text-right">Total Amount (PKR)</th>
                  <th className="py-3.5 px-5 text-center">Date Created</th>
                  <th className="py-3.5 px-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeCases.map((qc) => (
                  <tr
                    key={qc.id}
                    onClick={() => handleOpenCase(qc.id)}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-5 font-mono font-bold text-sm text-[#FF4D6D]">
                      {qc.caseRef}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                        <Building className="w-4 h-4 text-slate-400" />
                        <span>{qc.clientName}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono border ${getStatusBadge(
                          qc.status
                        )}`}
                      >
                        {qc.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-center font-mono text-slate-600 text-xs">
                      {qc.itemCount} items
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono font-bold text-sm text-slate-900">
                      Rs. {new Intl.NumberFormat('en-PK').format(qc.totalPKR)}
                    </td>
                    <td className="py-3.5 px-5 text-center font-mono text-slate-500 text-xs">
                      {qc.createdAt}
                    </td>
                    <td className="py-3.5 px-5 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleOpenCase(qc.id)}
                          className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-[#FF4D6D] border border-rose-200 rounded-full text-xs font-bold flex items-center space-x-1"
                        >
                          <span>Open</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => confirmDelete(qc)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-full hover:bg-slate-100"
                          title="Delete Case"
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
    </div>
  );
}
