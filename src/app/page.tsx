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
  Building,
  Wrench,
  Calculator,
  Truck,
  ArrowRightLeft,
  Zap,
  CheckCircle2,
  Clock,
  Layers,
  Activity,
  ChevronLeft,
  ChevronRight,
  Send,
  FileText,
  ShieldCheck,
  TrendingUp,
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Sourcing':
        return 'bg-rose-50 text-[#FF4D6D] border-rose-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
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
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-y-auto space-y-4 select-none pr-1">
      {/* =========================================================================
          1. MAIN HERO FEATURES (Split Layout: 65% Hero Card, 35% Pipeline Card)
             - Notice: Redundant welcome banner has been completely eliminated!
             - All elements pulled up into standard 1080p viewport height.
      ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-shrink-0">
        {/* =========================================================================
            BIG HERO UI CARD: THE QUOTATION MAKER COMMAND CENTER
        ========================================================================= */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between relative overflow-hidden">
          {/* Subtle background ambient aura */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-rose-50/40 rounded-full blur-3xl pointer-events-none -mr-24 -mt-24"></div>

          <div>
            {/* Header: Identity & Status */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3 mb-3.5">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center text-white shadow-xs flex-shrink-0">
                  <Bot className="w-5 h-5 text-[#FF4D6D]" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-[#FF4D6D] border border-rose-200 font-bold font-mono">
                      CORE HERO FEATURE
                    </span>
                    <span className="text-xs text-slate-400 font-medium">Conversational Split-Screen Engine</span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
                    Qri AI Quotation Maker
                  </h2>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-right">
                <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                  Ref: {templateState.quoteRef}
                </span>
                <span className="text-[11px] text-emerald-600 font-semibold hidden sm:flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Rules Active</span>
                </span>
              </div>
            </div>

            {/* DUAL-PANE MICRO-PREVIEW (Visualizes Left Chat + Right Live Paper) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3.5">
              {/* Left Pane Micro-Preview: AI Chat Bubble */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col justify-between">
                <div className="flex items-center space-x-2 mb-1.5">
                  <div className="w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center text-white text-[9px] font-bold">
                    <Bot className="w-3 h-3 text-[#FF4D6D]" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-800">Qri Journey Log</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed italic bg-white p-2 rounded-lg border border-slate-200/60 shadow-2xs">
                  &quot;Added 5 relays with 15% margin for {templateState.clientName}. Live A4 proposal updated with zero policy violations.&quot;
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-2">
                  <span>Latency: ~650ms</span>
                  <span>Gemini 1.5 Flash</span>
                </div>
              </div>

              {/* Right Pane Micro-Preview: Live Paper Snapshot */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-slate-800 flex items-center space-x-1">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Live Quotation Sheet</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    A4 Printable
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200/60 shadow-2xs space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Customer:</span>
                    <span className="font-bold text-slate-900 truncate max-w-[140px]">{templateState.clientName}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Items &amp; Tax:</span>
                    <span className="font-mono text-slate-700">{templateState.lineItems.length} Products • {templateState.taxMode === 'GST_18' ? '+18% GST' : '0%'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-100">
                    <span className="font-bold text-slate-700">Grand Total:</span>
                    <span className="font-mono font-black text-sm text-[#FF4D6D]">
                      Rs. {formatPKR(templateState.grandTotal)}
                    </span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 font-mono mt-1 text-right">
                  Terms: {templateState.deliveryTerms}
                </div>
              </div>
            </div>

            {/* INTERACTIVE INLINE COMMAND INPUT (Command Center UX) */}
            <div className="relative mb-3">
              <input
                type="text"
                value={heroPrompt}
                onChange={(e) => setHeroPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleLaunchWithPrompt();
                }}
                placeholder="Instruct Qri AI: e.g. 'Add 5 relays for Engro with 15% margin'..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-12 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#FF4D6D] focus:bg-white font-sans transition-all"
              />
              <button
                onClick={() => handleLaunchWithPrompt()}
                className="absolute right-1.5 top-1.5 p-2 bg-[#FF4D6D] hover:bg-[#FA3B5E] text-white rounded-lg shadow-2xs cursor-pointer transition-all active:scale-95"
                title="Send instruction to Qri AI"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Prompt Shortcut Chips */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <span className="text-[11px] text-slate-400 font-bold mr-1">Quick Chips:</span>
              {[
                'Add 5 Siemens 24V Relays for Engro with 15% margin',
                'Give 90 days credit payment terms',
                'Apply 18% GST to this quote',
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

          {/* Primary Action Buttons */}
          <div className="flex items-center space-x-2 pt-2 border-t border-slate-100 mt-2">
            <Link
              href="/agent/quotation"
              className="flex-1 sm:flex-none px-5 py-2 rounded-full bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#FF4D6D]" />
              <span>Launch Split-Screen Workspace</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>

            <button
              onClick={() => {
                setTemplateState(DEFAULT_TEMPLATE);
                router.push('/agent/quotation');
              }}
              className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer border border-slate-200 flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-slate-500" />
              <span>Draft Fresh Quote</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            SIDE CARD: SALES NAVIGATOR PIPELINE
        ========================================================================= */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                  <FolderKanban className="w-4 h-4 text-slate-800" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Sales Navigator</h3>
                  <p className="text-[11px] text-slate-500">Pipeline &amp; Case Tracking</p>
                </div>
              </div>

              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {activeCases.length} Active
              </span>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-2.5 mb-3.5">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Sourcing RFQs</span>
                <span className="text-base font-black font-mono text-[#FF4D6D] mt-0.5 block">{sourcingCasesCount} Cases</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Data Bank SKUs</span>
                <span className="text-base font-black font-mono text-slate-900 mt-0.5 block">{dataBank.length} Items</span>
              </div>
            </div>

            {/* Recent Cases List with Color-Coded Micro Status Badges */}
            <div className="space-y-1.5 mb-3">
              <span className="text-xs font-bold text-slate-700 block">Active RFQs:</span>
              {activeCases.slice(0, 3).map((qc) => (
                <div
                  key={qc.id}
                  onClick={() => router.push('/cases')}
                  className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/70 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="truncate pr-2">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-bold text-xs text-slate-900 truncate">{qc.clientName}</span>
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full border ${getStatusBadge(qc.status)}`}>
                        {qc.status}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 block">{qc.caseRef} • {qc.itemCount} items</span>
                  </div>
                  <span className="font-mono font-bold text-xs text-slate-900 flex-shrink-0">
                    Rs. {formatPKR(qc.totalPKR)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Link
            href="/cases"
            className="w-full py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors border border-slate-200 mt-2"
          >
            <span>View All RFQs &amp; Cases</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* =========================================================================
          2. ENGINEERING TOOLS CAROUSEL (Comfortably Above the Fold)
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

        {/* Compact Horizontal Carousel (Fits easily within viewport) */}
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