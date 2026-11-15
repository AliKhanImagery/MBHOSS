'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Bot,
  ArrowRight,
  Plus,
  FolderKanban,
  Wrench,
  Calculator,
  Truck,
  ArrowRightLeft,
  Zap,
  Layers,
  Activity,
  ChevronLeft,
  ChevronRight,
  Send,
  FileText,
  Clock,
  Briefcase,
} from 'lucide-react';
import { useApp, DEFAULT_TEMPLATE } from '@/context/AppContext';

export default function MainDashboardPage() {
  const router = useRouter();
  const {
    currentUser,
    templateState,
    setTemplateState,
    activeCases,
    dataBank,
  } = useApp();

  const [heroPrompt, setHeroPrompt] = useState('');
  const carouselRef = useRef<HTMLDivElement>(null);

  // If not logged in, redirect to login
  React.useEffect(() => {
    if (!currentUser) {
      router.replace('/login');
    }
  }, [currentUser, router]);

  if (!currentUser) return null;

  const formatPKR = (num: number) => {
    return new Intl.NumberFormat('en-PK').format(num || 0);
  };

  const sourcingCasesCount = activeCases.filter((c) => c.status === 'Sourcing').length;

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleLaunchWithPrompt = (promptText?: string) => {
    const text = promptText !== undefined ? promptText : heroPrompt;
    if (text.trim()) {
      router.push(`/agent/quotation?prompt=${encodeURIComponent(text.trim())}`);
    } else {
      router.push('/agent/quotation');
    }
  };

  const engineeringTools = [
    {
      id: 'tank',
      title: 'Tank Volume & Sizer',
      discipline: 'Beverage & Process',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: Layers,
      iconColor: 'text-blue-600 bg-blue-50 border-blue-200',
      formula: 'V = πr²h + ⅓πr²h(cone)',
      description: 'Liters & m³ for syrup preparation, fermenters, and storage silos.',
      quickSpec: 'Cylindrical + Conical',
    },
    {
      id: 'pipe',
      title: 'Piping Velocity Sizer',
      discipline: 'Hydraulics & Piping',
      badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      icon: Activity,
      iconColor: 'text-cyan-600 bg-cyan-50 border-cyan-200',
      formula: 'v = 4Q ÷ (πD²)',
      description: 'Sizes beverage lines with automated water hammer limit checks.',
      quickSpec: 'DN25 - DN100 Velocity',
    },
    {
      id: 'wht',
      title: 'Reverse WHT Gross-Up',
      discipline: 'Commercial Finance',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: Calculator,
      iconColor: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      formula: 'Price = Net ÷ (1 - WHT%)',
      description: 'Preserves 100% of profit against FBR withholding tax deductions.',
      quickSpec: 'Margin Shield Formula',
    },
    {
      id: 'incoterm',
      title: 'Incoterm Landed Cost',
      discipline: 'Import Logistics',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      icon: Truck,
      iconColor: 'text-amber-600 bg-amber-50 border-amber-200',
      formula: 'EXW(USD) → Landed DDP',
      description: 'Calculates air/sea freight, customs duties, RD, and port clearing.',
      quickSpec: 'EXW to DDP in PKR',
    },
    {
      id: 'crossref',
      title: 'Switchgear Cross-Ref',
      discipline: 'Industrial Automation',
      badgeColor: 'bg-rose-50 text-[#FF4D6D] border-rose-200',
      icon: ArrowRightLeft,
      iconColor: 'text-[#FF4D6D] bg-rose-50 border-rose-200',
      formula: 'Siemens ↔ Schneider ↔ ABB',
      description: 'Direct drop-in equivalents for contactor relays and PLCs.',
      quickSpec: '24V DC / 220V AC',
    },
    {
      id: 'motor',
      title: 'Motor FLA & Cable Sizer',
      discipline: 'Electrical Systems',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      icon: Zap,
      iconColor: 'text-purple-600 bg-purple-50 border-purple-200',
      formula: 'I = P ÷ (√3 × V × cosφ × η)',
      description: 'Full load amperes, contactor rating, and copper cable mm².',
      quickSpec: '3-Phase 415V Induction',
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-y-auto space-y-6 select-none pr-1">
      {/* =========================================================================
          2 MAIN ACTION CARDS
          Card 1: Quotation Maker Agent
          Card 2: Open New Sourcing Case
      ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 flex-shrink-0">
        {/* =========================================================================
            CARD 1: QUOTATION MAKER AGENT
        ========================================================================= */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-[#FF4D6D]/40 transition-all">
          <div className="absolute top-0 right-0 w-60 h-60 bg-rose-50/50 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

          <div>
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-xs flex-shrink-0">
                  <Bot className="w-6 h-6 text-[#FF4D6D]" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-rose-50 text-[#FF4D6D] border border-rose-200 font-bold font-mono">
                      CORE AI ENGINE
                    </span>
                    <span className="text-xs text-slate-400 font-medium">Interactive Canvas &amp; Co-Pilot</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mt-1">
                    Quotation Maker Agent
                  </h2>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                  Ref: {templateState.quoteRef}
                </span>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              Draft comprehensive industrial proposals with automated commercial tax gross-ups, master compliance governance, and instant live A4 canvas formatting.
            </p>

            {/* Inline Quick Prompt Input */}
            <div className="relative mb-3">
              <input
                type="text"
                value={heroPrompt}
                onChange={(e) => setHeroPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleLaunchWithPrompt();
                }}
                placeholder="Instruct Qri AI: e.g. 'Add 5 relays for Engro with 15% margin'..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-12 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#FF4D6D] focus:bg-white font-sans transition-all"
              />
              <button
                onClick={() => handleLaunchWithPrompt()}
                className="absolute right-2 top-2 p-2 bg-[#FF4D6D] hover:bg-[#FA3B5E] text-white rounded-lg shadow-2xs cursor-pointer transition-all active:scale-95"
                title="Send instruction to Qri AI"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Prompt Shortcut Chips */}
            <div className="flex flex-wrap items-center gap-1.5 mb-4">
              {[
                'Add 5 Siemens 24V Relays for Engro with 15% margin',
                'Apply 18% GST to quote',
                'Give 90 days credit payment terms',
              ].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleLaunchWithPrompt(chip)}
                  className="px-2.5 py-1 rounded-full text-[11px] bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200 transition-colors cursor-pointer font-medium"
                >
                  + {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Card 1 CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-3 border-t border-slate-100">
            <Link
              href="/agent/quotation"
              className="flex-1 py-3 px-5 rounded-full bg-slate-900 hover:bg-black text-white text-xs sm:text-sm font-bold shadow-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#FF4D6D]" />
              <span>Open Quotation Agent</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>

            <button
              onClick={() => {
                setTemplateState(DEFAULT_TEMPLATE);
                router.push('/agent/quotation');
              }}
              className="py-3 px-4 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-semibold transition-colors cursor-pointer border border-slate-200 flex items-center justify-center space-x-1.5"
            >
              <Plus className="w-4 h-4 text-slate-500" />
              <span>Draft Fresh Quote</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            CARD 2: OPEN NEW SOURCING CASE
        ========================================================================= */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="absolute top-0 right-0 w-60 h-60 bg-blue-50/40 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

          <div>
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs flex-shrink-0">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold font-mono">
                      PROCUREMENT CASES
                    </span>
                    <span className="text-xs text-slate-400 font-medium">RFQ &amp; Supplier Management</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mt-1">
                    Sourcing Cases &amp; RFQs
                  </h2>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                  {activeCases.length} Total Cases
                </span>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              Manage incoming customer requests for quotation (RFQs), evaluate supplier vendor pricing, track delivery schedules, and audit commercial approvals.
            </p>

            {/* Quick Metrics Pods */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Pending RFQs</span>
                <span className="text-lg font-black font-mono text-[#FF4D6D] mt-0.5 block">{sourcingCasesCount} Cases</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Data Bank SKUs</span>
                <span className="text-lg font-black font-mono text-slate-900 mt-0.5 block">{dataBank.length} Items</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Completed</span>
                <span className="text-lg font-black font-mono text-emerald-700 mt-0.5 block">
                  {activeCases.filter((c) => c.status === 'Completed').length} Done
                </span>
              </div>
            </div>

            {/* Recent Cases Preview Strip */}
            <div className="space-y-1.5 mb-2">
              {activeCases.slice(0, 2).map((qc) => (
                <div
                  key={qc.id}
                  onClick={() => router.push('/cases')}
                  className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/70 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="truncate pr-2">
                    <span className="font-bold text-xs text-slate-900">{qc.clientName}</span>
                    <span className="text-[10px] font-mono text-slate-400 block">{qc.caseRef} • {qc.itemCount} items</span>
                  </div>
                  <span className="font-mono font-bold text-xs text-slate-900 flex-shrink-0">
                    Rs. {formatPKR(qc.totalPKR)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2 CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-3 border-t border-slate-100">
            <Link
              href="/cases/new"
              className="flex-1 py-3 px-5 rounded-full bg-slate-900 hover:bg-black text-white text-xs sm:text-sm font-bold shadow-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <FolderKanban className="w-4 h-4 text-blue-400" />
              <span>Open New Sourcing Case</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>

            <Link
              href="/cases"
              className="py-3 px-4 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-semibold transition-colors cursor-pointer border border-slate-200 flex items-center justify-center space-x-1.5"
            >
              <span>View All Cases</span>
            </Link>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ENGINEERING TOOLS CAROUSEL
      ========================================================================= */}
      <div className="space-y-2.5 pt-1">
        {/* Header & Controls */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <Wrench className="w-4 h-4 text-[#FF4D6D]" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Engineering Tools &amp; Tactical Utilities
              </h2>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Micro-calculators for beverage process systems, automation switchgear, mechanical piping, and commercial tax math.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href="/tools"
              className="text-xs font-bold text-[#FF4D6D] hover:underline mr-1"
            >
              All Tools (6) →
            </Link>
            <button
              onClick={() => scrollCarousel('left')}
              className="w-7 h-7 rounded-full bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs cursor-pointer transition-colors"
              title="Previous tools"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => scrollCarousel('right')}
              className="w-7 h-7 rounded-full bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs cursor-pointer transition-colors"
              title="Next tools"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Compact Horizontal Carousel */}
        <div
          ref={carouselRef}
          className="flex space-x-3 overflow-x-auto pb-2 pt-0.5 scroll-smooth no-scrollbar"
        >
          {engineeringTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <div
                key={tool.id}
                onClick={() => router.push(`/tools?tool=${tool.id}`)}
                className="w-64 sm:w-72 flex-shrink-0 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs hover:shadow-md hover:border-[#FF4D6D]/60 transition-all cursor-pointer flex flex-col justify-between group active:scale-[0.99]"
              >
                <div>
                  <div className="flex items-start justify-between mb-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shadow-2xs ${tool.iconColor}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${tool.badgeColor}`}>
                      {tool.discipline}
                    </span>
                  </div>

                  <h3 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-[#FF4D6D] transition-colors leading-snug">
                    {tool.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                    {tool.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400 font-medium">
                    {tool.quickSpec}
                  </span>
                  <span className="text-[11px] font-bold text-slate-900 group-hover:text-[#FF4D6D] flex items-center space-x-1">
                    <span>Open</span>
                    <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
