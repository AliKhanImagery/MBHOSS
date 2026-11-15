'use client';

import React, { useState, useEffect } from 'react';
import {
  Send,
  Upload,
  CheckCircle2,
  Copy,
  ExternalLink,
  Sparkles,
  Layers,
  Building2,
  Package,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  Plus,
  Trash2,
  Check,
  RefreshCw,
  Mail,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { SourcingSupplier, SourcingRfqItem, SourcingDispatchPackage } from '@/types';

// Default initial candidate suppliers directory
const DEFAULT_SUPPLIERS: SourcingSupplier[] = [
  {
    id: 'sup-1',
    companyName: 'Brandt Industrial Lahore',
    contactPerson: 'Khawaja Rizwan (Sales Director)',
    email: 'rizwan@brandtindustrial.pk',
    phone: '+92 300 8451234',
    categories: ['Switchgear & Relays', 'Variable Speed Drives', 'Automation'],
    city: 'Lahore (Brandreth Rd)',
  },
  {
    id: 'sup-2',
    companyName: 'Al-Madina Switchgear & Controls',
    contactPerson: 'Sheikh Tariq (General Manager)',
    email: 'sales@almadinaswitchgear.com',
    phone: '+92 321 4455667',
    categories: ['Switchgear & Relays', 'Contactors', 'Circuit Breakers'],
    city: 'Lahore (Brandreth Rd)',
  },
  {
    id: 'sup-3',
    companyName: 'Pak-German Automation Karachi',
    contactPerson: 'Engr. Zeeshan Ali (Technical Head)',
    email: 'zeeshan@pakgermanautomation.com',
    phone: '+92 333 2145678',
    categories: ['Automation & PLC', 'Sensors', 'Industrial Instrumentation'],
    city: 'Karachi (Korangi Industrial)',
  },
  {
    id: 'sup-4',
    companyName: 'Apex Sanitary Piping & Valves',
    contactPerson: 'Malik Farooq (Procurement Liaison)',
    email: 'farooq@apexpiping.pk',
    phone: '+92 301 7894561',
    categories: ['Sanitary Stainless Steel', 'Valves & Fittings', 'Piping'],
    city: 'Lahore (Badami Bagh)',
  },
];

export default function SmartRfqDispatcherPage() {
  const { dataBank, templateState } = useApp();

  // RFQ Master Metadata
  const [rfqRef, setRfqRef] = useState(`RFQ-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [deadlineDays, setDeadlineDays] = useState(3);
  const [targetDestination, setTargetDestination] = useState('Lahore Central Warehouse');

  // Supplier Directory State
  const [suppliers, setSuppliers] = useState<SourcingSupplier[]>(DEFAULT_SUPPLIERS);
  const [pasteSupplierText, setPasteSupplierText] = useState('');
  const [showPasteSupplier, setShowPasteSupplier] = useState(false);

  // Master RFQ Items State
  const [rfqItems, setRfqItems] = useState<SourcingRfqItem[]>(() => {
    if (templateState.lineItems && templateState.lineItems.length > 0) {
      return templateState.lineItems.map((item, idx) => ({
        id: `rfq-item-${idx}`,
        description: item.description,
        brand: item.brand,
        partNumber: item.partNumber,
        qty: item.qty,
        uom: item.uom || 'PCS',
        specs: `${item.brand} original component`,
      }));
    }
    return [
      {
        id: 'rfq-item-1',
        description: 'Siemens SIRIUS Contactor Relay 24V DC, 2NO+2NC',
        brand: 'Siemens',
        partNumber: '3RH2122-1BB40',
        qty: 10,
        uom: 'PCS',
        specs: 'Screw terminal, 24V DC coil, original factory sealed',
      },
      {
        id: 'rfq-item-2',
        description: 'Schneider TeSys D Contactor 3P 25A 24V DC',
        brand: 'Schneider',
        partNumber: 'LC1D25BD',
        qty: 6,
        uom: 'PCS',
        specs: '11kW AC-3 rating, 24V DC low consumption coil',
      },
      {
        id: 'rfq-item-3',
        description: 'Schneider Altivar ATV320 1.5kW 2HP VFD Inverter',
        brand: 'Schneider',
        partNumber: 'ATV320U15N4B',
        qty: 2,
        uom: 'NOS',
        specs: '3-phase 380-500V, book format, integrated EMC filter',
      },
      {
        id: 'rfq-item-4',
        description: 'SS 316L Sanitary Butterfly Valve DN50 with EPDM Seat',
        brand: 'AWH / Alfa Laval',
        partNumber: 'BFV-DN50-TC',
        qty: 4,
        uom: 'PCS',
        specs: 'Tri-clamp ends DIN 32676, Ra < 0.8µm, manual pull handle',
      },
    ];
  });

  // Staged Dispatch Packages
  const [packages, setPackages] = useState<SourcingDispatchPackage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [generationEngine, setGenerationEngine] = useState<string | null>(null);

  // Load verified vendors from DataBank
  const handleLoadFromDataBank = () => {
    if (!dataBank || dataBank.length === 0) return;
    const uniqueSuppliers = Array.from(new Set(dataBank.map((i) => i.company))).map(
      (companyName, idx) => {
        const itemSample = dataBank.find((i) => i.company === companyName);
        return {
          id: `sup-db-${idx}`,
          companyName,
          contactPerson: 'Commercial Quotations Desk',
          email: `sales@${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.pk`,
          phone: '+92 (42) 3765-0000',
          categories: [itemSample?.category || 'Industrial Switchgear & Automation'],
          city: 'Lahore (Brandreth Rd)',
        };
      }
    );
    setSuppliers(uniqueSuppliers);
  };

  // Pull items from active quotation template
  const handlePullFromQuotation = () => {
    if (templateState.lineItems && templateState.lineItems.length > 0) {
      const items: SourcingRfqItem[] = templateState.lineItems.map((item, idx) => ({
        id: `rfq-item-${Date.now()}-${idx}`,
        description: item.description,
        brand: item.brand,
        partNumber: item.partNumber,
        qty: item.qty,
        uom: item.uom || 'PCS',
        specs: `Brand: ${item.brand || 'Original'}, PN: ${item.partNumber}`,
      }));
      setRfqItems(items);
    }
  };

  // Parse pasted CSV / Excel table data
  const handleParsePastedSuppliers = () => {
    if (!pasteSupplierText.trim()) return;
    const lines = pasteSupplierText.trim().split(/\r?\n/);
    const parsed: SourcingSupplier[] = [];

    lines.forEach((line, index) => {
      // Split on tabs (Excel copy) or commas (CSV)
      const parts = line.includes('\t') ? line.split('\t') : line.split(',');
      if (parts.length >= 2) {
        const companyName = parts[0]?.trim();
        const email = parts[1]?.trim() || `info@${companyName.toLowerCase().replace(/\s+/g, '')}.com`;
        const contactPerson = parts[2]?.trim() || 'Sales Team';
        const categoryRaw = parts[3]?.trim() || 'General Industrial';
        const categories = categoryRaw.split(/[/;,]/).map((c) => c.trim());

        if (companyName && !companyName.toLowerCase().includes('company')) {
          parsed.push({
            id: `sup-import-${index}-${Date.now()}`,
            companyName,
            email,
            contactPerson,
            categories,
            city: 'Pakistan',
          });
        }
      }
    });

    if (parsed.length > 0) {
      setSuppliers(parsed);
      setPasteSupplierText('');
      setShowPasteSupplier(false);
    }
  };

  // File upload reader (.csv or .txt)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setPasteSupplierText(text);
        setShowPasteSupplier(true);
      }
    };
    reader.readAsText(file);
  };

  // Execute AI Matching & Drafting Engine
  const handleGeneratePackages = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/sourcing/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suppliers,
          rfq_items: rfqItems,
          rfq_ref: rfqRef,
          deadline_days: deadlineDays,
          company_name: 'Qri Industrial Procurement OS',
        }),
      });

      const data = await res.json();
      if (data.packages && Array.isArray(data.packages)) {
        setPackages(data.packages);
        setGenerationEngine(data.engine || 'AI Procurement Engine');
      }
    } catch (err) {
      console.error('Failed to generate dispatch packages:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Launch Native Outlook / Thunderbird via mailto deep-link
  const handleLaunchEmailClient = (pkg: SourcingDispatchPackage) => {
    const subjectEncoded = encodeURIComponent(pkg.subject);
    const bodyEncoded = encodeURIComponent(pkg.body);
    const mailtoUrl = `mailto:${pkg.supplierEmail}?subject=${subjectEncoded}&body=${bodyEncoded}`;

    // Mark as dispatched
    setPackages((prev) =>
      prev.map((p) =>
        p.id === pkg.id
          ? { ...p, status: 'dispatched', dispatchedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
          : p
      )
    );

    // Launch email client
    window.location.href = mailtoUrl;
  };

  // Copy email draft to clipboard
  const handleCopyBody = (pkg: SourcingDispatchPackage) => {
    const fullText = `Subject: ${pkg.subject}\n\n${pkg.body}`;
    navigator.clipboard.writeText(fullText);
    setCopiedId(pkg.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Update draft text inline
  const updatePackageDraft = (id: string, updates: Partial<SourcingDispatchPackage>) => {
    setPackages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  const dispatchedCount = packages.filter((p) => p.status === 'dispatched').length;

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-y-auto space-y-5 select-none pr-1 text-slate-900 pb-10">
      {/* ─── TOP CONTROL BAR ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center text-white shadow-xs">
            <Send className="w-5 h-5 text-[#FF4D6D]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-50 text-[#FF4D6D] border border-rose-200">
                SOURCING AUTOMATION
              </span>
              <span className="text-xs text-slate-400 font-medium">Categorization &amp; Email Dispatch</span>
            </div>
            <h1 className="text-lg font-bold text-slate-950">Smart RFQ Dispatcher</h1>
          </div>
        </div>

        {/* Commercial Parameters */}
        <div className="flex items-center flex-wrap gap-2 text-xs font-mono">
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <span className="text-slate-400 font-bold">REF:</span>
            <input
              type="text"
              value={rfqRef}
              onChange={(e) => setRfqRef(e.target.value)}
              className="bg-transparent font-bold text-slate-900 outline-none w-28 text-xs"
            />
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 font-bold">Deadline:</span>
            <select
              value={deadlineDays}
              onChange={(e) => setDeadlineDays(Number(e.target.value))}
              className="bg-transparent font-bold text-slate-900 outline-none cursor-pointer"
            >
              <option value={2}>48 Hours (2 Days)</option>
              <option value={3}>72 Hours (3 Days)</option>
              <option value={5}>5 Business Days</option>
              <option value={7}>7 Calendar Days</option>
            </select>
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 font-bold">Delivery:</span>
            <select
              value={targetDestination}
              onChange={(e) => setTargetDestination(e.target.value)}
              className="bg-transparent font-bold text-slate-900 outline-none cursor-pointer"
            >
              <option value="Lahore Central Warehouse">Lahore Central Warehouse</option>
              <option value="Karachi Port Clearance Facility">Karachi Port Facility</option>
              <option value="Islamabad / Rawalpindi Site">Islamabad Site</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── STAGE 1: INPUT DATA PANELS (SUPPLIERS & RFQ ITEMS) ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Candidate Suppliers Directory (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">
                1. Candidate Suppliers Directory ({suppliers.length})
              </h2>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={handleLoadFromDataBank}
                className="px-2.5 py-1 text-[11px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                title="Load suppliers from DataBank"
              >
                DataBank Sync
              </button>
              <label className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg transition-colors cursor-pointer flex items-center space-x-1">
                <Upload className="w-3 h-3" />
                <span>Upload CSV</span>
                <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
              </label>
              <button
                onClick={() => setShowPasteSupplier(!showPasteSupplier)}
                className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg transition-colors cursor-pointer flex items-center space-x-1"
              >
                <FileSpreadsheet className="w-3 h-3" />
                <span>Paste Table</span>
              </button>
            </div>
          </div>

          {/* Paste Supplier Drawer */}
          {showPasteSupplier && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Paste Excel columns: [Company Name, Email, Contact Person, Categories]</span>
                <button
                  onClick={() => setShowPasteSupplier(false)}
                  className="text-slate-400 hover:text-slate-700 text-xs"
                >
                  ✕
                </button>
              </div>
              <textarea
                value={pasteSupplierText}
                onChange={(e) => setPasteSupplierText(e.target.value)}
                rows={3}
                placeholder="Example:&#10;Brandt Industrial	sales@brandt.pk	Khawaja Rizwan	Switchgear / Relays&#10;Al-Madina Switchgear	info@almadina.com	Tariq Sahib	Contactors / Breakers"
                className="w-full text-xs font-mono p-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 bg-white"
              />
              <button
                onClick={handleParsePastedSuppliers}
                className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 cursor-pointer"
              >
                Parse &amp; Import Vendors
              </button>
            </div>
          )}

          {/* Loaded Suppliers List */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {suppliers.map((s) => (
              <div
                key={s.id}
                className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-start justify-between group hover:border-slate-300 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs text-slate-900">{s.companyName}</span>
                    <span className="text-[10px] font-mono text-slate-400">{s.city}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center space-x-2 font-mono">
                    <span className="text-blue-600 font-medium">{s.email}</span>
                    <span>•</span>
                    <span>{s.contactPerson}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {s.categories.map((c, i) => (
                      <span
                        key={i}
                        className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 font-bold"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setSuppliers((prev) => prev.filter((item) => item.id !== s.id))}
                  className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                  title="Remove candidate"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Master RFQ Items / Bill of Materials (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Package className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">
                2. Master RFQ Items to Source ({rfqItems.length})
              </h2>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={handlePullFromQuotation}
                className="px-2.5 py-1 text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg transition-colors cursor-pointer flex items-center space-x-1"
                title="Import items from active quotation studio"
              >
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>Pull from Quote</span>
              </button>
              <button
                onClick={() =>
                  setRfqItems((prev) => [
                    ...prev,
                    {
                      id: `item-${Date.now()}`,
                      description: 'New Industrial Item Description',
                      brand: 'Siemens / Schneider',
                      partNumber: 'PART-NEW',
                      qty: 1,
                      uom: 'PCS',
                      specs: 'Standard commercial quality',
                    },
                  ])
                }
                className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg transition-colors cursor-pointer flex items-center space-x-1"
              >
                <Plus className="w-3 h-3" />
                <span>Add Item</span>
              </button>
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {rfqItems.map((item, idx) => (
              <div
                key={item.id}
                className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-start justify-between group hover:border-slate-300 transition-colors"
              >
                <div className="space-y-0.5 pr-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-mono font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-xs text-slate-900">{item.description}</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 pl-7 flex items-center space-x-2">
                    <span className="text-slate-700 font-bold">Qty: {item.qty} {item.uom}</span>
                    <span>•</span>
                    <span className="text-blue-700 font-semibold">{item.brand || 'Standard'}</span>
                    <span>•</span>
                    <span className="text-slate-400">{item.partNumber}</span>
                  </div>
                  {item.specs && (
                    <div className="text-[10px] text-slate-400 pl-7 italic truncate max-w-md">
                      {item.specs}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setRfqItems((prev) => prev.filter((it) => it.id !== item.id))}
                  className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                  title="Remove item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── CENTRAL RUN ACTION BANNER ───────────────────────────────────────── */}
      <div className="bg-slate-950 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <Sparkles className="w-4 h-4 text-[#FF4D6D]" />
            <span className="text-xs font-mono font-bold text-[#FF4D6D] tracking-wider uppercase">
              AI Sourcing Automation Pipeline
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300">
            Categorizes each vendor, matches suitable line items, and generates personalized formal RFQs ready for one-click email dispatch.
          </p>
        </div>

        <button
          onClick={handleGeneratePackages}
          disabled={isGenerating || suppliers.length === 0 || rfqItems.length === 0}
          className="px-6 py-3 rounded-full bg-[#FF4D6D] hover:bg-[#e63956] text-white font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 flex-shrink-0"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Matching &amp; Composing RFQs...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Match Candidates &amp; Generate RFQs</span>
            </>
          )}
        </button>
      </div>

      {/* ─── STAGE 2: GENERATED STAGED DISPATCH DECK ─────────────────────────── */}
      {packages.length > 0 && (
        <div className="space-y-4 pt-2">
          {/* Deck Header & Status */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center space-x-3">
              <h2 className="text-base font-bold text-slate-950">
                Ready-to-Dispatch RFQ Packages ({packages.length})
              </h2>
              {generationEngine && (
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  Engine: {generationEngine}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2 font-mono text-xs font-bold">
              <span className="text-slate-500">Progress:</span>
              <span className={`px-2.5 py-1 rounded-full border ${dispatchedCount === packages.length ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-800 border-slate-200'}`}>
                {dispatchedCount} of {packages.length} Dispatched
              </span>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {packages.map((pkg, idx) => {
              const isDispatched = pkg.status === 'dispatched';
              return (
                <div
                  key={pkg.id}
                  className={`bg-white border rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all ${
                    isDispatched
                      ? 'border-emerald-300 ring-2 ring-emerald-50 bg-emerald-50/10'
                      : 'border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-start justify-between pb-3 mb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-mono font-bold text-[10px] flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <h3 className="font-bold text-sm text-slate-900">{pkg.supplierName}</h3>
                          {isDispatched && (
                            <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center space-x-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Dispatched ({pkg.dispatchedAt})</span>
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] font-mono text-slate-500 pl-7 mt-0.5 flex items-center space-x-2">
                          <span className="text-blue-600 font-bold">{pkg.supplierEmail}</span>
                          {pkg.supplierContact && (
                            <>
                              <span>•</span>
                              <span>{pkg.supplierContact}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                          {pkg.matchedItems.length} Items Matched
                        </span>
                      </div>
                    </div>

                    {/* Matched Items Chips */}
                    <div className="mb-3">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Segregated Items for this Candidate:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {pkg.matchedItems.map((item, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-slate-700 font-semibold"
                          >
                            {item.qty}x {item.description} ({item.brand || 'Std'})
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Fit Reason */}
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 mb-3 flex items-center space-x-1.5 font-medium">
                      <Check className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                      <span>{pkg.fitReason}</span>
                    </div>

                    {/* Editable Email Subject */}
                    <div className="space-y-1 mb-3">
                      <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block">
                        Email Subject
                      </label>
                      <input
                        type="text"
                        value={pkg.subject}
                        onChange={(e) => updatePackageDraft(pkg.id, { subject: e.target.value })}
                        className="w-full text-xs font-mono font-bold p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:bg-white text-slate-900"
                      />
                    </div>

                    {/* Editable Email Message Body */}
                    <div className="space-y-1 mb-4">
                      <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block">
                        Composed RFQ Message Body
                      </label>
                      <textarea
                        value={pkg.body}
                        onChange={(e) => updatePackageDraft(pkg.id, { body: e.target.value })}
                        rows={8}
                        className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:bg-white text-slate-800 leading-relaxed"
                      />
                    </div>
                  </div>

                  {/* Card Actions (Outlook / Thunderbird launch & Copy) */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
                    <button
                      onClick={() => handleCopyBody(pkg)}
                      className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1.5 active:scale-95"
                    >
                      {copiedId === pkg.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Copy Draft</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() =>
                          updatePackageDraft(pkg.id, {
                            status: isDispatched ? 'draft' : 'dispatched',
                            dispatchedAt: isDispatched ? undefined : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                          })
                        }
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                          isDispatched
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {isDispatched ? 'Reset Status' : 'Mark as Sent'}
                      </button>

                      {/* Primary CTA: Launch Outlook or Thunderbird */}
                      <button
                        onClick={() => handleLaunchEmailClient(pkg)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-xs cursor-pointer active:scale-95 flex items-center space-x-1.5 ${
                          isDispatched
                            ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                            : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                        }`}
                        title="Opens your desktop email client with recipient, subject, and body ready to send"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Launch Outlook / Thunderbird</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
