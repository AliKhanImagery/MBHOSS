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
        return 'bg-[#22C55E]/20 text-[#34D399] border-[#22C55E]/40 font-bold';
      case 'Sourcing':
        return 'bg-[#FF4D6D]/20 text-[#FF4D6D] border-[#FF4D6D]/40 font-bold';
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30 font-bold';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden text-slate-100">
      {/* Main Content inside Onyx Pod */}
      <main className="flex-1 space-y-4 overflow-y-auto">
        {/* Mobile View: High-Density Touch Cards (<md) */}
        <div className="md:hidden space-y-3">
          {activeCases.map((qc) => (
            <div
              key={qc.id}
              onClick={() => handleOpenCase(qc.id)}
              className="bg-[#16171B] border border-white/5 rounded-2xl p-4 active:bg-slate-800/80 transition-colors shadow-lg space-y-3 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-sm text-[#FF4D6D]">{qc.caseRef}</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-mono border ${getStatusBadge(qc.status)}`}>
                  {qc.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="font-bold text-base text-white flex items-center space-x-2">
                  <Building className="w-4 h-4 text-slate-400" />
                  <span>{qc.clientName}</span>
                </div>
                <div className="font-mono font-bold text-base text-white">
                  Rs. {new Intl.NumberFormat('en-PK').format(qc.totalPKR)}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono pt-2 border-t border-[#262830]">
                <span>{qc.itemCount} items • {qc.createdAt}</span>
                <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleOpenCase(qc.id)}
                    className="text-[#FF4D6D] font-sans font-bold text-xs flex items-center space-x-1"
                  >
                    <span>Open Quote</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteCase(qc.id)}
                    className="p-1 text-slate-400 hover:text-rose-400"
                    title="Delete Case"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View: Full Spreadsheet Table inside Onyx Card (>=md) */}
        <div className="hidden md:block bg-[#16171B] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-5 border-b border-[#262830] flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Quotation Pipeline Cases</h2>
              <p className="text-xs text-slate-400 mt-0.5">Tracking {activeCases.length} active client RFQs</p>
            </div>
            <Link
              href="/agent/quotation"
              className="px-4 py-2 rounded-full bg-[#FF4D6D] hover:bg-[#FA3B5E] text-white text-xs font-bold shadow-md shadow-[#FF4D6D]/30 flex items-center space-x-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Quote</span>
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm text-left">
              <thead>
                <tr className="bg-[#121316] border-b border-[#262830] text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-5">Quote Ref</th>
                  <th className="py-4 px-5">Client Name</th>
                  <th className="py-4 px-5 text-center">Status</th>
                  <th className="py-4 px-5 text-center">Items</th>
                  <th className="py-4 px-5 text-right">Total Amount (PKR)</th>
                  <th className="py-4 px-5 text-center">Date Created</th>
                  <th className="py-4 px-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#23252E]">
                {activeCases.map((qc) => (
                  <tr
                    key={qc.id}
                    onClick={() => handleOpenCase(qc.id)}
                    className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-5 font-mono font-bold text-base text-[#FF4D6D]">
                      {qc.caseRef}
                    </td>
                    <td className="py-4 px-5">
                      <div className="font-bold text-base text-white flex items-center space-x-2">
                        <Building className="w-4 h-4 text-slate-400" />
                        <span>{qc.clientName}</span>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-center">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-mono border ${getStatusBadge(
                          qc.status
                        )}`}
                      >
                        {qc.status}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-center font-mono text-slate-300 font-medium">
                      {qc.itemCount} items
                    </td>
                    <td className="py-4 px-5 text-right font-mono font-bold text-base text-white">
                      Rs. {new Intl.NumberFormat('en-PK').format(qc.totalPKR)}
                    </td>
                    <td className="py-4 px-5 text-center font-mono text-slate-400 text-xs">
                      {qc.createdAt}
                    </td>
                    <td className="py-4 px-5 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleOpenCase(qc.id)}
                          className="px-3.5 py-1.5 bg-[#FF4D6D]/15 hover:bg-[#FF4D6D]/25 text-[#FF4D6D] border border-[#FF4D6D]/30 rounded-full text-xs font-bold flex items-center space-x-1"
                        >
                          <span>Open</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteCase(qc.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded-full hover:bg-white/5"
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
