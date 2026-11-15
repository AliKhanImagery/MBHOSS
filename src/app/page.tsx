'use client';

import React, { useRef } from 'react';
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
  Sliders,
  DollarSign,
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

  const totalPipelinePKR = activeCases.reduce((sum, c) => sum + (c.totalPKR || 0), 0);
  const sourcingCasesCount = activeCases.filter((c) => c.status === 'Sourcing').length;

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -340 : 340;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const engineeringTools = [
    {
      id: 'tank',
      title: 'Tank Volume & Capacity Sizer',
      discipline: 'Beverage & Process',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: Layers,
      iconColor: 'text-blue-600 bg-blue-50 border-blue-200',
      formula: 'V = πr²h + ⅓πr²h(cone)',
      description: 'Calculates volume in liters & m³ for syrup preparation, fermenters, and storage silos.',
      quickSpec: 'Cylindrical + Conical Bottom',
    },
    {
      id: 'pipe',
      title: 'Piping Flow & Velocity Sizer',
      discipline: 'Hydraulics & Mechanical',
      badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      icon: Activity,
      iconColor: 'text-cyan-600 bg-cyan-50 border-cyan-200',
      formula: 'v = 4Q ÷ (πD²)',
      description: 'Sizes beverage process & CIP chemical lines with automated velocity limit checks (m/s).',
      quickSpec: 'DN25 - DN150 Velocity Analysis',
    },
    {
      id: 'wht',
      title: 'Reverse WHT & GST Gross-Up',
      discipline: 'Commercial Tax Math',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: Calculator,
      iconColor: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      formula: 'Price = TargetNet ÷ (1 - WHT%)',
      description: 'Eliminates margin erosion from corporate tax deductions in Pakistan; preserves 100% of profit.',
      quickSpec: 'FBR Tax Math & Margin Shield',
    },
    {
      id: 'incoterm',
      title: 'Incoterm Landed Cost Estimator',
      discipline: 'Import & Logistics',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      icon: Truck,
      iconColor: 'text-amber-600 bg-amber-50 border-amber-200',
      formula: 'EXW(USD) → Landed DDP(PKR)',
      description: 'Computes total landed cost factoring air/sea freight, customs duties, RD, and port clearing.',
      quickSpec: 'EXW vs DDP Landed Comparison',
    },
    {
      id: 'crossref',
      title: 'Switchgear Drop-in Cross-Ref',
      discipline: 'Industrial Automation',
      badgeColor: 'bg-rose-50 text-[#FF4D6D] border-rose-200',
      icon: ArrowRightLeft,
      iconColor: 'text-[#FF4D6D] bg-rose-50 border-rose-200',
      formula: 'Siemens ↔ Schneider ↔ ABB',
      description: 'Direct equivalent selector for contactor relays, auxiliary blocks, and PLCs when stock is tight.',
      quickSpec: '24V DC / 220V AC Equivalents',
    },
    {
      id: 'motor',
      title: 'Motor FLA & Cable Sizer',
      discipline: 'Electrical Systems',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      icon: Zap,
      iconColor: 'text-purple-600 bg-purple-50 border-purple-200',
      formula: 'I = P ÷ (√3 × V × cosφ × η)',
      description: 'Computes full load amperes, contactor ampere sizing, and minimum copper cable cross-section.',
      quickSpec: '3-Phase 415V Induction Motors',
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-y-auto space-y-6 select-none pr-1">
      {/* =========================================================================
          1. TOP WELCOME & OVERVIEW BAR
      ========================================================================= */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">
              Industrial Procurement &amp; Engineering OS
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Welcome back, {currentUser.name}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Role: <span className="font-semibold text-slate-800">{currentUser.role}</span> • Brandreth Road Operations
          </p>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200/80 px-3.5 py-1.5 rounded-full text-xs font-mono">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span className="text-slate-500 font-medium">Pipeline:</span>
            <span className="font-bold text-slate-900">Rs. {formatPKR(totalPipelinePKR)}</span>
          </div>
          <Link
            href="/agent/quotation"
            className="px-4 py-2 rounded-full bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#FF4D6D]" />
            <span>Open Quotation Agent</span>
          </Link>
        </div>
      </div>

      {/* =========================================================================
          2. FLAGSHIP HERO WORKFLOW ROW:
             - Quotation Maker (The Bigger UI Card - 65% width)
             - Sales Navigator Summary (35% width)
      ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* BIG HERO UI CARD: THE QUOTATION MAKER */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-xs flex flex-col justify-between relative overflow-hidden group">
          {/* Subtle decorative accent pill in background */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-rose-50/50 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

          <div>
            {/* Header info */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-5">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-slate-950 flex items-center justify-center text-white shadow-md flex-shrink-0">
                  <Bot className="w-6 h-6 text-[#FF4D6D]" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-50 text-[#FF4D6D] border border-rose-200 font-bold font-mono">
                      CORE HERO FEATURE
                    </span>
                    <span className="text-xs text-slate-400 font-medium">Split-Screen Architecture</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
                    Qri AI Quotation Maker
                  </h2>
                </div>
              </div>

              <div className="hidden sm:flex flex-col items-end text-right">
                <span className="text-xs font-mono font-bold text-slate-500">Ref: {templateState.quoteRef}</span>
                <span className="text-xs text-emerald-600 font-medium flex items-center space-x-1 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Master Rules Active</span>
                </span>
              </div>
            </div>

            {/* Active Quotation Snapshot */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 sm:p-5 mb-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Customer</span>
                <span className="text-sm font-bold text-slate-900 mt-0.5 truncate block" title={templateState.clientName}>
                  {templateState.clientName || 'Engro Polymer'}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Line Items</span>
                <span className="text-sm font-mono font-bold text-slate-900 mt-0.5 block">
                  {templateState.lineItems.length} Products
                </span>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tax Regime</span>
                <span className="text-sm font-medium text-slate-800 mt-0.5 block">
                  {templateState.taxMode === 'GST_18' ? '+18% GST' : '0% (Exempt)'}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Current Grand Total</span>
                <span className="text-base font-mono font-black text-[#FF4D6D] mt-0.5 block">
                  Rs. {formatPKR(templateState.grandTotal)}
                </span>
              </div>
            </div>

            {/* Prompt Shortcut Chips */}
            <div className="space-y-1.5 mb-6">
              <span className="text-xs text-slate-400 font-semibold block">Quick Prompt Shortcuts:</span>
              <div className="flex flex-wrap gap-2">
                {[
                  'Add 5 Siemens 24V Relays for Engro with 15% margin',
                  'Give 90 days credit payment terms',
                  'Apply 18% GST to this quote',
                ].map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => router.push('/agent/quotation')}
                    className="px-3 py-1.5 rounded-full text-xs bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors cursor-pointer shadow-2xs font-medium"
                  >
                    + {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-slate-100">
            <Link
              href="/agent/quotation"
              className="w-full sm:w-auto px-6 py-3 rounded-full bg-slate-900 hover:bg-black text-white text-xs sm:text-sm font-bold shadow-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#FF4D6D]" />
              <span>Launch Quotation Split-Screen</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              onClick={() => {
                setTemplateState(DEFAULT_TEMPLATE);
                router.push('/agent/quotation');
              }}
              className="w-full sm:w-auto px-5 py-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-semibold transition-colors cursor-pointer border border-slate-200 flex items-center justify-center space-x-1.5"
            >
              <Plus className="w-4 h-4 text-slate-600" />
              <span>Draft Fresh Quotation</span>
            </button>
          </div>
        </div>

        {/* SIDE CARD: SALES NAVIGATOR PIPELINE */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                  <FolderKanban className="w-5 h-5 text-slate-800" />
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
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Sourcing RFQs</span>
                <span className="text-lg font-black font-mono text-[#FF4D6D] mt-0.5 block">{sourcingCasesCount} Cases</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Data Bank SKUs</span>
                <span className="text-lg font-black font-mono text-slate-900 mt-0.5 block">{dataBank.length} Items</span>
              </div>
            </div>

            {/* Recent Cases List */}
            <div className="space-y-2 mb-4">
              <span className="text-xs font-bold text-slate-700 block">Recent Pipeline Cases:</span>
              {activeCases.slice(0, 3).map((qc) => (
                <div
                  key={qc.id}
                  onClick={() => router.push('/cases')}
                  className="p-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/70 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="truncate pr-2">
                    <span className="font-bold text-xs text-slate-900 block truncate">{qc.clientName}</span>
                    <span className="text-[10px] font-mono text-slate-500">{qc.caseRef} • {qc.itemCount} items</span>
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
            className="w-full py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors border border-slate-200"
          >
            <span>View All RFQs &amp; Cases</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* =========================================================================
          3. TOOLS CAROUSEL SECTION (Small Cards on Main Dashboard)
      ========================================================================= */}
      <div className="space-y-3.5 pt-2">
        {/* Header & Carousel Arrow Controls */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <Wrench className="w-4 h-4 text-[#FF4D6D]" />
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Engineering Tools &amp; Tactical Utilities
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Micro-calculators for beverage process systems, automation switchgear, mechanical piping, and commercial tax math.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href="/tools"
              className="hidden sm:inline-flex text-xs font-bold text-[#FF4D6D] hover:underline mr-2"
            >
              Open Full Tools Suite →
            </Link>
            <button
              onClick={() => scrollCarousel('left')}
              className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs cursor-pointer transition-colors"
              title="Previous tools"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollCarousel('right')}
              className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs cursor-pointer transition-colors"
              title="Next tools"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Carousel Container */}
        <div
          ref={carouselRef}
          className="flex space-x-4 overflow-x-auto pb-3 pt-1 scroll-smooth no-scrollbar"
        >
          {engineeringTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <div
                key={tool.id}
                onClick={() => router.push(`/tools?tool=${tool.id}`)}
                className="w-72 sm:w-80 flex-shrink-0 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-[#FF4D6D]/60 transition-all cursor-pointer flex flex-col justify-between group active:scale-[0.99]"
              >
                <div>
                  <div className="flex items-start justify-between mb-3.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-2xs ${tool.iconColor}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${tool.badgeColor}`}>
                      {tool.discipline}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 group-hover:text-[#FF4D6D] transition-colors leading-snug">
                    {tool.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-2">
                    {tool.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400 font-medium">
                    {tool.quickSpec}
                  </span>
                  <span className="text-xs font-bold text-slate-900 group-hover:text-[#FF4D6D] flex items-center space-x-1">
                    <span>Open Tool</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
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