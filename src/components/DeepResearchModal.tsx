'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Sparkles, Globe, MapPin } from 'lucide-react';
import { aiEngine } from '@/lib/ai-engine';

interface DeepResearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: Array<{ description: string; sku?: string; brand?: string; qty?: number }>;
  defaultCountry?: string;
}

export function DeepResearchModal({
  isOpen,
  onClose,
  items,
  defaultCountry = 'Pakistan',
}: DeepResearchModalProps) {
  const [scope, setScope] = useState<'LOCAL' | 'GLOBAL'>('LOCAL');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const promptText = aiEngine.buildDeepResearchPrompt(items, scope, defaultCountry);

  const handleCopy = () => {
    navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden flex flex-col text-xs text-slate-200 max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-sm text-white">Cold-Start Gemini Deep Research Prompt</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scope Toggle & Stats */}
        <div className="px-4 py-2.5 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-semibold text-slate-400">Research Scope:</span>
            <div className="inline-flex rounded-md p-0.5 bg-slate-950 border border-slate-700">
              <button
                onClick={() => setScope('LOCAL')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-semibold transition-all ${
                  scope === 'LOCAL'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <MapPin className="w-3 h-3" />
                <span>Local: {defaultCountry}</span>
              </button>
              <button
                onClick={() => setScope('GLOBAL')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-semibold transition-all ${
                  scope === 'GLOBAL'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Globe className="w-3 h-3" />
                <span>Global Sourcing</span>
              </button>
            </div>
          </div>

          <div className="text-[11px] font-mono text-slate-400">
            {items.length} BOM {items.length === 1 ? 'Item' : 'Items'} Target
          </div>
        </div>

        {/* Prompt Content */}
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="relative">
            <textarea
              readOnly
              rows={14}
              value={promptText}
              className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs font-mono text-slate-300 leading-relaxed focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <p className="text-[11px] text-slate-400">
            Paste this prompt into Gemini 1.5 Deep Research for verified market contacts, lead times &amp; pricing.
          </p>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded text-xs font-bold transition-all shadow-md cursor-pointer ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>1-Click Copy Prompt</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
