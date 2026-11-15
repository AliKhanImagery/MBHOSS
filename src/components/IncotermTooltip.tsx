'use client';

import React, { useState } from 'react';
import { INCOTERM_DICTIONARY, IncotermCode } from '@/lib/commercial-math';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

interface IncotermTooltipProps {
  code: IncotermCode;
  showShort?: boolean;
}

export function IncotermTooltip({ code, showShort = false }: IncotermTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const info = INCOTERM_DICTIONARY[code] || INCOTERM_DICTIONARY.UNSPECIFIED;

  let colorClasses = 'bg-slate-800 text-slate-300 border-slate-700';
  if (info.code === 'DDP') {
    colorClasses = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20';
  } else if (info.code === 'EXW') {
    colorClasses = 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/20';
  } else if (info.code === 'FOB') {
    colorClasses = 'bg-blue-500/15 text-blue-300 border-blue-500/30 hover:bg-blue-500/20';
  } else if (info.code === 'CIF') {
    colorClasses = 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/20';
  }

  return (
    <div
      className="relative inline-block cursor-help select-none"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${colorClasses}`}
      >
        {showShort ? info.badgeShort : info.badge}
      </span>

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2.5 bg-slate-900 border border-slate-700 rounded-md shadow-xl text-xs z-50 pointer-events-none text-slate-200">
          <div className="flex items-start space-x-1.5 font-bold mb-1 text-slate-100">
            {info.riskLevel === 'LOW' && <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />}
            {info.riskLevel === 'MEDIUM' && <Info className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />}
            {info.riskLevel === 'HIGH' && <AlertCircle className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />}
            <span>{info.badgeShort} Commercial Terms</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-snug">{info.tooltip}</p>
          <div className="mt-1.5 pt-1 border-t border-slate-800 text-[10px] text-slate-400 font-mono">
            Risk: <span className={info.riskLevel === 'LOW' ? 'text-emerald-400' : 'text-amber-400'}>{info.riskLevel}</span>
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-700"></div>
        </div>
      )}
    </div>
  );
}
