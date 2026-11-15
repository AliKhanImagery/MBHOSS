'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Briefcase, Sparkles } from 'lucide-react';

export default function NewSourcingCasePage() {
  return (
    <div className="flex-1 flex flex-col h-full bg-[#F4F5F7] items-center justify-center p-6 text-slate-900 select-none">
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl p-8 sm:p-10 shadow-xs flex flex-col items-center text-center space-y-5 animate-in fade-in duration-200">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
          <Briefcase className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-mono font-bold uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-[#FF4D6D]" />
            <span>Module in Development</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Open New Sourcing Case
          </h1>
          <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest">
            Coming Soon
          </p>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
          Autonomous multi-vendor RFQ bidding, tender specification parsing, and supplier quote evaluation portal is currently under active construction.
        </p>

        <div className="pt-2 w-full flex flex-col sm:flex-row gap-2">
          <Link
            href="/"
            className="flex-1 py-2.5 px-4 rounded-full bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </Link>
          <Link
            href="/cases"
            className="py-2.5 px-4 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors border border-slate-200 flex items-center justify-center cursor-pointer"
          >
            <span>View Active Cases</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
