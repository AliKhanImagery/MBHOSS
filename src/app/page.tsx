'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Sparkles,
  Plus,
  Trash2,
  Download,
  Send,
  Layers,
  ArrowRight,
  ExternalLink,
  Split,
  Percent,
  Clock,
  CheckCircle2,
  Building,
  RefreshCw,
  Search,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { QuickAddRateModal } from '@/components/QuickAddRateModal';
import { DeepResearchModal } from '@/components/DeepResearchModal';
import { RfqDispatchModal } from '@/components/RfqDispatchModal';
import { IncotermTooltip } from '@/components/IncotermTooltip';
import {
  calculateCommercialPricing,
  evaluateConfidence,
  formatPKR,
  formatUSD,
  IncotermCode,
  round2,
  TaxMode,
} from '@/lib/commercial-math';
import { MasterItem, MasterSupplier, PriceLedgerRecord, QuoteCase, QuoteLineItem } from '@/lib/db';

export default function QuotationWorkspace() {
  // Navigation & Modals
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isDeepResearchOpen, setIsDeepResearchOpen] = useState(false);
  const [isRfqDispatchOpen, setIsRfqDispatchOpen] = useState(false);

  // Global Loaded State
  const [items, setItems] = useState<MasterItem[]>([]);
  const [suppliers, setSuppliers] = useState<MasterSupplier[]>([]);
  const [ledger, setLedger] = useState<PriceLedgerRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeRefNumber, setActiveRefNumber] = useState('QT-2026-2001');

  // Omnibox State
  const [omniboxInput, setOmniboxInput] = useState('');
  const [isParsingOmnibox, setIsParsingOmnibox] = useState(false);

  // Commercial Toolbar State
  const [customerName, setCustomerName] = useState('Engro Fertilizers / Packages Ltd');
  const [customerContact, setCustomerContact] = useState('Engr. Bilal Shah (Chief Electrical Manager)');
  const [currencyMode, setCurrencyMode] = useState<'PKR' | 'ORIGINAL'>('PKR');
  const [taxMode, setTaxMode] = useState<TaxMode>('WITHOUT_GST');
  const [customTaxPct, setCustomTaxPct] = useState<number>(18);
  const [whtPct, setWhtPct] = useState<number>(0);
  const [customWhtInput, setCustomWhtInput] = useState<string>('0');
  const [deliveryTerms, setDeliveryTerms] = useState<string>('Ex-Stock');
  const [paymentTerms, setPaymentTerms] = useState<string>('100% Advance');
  const [validityDays, setValidityDays] = useState<number>(7);
  const [splitRfqByCategory, setSplitRfqByCategory] = useState<boolean>(false);

  // Quotation Grid Lines State
  const [lines, setLines] = useState<
    Array<{
      id: string;
      item_id?: string;
      raw_input_text: string;
      custom_description: string;
      brand?: string;
      sku?: string;
      category?: string;
      qty: number;
      unit_of_measure: string;
      selected_cost: number;
      cost_currency: 'PKR' | 'USD';
      suggested_margin_pct: number;
      margin_pct: number;
      incoterm_code: IncotermCode;
      source_validity_date: string;
      evidence_url?: string;
      submitter_name?: string;
      source_origin?: string;
      supplier_name?: string;
      parent_line_id?: string;
      is_alternative: boolean;
      topMatches?: any[];
    }>
  >([]);

  // Stamping State
  const [isStampingPdf, setIsStampingPdf] = useState(false);

  // Fetch initial database items, suppliers, ledger records
  const loadData = async () => {
    try {
      const res = await fetch('/api/ledger');
      const data = await res.json();
      if (data.items) setItems(data.items);
      if (data.suppliers) setSuppliers(data.suppliers);
      if (data.records) setLedger(data.records);

      // Seed initial 3 lines if empty
      if (lines.length === 0 && data.items && data.items.length >= 2) {
        const item1 = data.items[0]; // Siemens 3RH2122
        const item2 = data.items[1]; // Schneider LC1D25
        const item3 = data.items[2]; // Schneider LC1D09

        const rec1 = data.records?.find((r: any) => r.item_id === item1.id);
        const rec2 = data.records?.find((r: any) => r.item_id === item2.id);
        const rec3 = data.records?.find((r: any) => r.item_id === item3.id);

        const initialLines = [
          {
            id: 'line-1',
            item_id: item1.id,
            raw_input_text: 'Siemens 24V Chota Relay 10 pcs',
            custom_description: item1.plain_english_description,
            brand: item1.brand,
            sku: item1.official_sku,
            category: item1.category,
            qty: 10,
            unit_of_measure: 'PCS',
            selected_cost: rec1?.unit_cost || 14500,
            cost_currency: (rec1?.currency as any) || 'PKR',
            suggested_margin_pct: 15,
            margin_pct: 15,
            incoterm_code: (rec1?.incoterm_code as any) || 'DDP',
            source_validity_date: rec1?.source_validity_date || new Date().toISOString(),
            evidence_url: rec1?.evidence_url,
            submitter_name: 'Ali Khan',
            source_origin: 'WHATSAPP_BOT',
            supplier_name: 'Brandt Industrial Automation',
            is_alternative: false,
          },
          {
            id: 'line-2',
            item_id: item2.id,
            raw_input_text: 'Schneider 25A 24V Contactor 5 pcs',
            custom_description: item2.plain_english_description,
            brand: item2.brand,
            sku: item2.official_sku,
            category: item2.category,
            qty: 5,
            unit_of_measure: 'PCS',
            selected_cost: rec2?.unit_cost || 21800,
            cost_currency: (rec2?.currency as any) || 'PKR',
            suggested_margin_pct: 20,
            margin_pct: 20,
            incoterm_code: (rec2?.incoterm_code as any) || 'EXW',
            source_validity_date: rec2?.source_validity_date || new Date(Date.now() - 45 * 86400000).toISOString(),
            evidence_url: rec2?.evidence_url,
            submitter_name: 'Hamza Rauf',
            source_origin: 'LOCAL_MARKET_QUICKADD',
            supplier_name: 'Al-Madina Switchgear Brandreth Rd',
            is_alternative: false,
          },
          {
            id: 'line-3',
            item_id: item3.id,
            raw_input_text: 'Schneider 9A 220V coil 8 pcs',
            custom_description: item3.plain_english_description,
            brand: item3.brand,
            sku: item3.official_sku,
            category: item3.category,
            qty: 8,
            unit_of_measure: 'PCS',
            selected_cost: rec3?.unit_cost || 8200,
            cost_currency: (rec3?.currency as any) || 'PKR',
            suggested_margin_pct: 15,
            margin_pct: 15,
            incoterm_code: (rec3?.incoterm_code as any) || 'DDP',
            source_validity_date: rec3?.source_validity_date || new Date(Date.now() - 12 * 86400000).toISOString(),
            evidence_url: rec3?.evidence_url,
            submitter_name: 'Ali Khan',
            source_origin: 'LOCAL_MARKET_QUICKADD',
            supplier_name: 'Brandt Industrial Automation',
            is_alternative: false,
          },
        ];

        setLines(initialLines);
      }
    } catch (e) {
      console.error('Failed to load data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Parse Omnibox Input
  const handleParseOmnibox = async (customText?: string) => {
    const textToParse = customText || omniboxInput;
    if (!textToParse.trim()) return;

    setIsParsingOmnibox(true);
    try {
      const res = await fetch('/api/ai/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToParse }),
      });

      const data = await res.json();
      if (data.result && data.result.items) {
        const newLines = data.result.items.map((pi: any, idx: number) => {
          const topMatch = pi.topMatches[0];
          const matchedItem = topMatch?.item;
          const matchedLedger = ledger.find((r) => r.item_id === matchedItem?.id);

          const validityDate = matchedLedger?.source_validity_date || new Date().toISOString();
          const conf = evaluateConfidence(validityDate, !!matchedLedger?.evidence_url, true);

          return {
            id: `line-parsed-${Date.now()}-${idx}`,
            item_id: matchedItem?.id,
            raw_input_text: pi.rawLine,
            custom_description: matchedItem?.plain_english_description || pi.extractedDescription,
            brand: matchedItem?.brand || 'Industrial',
            sku: matchedItem?.official_sku || 'Standard',
            category: matchedItem?.category || 'General',
            qty: pi.extractedQty || 1,
            unit_of_measure: pi.extractedUom || 'PCS',
            selected_cost: matchedLedger?.unit_cost || 12000,
            cost_currency: matchedLedger?.currency || 'PKR',
            suggested_margin_pct: conf.suggestedMarginPct,
            margin_pct: conf.suggestedMarginPct,
            incoterm_code: matchedLedger?.incoterm_code || 'DDP',
            source_validity_date: validityDate,
            evidence_url: matchedLedger?.evidence_url,
            submitter_name: matchedLedger?.submitter?.full_name || 'Market Counter',
            source_origin: matchedLedger?.source_origin || 'LOCAL_MARKET_QUICKADD',
            supplier_name: matchedLedger?.supplier?.company_name || 'Brandreth Rd Stockist',
            is_alternative: false,
            topMatches: pi.topMatches,
          };
        });

        setLines((prev) => [...prev, ...newLines]);
        setOmniboxInput('');
      }
    } catch (err) {
      console.error('Omnibox parse error:', err);
    } finally {
      setIsParsingOmnibox(false);
    }
  };

  // Add Parallel Alternative "Option B" row directly beneath parent
  const handleAddAlternativeOptionB = (parentId: string) => {
    const parentIndex = lines.findIndex((l) => l.id === parentId);
    if (parentIndex < 0) return;
    const parent = lines[parentIndex];

    const altLine = {
      id: `alt-${Date.now()}`,
      parent_line_id: parentId,
      item_id: undefined,
      raw_input_text: `Alt replacement for ${parent.sku || parent.raw_input_text}`,
      custom_description: `Drop-in Equivalent for ${parent.sku || 'Primary Part'} (e.g. ABB / Eaton / Chint)`,
      brand: 'Alternative Brand',
      sku: 'ALT-DROPIN',
      category: parent.category,
      qty: parent.qty,
      unit_of_measure: parent.unit_of_measure,
      selected_cost: round2(parent.selected_cost * 0.85), // typically economical alternative
      cost_currency: parent.cost_currency,
      suggested_margin_pct: parent.margin_pct,
      margin_pct: parent.margin_pct,
      incoterm_code: parent.incoterm_code,
      source_validity_date: new Date().toISOString(),
      evidence_url: undefined,
      submitter_name: 'Procurement Engineer',
      source_origin: 'LOCAL_MARKET_QUICKADD',
      supplier_name: 'Verified Stockist',
      is_alternative: true,
    };

    const nextLines = [...lines];
    nextLines.splice(parentIndex + 1, 0, altLine);
    setLines(nextLines);
  };

  // Remove a line
  const handleRemoveLine = (id: string) => {
    setLines(lines.filter((l) => l.id !== id && l.parent_line_id !== id));
  };

  // Update line field
  const handleUpdateLine = (id: string, updates: Partial<(typeof lines)[0]>) => {
    setLines(
      lines.map((line) => {
        if (line.id === id) {
          const updated = { ...line, ...updates };

          // If item_id changed, auto-update sku/brand/description and find best ledger record
          if (updates.item_id && updates.item_id !== line.item_id) {
            const newItem = items.find((i) => i.id === updates.item_id);
            if (newItem) {
              updated.brand = newItem.brand;
              updated.sku = newItem.official_sku;
              updated.custom_description = newItem.plain_english_description;
              updated.category = newItem.category;

              const bestLedger = ledger.find((r) => r.item_id === newItem.id);
              if (bestLedger) {
                updated.selected_cost = bestLedger.unit_cost;
                updated.cost_currency = bestLedger.currency;
                updated.incoterm_code = bestLedger.incoterm_code;
                updated.source_validity_date = bestLedger.source_validity_date;
                updated.evidence_url = bestLedger.evidence_url;
                updated.supplier_name = bestLedger.supplier?.company_name;

                const conf = evaluateConfidence(bestLedger.source_validity_date, !!bestLedger.evidence_url, true);
                updated.suggested_margin_pct = conf.suggestedMarginPct;
                updated.margin_pct = conf.suggestedMarginPct;
              }
            }
          }

          return updated;
        }
        return line;
      })
    );
  };

  // Live Calculations across all rows
  const computedLines = useMemo(() => {
    return lines.map((line) => {
      const pricing = calculateCommercialPricing(
        line.selected_cost,
        line.margin_pct,
        whtPct,
        taxMode,
        customTaxPct
      );

      const confidence = evaluateConfidence(
        line.source_validity_date,
        !!line.evidence_url,
        line.supplier_name?.toLowerCase().includes('brandt') || line.supplier_name?.toLowerCase().includes('pak-german')
      );

      const lineTotal = line.is_alternative ? 0 : pricing.finalUnitPrice * line.qty;

      return {
        ...line,
        pricing,
        confidence,
        lineTotal,
      };
    });
  }, [lines, whtPct, taxMode, customTaxPct]);

  // Overall Totals
  const grandTotalPKR = useMemo(() => {
    return computedLines.reduce((acc, curr) => acc + (curr.is_alternative ? 0 : curr.lineTotal), 0);
  }, [computedLines]);

  const totalBaseCostPKR = useMemo(() => {
    return computedLines.reduce((acc, curr) => acc + (curr.is_alternative ? 0 : curr.selected_cost * curr.qty), 0);
  }, [computedLines]);

  const totalGrossMarginPKR = grandTotalPKR - totalBaseCostPKR;

  // Stamp Final Client Quote PDF
  const handleStampFinalClientQuote = async () => {
    setIsStampingPdf(true);
    try {
      const quoteCase: QuoteCase = {
        id: crypto.randomUUID(),
        case_ref_number: activeRefNumber,
        customer_name: customerName,
        customer_contact: customerContact,
        target_country: 'Pakistan',
        base_currency: 'PKR',
        tax_mode: taxMode,
        custom_tax_pct: customTaxPct,
        wht_pct: whtPct,
        delivery_terms: deliveryTerms,
        payment_terms: paymentTerms,
        validity_days: validityDays,
        split_rfq_by_category: splitRfqByCategory,
        status: 'STAMPED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const quoteLines: QuoteLineItem[] = computedLines.map((cl, idx) => ({
        id: cl.id,
        quote_case_id: quoteCase.id,
        item_id: cl.item_id,
        raw_input_text: cl.raw_input_text,
        custom_description: cl.custom_description,
        qty: cl.qty,
        unit_of_measure: cl.unit_of_measure,
        selected_cost: cl.selected_cost,
        currency: cl.cost_currency,
        suggested_margin_pct: cl.suggested_margin_pct,
        margin_pct: cl.margin_pct,
        final_unit_price: cl.pricing.finalUnitPrice,
        line_total: cl.lineTotal,
        confidence_level: cl.confidence.level,
        incoterm_code: cl.incoterm_code,
        is_alternative: cl.is_alternative,
        parent_line_id: cl.parent_line_id,
        sort_order: idx,
        created_at: new Date().toISOString(),
        item: items.find((i) => i.id === cl.item_id),
      }));

      const res = await fetch('/api/pdf/stamp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'FINAL_CLIENT_QUOTE',
          quoteCase,
          lineItems: quoteLines,
        }),
      });

      if (!res.ok) throw new Error('Stamping failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Final-Quote-${activeRefNumber}-${customerName.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      alert('Failed to stamp Final Client Quote PDF');
    } finally {
      setIsStampingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Desktop Navigation */}
      <Navigation
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
        activeRefNumber={activeRefNumber}
      />

      <main className="flex-1 p-3 space-y-3 max-w-[1920px] mx-auto w-full">
        {/* 1. OMNIBOX INTAKE BAR */}
        <section className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 shadow-md">
          <div className="flex items-center justify-between mb-1.5 text-xs">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                Omnibox Tender &amp; WhatsApp Intake Bar
              </span>
              <span className="text-[10px] text-slate-400">
                (Paste raw customer WhatsApp text, tender extracts, or RFQs)
              </span>
            </div>
            {/* Quick Demo Templates */}
            <div className="flex items-center space-x-2 text-[10px]">
              <span className="text-slate-400">Test Samples:</span>
              <button
                type="button"
                onClick={() => {
                  const sample = `1. 24V Chota Relay 15 pcs\n2. Schneider Bada Contactor 25A 24V 6 nos\n3. Siemens 1214C DC PLC 2 pcs\n4. Omron M12 PNP sensor 20 units`;
                  setOmniboxInput(sample);
                  handleParseOmnibox(sample);
                }}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded border border-slate-700 cursor-pointer font-mono"
              >
                + Lahore Factory BOM
              </button>
              <button
                type="button"
                onClick={() => {
                  const sample = `Urgent required for Karachi plant:\n- 10 nos Schneider 9A 220V coil\n- 2 nos Schneider 1.5kW VFD book model`;
                  setOmniboxInput(sample);
                  handleParseOmnibox(sample);
                }}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded border border-slate-700 cursor-pointer font-mono"
              >
                + WhatsApp Urgent RFQ
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={omniboxInput}
                onChange={(e) => setOmniboxInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleParseOmnibox();
                }}
                placeholder="Paste tender line items or slang (e.g. '10 pcs 24V Chota Relay, 5 nos LC1D25 24V')..."
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30"
              />
            </div>
            <button
              onClick={() => handleParseOmnibox()}
              disabled={isParsingOmnibox || !omniboxInput.trim()}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-bold text-xs rounded shadow-md shadow-amber-950/40 flex items-center space-x-1.5 transition-all cursor-pointer flex-shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isParsingOmnibox ? 'AI Parsing...' : 'Parse Tender Text'}</span>
            </button>
          </div>
        </section>

        {/* 2. COMMERCIAL TOOLBAR (SINGLE ROW OF 1-CLICK PILLS) */}
        <section className="bg-slate-900 border border-slate-800 rounded-lg p-2 shadow-sm flex flex-wrap items-center justify-between gap-y-2 text-xs select-none">
          <div className="flex flex-wrap items-center gap-2">
            {/* Customer Name & Ref */}
            <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded px-2 py-1">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                title="Client / Enterprise Name"
                className="bg-transparent border-none text-slate-200 font-semibold focus:outline-none text-xs w-48"
              />
            </div>

            {/* Currency Toggle */}
            <div className="inline-flex rounded-md p-0.5 bg-slate-950 border border-slate-800">
              <button
                onClick={() => setCurrencyMode('PKR')}
                className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all ${
                  currencyMode === 'PKR' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Base: PKR
              </button>
              <button
                onClick={() => setCurrencyMode('ORIGINAL')}
                className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all ${
                  currencyMode === 'ORIGINAL' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                USD/Original (278.50)
              </button>
            </div>

            {/* Tax Pills */}
            <div className="inline-flex rounded-md p-0.5 bg-slate-950 border border-slate-800 items-center space-x-0.5">
              <span className="text-[10px] text-slate-400 px-1 font-semibold">TAX:</span>
              <button
                onClick={() => setTaxMode('WITHOUT_GST')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                  taxMode === 'WITHOUT_GST' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Without GST (Default 0%)
              </button>
              <button
                onClick={() => setTaxMode('GST_18')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                  taxMode === 'GST_18' ? 'bg-blue-500 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                +18% GST
              </button>
              <button
                onClick={() => setTaxMode('CUSTOM')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                  taxMode === 'CUSTOM' ? 'bg-purple-500 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Custom %
              </button>
              {taxMode === 'CUSTOM' && (
                <input
                  type="number"
                  value={customTaxPct}
                  onChange={(e) => setCustomTaxPct(parseFloat(e.target.value) || 0)}
                  className="w-12 bg-slate-900 border border-slate-700 text-center text-xs text-white rounded px-1 py-0.5 font-mono"
                />
              )}
            </div>

            {/* WHT Reverse Gross-Up Pills */}
            <div className="inline-flex rounded-md p-0.5 bg-slate-950 border border-slate-800 items-center space-x-1">
              <span className="text-[10px] text-amber-400 px-1 font-bold">WHT GROSS-UP:</span>
              {[0, 5, 5.5, 10].map((rate) => (
                <button
                  key={rate}
                  onClick={() => {
                    setWhtPct(rate);
                    setCustomWhtInput(rate.toString());
                  }}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-mono transition-all ${
                    whtPct === rate ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {rate}%
                </button>
              ))}
              <div className="flex items-center space-x-1 pl-1">
                <input
                  type="number"
                  step="0.5"
                  value={customWhtInput}
                  onChange={(e) => {
                    setCustomWhtInput(e.target.value);
                    setWhtPct(parseFloat(e.target.value) || 0);
                  }}
                  className="w-12 bg-slate-900 border border-slate-700 text-center text-xs text-white rounded px-1 py-0.5 font-mono"
                  placeholder="Custom"
                />
                <span className="text-[10px] text-slate-400">%</span>
              </div>
            </div>

            {/* Delivery Terms */}
            <div className="inline-flex rounded-md p-0.5 bg-slate-950 border border-slate-800 items-center space-x-0.5">
              <span className="text-[10px] text-slate-400 px-1">DELIVERY:</span>
              {['Ex-Stock', '2-3 Weeks', '4-6 Weeks'].map((term) => (
                <button
                  key={term}
                  onClick={() => setDeliveryTerms(term)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                    deliveryTerms === term ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {term}
                </button>
              ))}
            </div>

            {/* Payment Terms */}
            <div className="inline-flex rounded-md p-0.5 bg-slate-950 border border-slate-800 items-center space-x-0.5">
              <span className="text-[10px] text-slate-400 px-1">PAYMENT:</span>
              {['100% Advance', '50/50', '30 Days Credit'].map((pay) => (
                <button
                  key={pay}
                  onClick={() => setPaymentTerms(pay)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                    paymentTerms === pay ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {pay}
                </button>
              ))}
            </div>

            {/* Validity Days */}
            <div className="inline-flex rounded-md p-0.5 bg-slate-950 border border-slate-800 items-center space-x-0.5">
              <span className="text-[10px] text-slate-400 px-1">VALIDITY:</span>
              {[7, 15].map((days) => (
                <button
                  key={days}
                  onClick={() => setValidityDays(days)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                    validityDays === days ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {days} Days
                </button>
              ))}
            </div>
          </div>

          {/* Outbound RFQ Split Checkbox */}
          <div className="flex items-center space-x-2 bg-slate-950/80 px-2 py-1 rounded border border-slate-800">
            <input
              type="checkbox"
              id="splitRfq"
              checked={splitRfqByCategory}
              onChange={(e) => setSplitRfqByCategory(e.target.checked)}
              className="accent-amber-400 rounded cursor-pointer"
            />
            <label htmlFor="splitRfq" className="text-[11px] text-slate-300 font-medium cursor-pointer">
              Split Outbound RFQs by Category
            </label>
          </div>
        </section>

        {/* 3. EXCEL-SPEED HIGH-DENSITY QUOTATION GRID */}
        <section className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="table-header-cell w-10 text-center">#</th>
                  <th className="table-header-cell min-w-[280px]">Item Description &amp; Master SKU Match</th>
                  <th className="table-header-cell w-20 text-center">Qty</th>
                  <th className="table-header-cell w-16 text-center">UoM</th>
                  <th className="table-header-cell min-w-[130px] text-right">Selected Cost</th>
                  <th className="table-header-cell min-w-[180px]">Historical Rate &amp; Confidence</th>
                  <th className="table-header-cell min-w-[140px]">Incoterm Terms</th>
                  <th className="table-header-cell w-24 text-center">Margin %</th>
                  <th className="table-header-cell min-w-[130px] text-right">Final Client Unit</th>
                  <th className="table-header-cell min-w-[130px] text-right">Line Total</th>
                  <th className="table-header-cell w-24 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {computedLines.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-slate-500">
                      No line items in current quotation. Use the Omnibox above or click &quot;+ Add Manual Row&quot;.
                    </td>
                  </tr>
                ) : (
                  computedLines.map((line, idx) => {
                    const isAlt = line.is_alternative;

                    return (
                      <tr
                        key={line.id}
                        className={`transition-colors ${
                          isAlt
                            ? 'bg-amber-500/[0.04] hover:bg-amber-500/[0.08] border-l-2 border-l-amber-500/70'
                            : idx % 2 === 0
                            ? 'bg-slate-900/40 hover:bg-slate-800/50'
                            : 'bg-slate-950/40 hover:bg-slate-800/50'
                        }`}
                      >
                        {/* 1. Seq Number */}
                        <td className="px-2 py-1.5 text-center font-mono text-slate-400">
                          {isAlt ? (
                            <span className="text-amber-400 font-bold" title="Option B Alternative">
                              ↳ B
                            </span>
                          ) : (
                            idx + 1
                          )}
                        </td>

                        {/* 2. Item Description & Top 3 Plain English SKU Dropdown */}
                        <td className="px-2 py-1.5">
                          <div className="space-y-1">
                            {isAlt && (
                              <div className="text-[10px] text-amber-400 font-semibold tracking-wide">
                                ↳ OPTION B (ALTERNATIVE PROPOSAL)
                              </div>
                            )}

                            {/* Dropdown to switch or bind to Master Item */}
                            <div className="flex items-center space-x-1">
                              <select
                                value={line.item_id || ''}
                                onChange={(e) => handleUpdateLine(line.id, { item_id: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-200 font-mono focus:border-amber-400 focus:outline-none"
                              >
                                <option value="">-- Match Master Catalog Item --</option>
                                {items.map((it) => (
                                  <option key={it.id} value={it.id}>
                                    {it.brand} {it.official_sku} — {it.plain_english_description}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Editable Description */}
                            <input
                              type="text"
                              value={line.custom_description}
                              onChange={(e) => handleUpdateLine(line.id, { custom_description: e.target.value })}
                              placeholder="Technical specifications / plain English label..."
                              className="w-full bg-slate-950/60 border border-slate-800 rounded px-1.5 py-0.5 text-[11px] text-slate-300 focus:border-amber-400 focus:outline-none"
                            />
                          </div>
                        </td>

                        {/* 3. Qty */}
                        <td className="px-2 py-1.5 text-center">
                          <input
                            type="number"
                            min="0.1"
                            step="any"
                            value={line.qty}
                            onChange={(e) => handleUpdateLine(line.id, { qty: parseFloat(e.target.value) || 1 })}
                            className="w-16 grid-cell-input text-center"
                          />
                        </td>

                        {/* 4. UoM */}
                        <td className="px-2 py-1.5 text-center">
                          <select
                            value={line.unit_of_measure}
                            onChange={(e) => handleUpdateLine(line.id, { unit_of_measure: e.target.value })}
                            className="bg-slate-950 border border-slate-800 rounded px-1 py-0.5 text-[11px] text-slate-300 focus:outline-none"
                          >
                            <option value="PCS">PCS</option>
                            <option value="NOS">NOS</option>
                            <option value="SET">SET</option>
                            <option value="MTR">MTR</option>
                            <option value="LOT">LOT</option>
                          </select>
                        </td>

                        {/* 5. Selected Cost */}
                        <td className="px-2 py-1.5 text-right font-mono">
                          <div className="flex items-center justify-end space-x-1">
                            <input
                              type="number"
                              step="any"
                              value={line.selected_cost}
                              onChange={(e) =>
                                handleUpdateLine(line.id, { selected_cost: parseFloat(e.target.value) || 0 })
                              }
                              className="w-24 grid-cell-input text-right"
                            />
                            <span className="text-[10px] text-slate-400">{line.cost_currency}</span>
                          </div>
                          {currencyMode === 'ORIGINAL' && line.cost_currency === 'USD' && (
                            <div className="text-[10px] text-slate-400">
                              ≈ PKR {formatPKR(line.selected_cost * 278.5)}
                            </div>
                          )}
                        </td>

                        {/* 6. Historical Rate Confidence Pill & Source Attribution */}
                        <td className="px-2 py-1.5">
                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-1.5">
                              <span
                                className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono border ${line.confidence.pillColor}`}
                                title={line.confidence.explanation}
                              >
                                {line.confidence.badgeIcon} {line.confidence.level} ({line.confidence.ageDays}d)
                              </span>
                              {line.evidence_url && (
                                <a
                                  href={line.evidence_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center space-x-0.5"
                                  title="View screenshot evidence"
                                >
                                  <span>[📎 Proof]</span>
                                </a>
                              )}
                            </div>

                            <div className="text-[10px] text-slate-400 line-clamp-1">
                              By <span className="text-slate-300">{line.submitter_name || 'Staff'}</span> via{' '}
                              <span className="text-amber-400/80">{line.source_origin}</span> (
                              {line.supplier_name || 'Stockist'})
                            </div>
                          </div>
                        </td>

                        {/* 7. Incoterm Layman Badge */}
                        <td className="px-2 py-1.5">
                          <IncotermTooltip code={line.incoterm_code} showShort={false} />
                        </td>

                        {/* 8. Margin % with Suggested Predictive Tag */}
                        <td className="px-2 py-1.5 text-center">
                          <div className="flex flex-col items-center">
                            <div className="flex items-center space-x-0.5">
                              <input
                                type="number"
                                step="any"
                                value={line.margin_pct}
                                onChange={(e) =>
                                  handleUpdateLine(line.id, { margin_pct: parseFloat(e.target.value) || 0 })
                                }
                                className="w-14 grid-cell-input text-center"
                              />
                              <span className="text-[10px] text-slate-400">%</span>
                            </div>
                            {line.margin_pct !== line.suggested_margin_pct && (
                              <button
                                onClick={() => handleUpdateLine(line.id, { margin_pct: line.suggested_margin_pct })}
                                className="text-[9px] text-amber-400 hover:underline mt-0.5 cursor-pointer font-mono"
                                title="Reset to predictive recommended margin"
                              >
                                Rec: {line.suggested_margin_pct}%
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 9. Final Client Unit Price (Reverse WHT Grossed-Up) */}
                        <td className="px-2 py-1.5 text-right font-mono">
                          <div className="font-bold text-slate-100">
                            {formatPKR(line.pricing.finalUnitPrice)}
                          </div>
                          {whtPct > 0 && (
                            <div
                              className="text-[9px] text-blue-400"
                              title={`Target: ${formatPKR(line.pricing.targetPrice)} / (1 - ${whtPct}%)`}
                            >
                              (WHT Grossed)
                            </div>
                          )}
                        </td>

                        {/* 10. Line Total */}
                        <td className="px-2 py-1.5 text-right font-mono font-bold">
                          {isAlt ? (
                            <span className="text-slate-500 font-normal italic">[Option B]</span>
                          ) : (
                            <span className="text-amber-400">{formatPKR(line.lineTotal)}</span>
                          )}
                        </td>

                        {/* 11. Actions: + Option B (Alt) & Delete */}
                        <td className="px-2 py-1.5 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            {!isAlt && (
                              <button
                                onClick={() => handleAddAlternativeOptionB(line.id)}
                                className="px-1.5 py-0.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-[10px] font-bold cursor-pointer transition-all"
                                title="Add parallel alternative proposal directly underneath"
                              >
                                + Alt
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveLine(line.id)}
                              className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Delete Row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Grid Bottom Bar: Add Manual Row + Financial Summary */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  const newLine = {
                    id: `line-${Date.now()}`,
                    raw_input_text: 'Manual Industrial Line Item',
                    custom_description: '',
                    qty: 1,
                    unit_of_measure: 'PCS',
                    selected_cost: 0,
                    cost_currency: 'PKR' as const,
                    suggested_margin_pct: 15,
                    margin_pct: 15,
                    incoterm_code: 'DDP' as const,
                    source_validity_date: new Date().toISOString(),
                    is_alternative: false,
                  };
                  setLines([...lines, newLine]);
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded border border-slate-700 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Manual Row</span>
              </button>

              <span className="text-xs text-slate-400 font-mono">
                {lines.length} Line Rows ({lines.filter((l) => l.is_alternative).length} Alternative Options)
              </span>
            </div>

            {/* Live Financial Rollup */}
            <div className="flex items-center space-x-6 text-xs font-mono">
              <div>
                <span className="text-slate-400 text-[10px] block">TOTAL PROCUREMENT COST:</span>
                <span className="text-slate-200 font-bold text-sm">PKR {formatPKR(totalBaseCostPKR)}</span>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] block">PROJECTED GROSS MARGIN:</span>
                <span className="text-emerald-400 font-bold text-sm">
                  PKR {formatPKR(totalGrossMarginPKR)}{' '}
                  <span className="text-xs font-normal">
                    ({totalBaseCostPKR > 0 ? ((totalGrossMarginPKR / totalBaseCostPKR) * 100).toFixed(1) : 0}%)
                  </span>
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-700/80 px-3 py-1.5 rounded">
                <span className="text-amber-400 text-[10px] font-bold block uppercase tracking-wider">
                  FINAL CLIENT QUOTE TOTAL (PKR):
                </span>
                <span className="text-white font-black text-base">PKR {formatPKR(grandTotalPKR)}</span>
              </div>
            </div>
          </div>
        </section>

        {/* 4. ACTION BAR (DEEP RESEARCH, OUTBOUND RFQ, FINAL CLIENT QUOTE) */}
        <section className="bg-slate-900 border border-slate-800 rounded-lg p-3 shadow-md flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-medium">Proposal Actions:</span>
          </div>

          <div className="flex items-center space-x-3">
            {/* Action 1: Cold-Start Deep Research Prompt */}
            <button
              onClick={() => setIsDeepResearchOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-xs border border-amber-500/30 transition-all cursor-pointer shadow-sm"
            >
              <Search className="w-3.5 h-3.5" />
              <span>🔍 Cold-Start Deep Research Prompt</span>
            </button>

            {/* Action 2: Stamp & Dispatch Outbound Supplier RFQ */}
            <button
              onClick={() => setIsRfqDispatchOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded bg-blue-600/90 hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-900/30 transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>📧 Stamp &amp; Dispatch Outbound RFQ</span>
            </button>

            {/* Action 3: Stamp Final Client Quote PDF */}
            <button
              onClick={handleStampFinalClientQuote}
              disabled={isStampingPdf || computedLines.length === 0}
              className="flex items-center space-x-1.5 px-4 py-2 rounded bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-xs shadow-lg shadow-emerald-900/40 transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isStampingPdf ? 'Stamping...' : '📄 Stamp Final Client Quote PDF'}</span>
            </button>
          </div>
        </section>
      </main>

      {/* Global Modals */}
      <QuickAddRateModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onRateAdded={loadData}
        masterItems={items}
        masterSuppliers={suppliers}
      />

      <DeepResearchModal
        isOpen={isDeepResearchOpen}
        onClose={() => setIsDeepResearchOpen(false)}
        items={computedLines.map((l) => ({
          description: l.custom_description || l.raw_input_text,
          sku: l.sku,
          brand: l.brand,
          qty: l.qty,
        }))}
      />

      <RfqDispatchModal
        isOpen={isRfqDispatchOpen}
        onClose={() => setIsRfqDispatchOpen(false)}
        quoteCase={{
          id: 'temp-case',
          case_ref_number: activeRefNumber,
          customer_name: customerName,
          target_country: 'Pakistan',
          base_currency: 'PKR',
          tax_mode: taxMode,
          custom_tax_pct: customTaxPct,
          wht_pct: whtPct,
          delivery_terms: deliveryTerms,
          payment_terms: paymentTerms,
          validity_days: validityDays,
          split_rfq_by_category: splitRfqByCategory,
          status: 'DRAFT',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }}
        lineItems={computedLines as any}
        masterSuppliers={suppliers}
        splitByCategory={splitRfqByCategory}
      />
    </div>
  );
}
