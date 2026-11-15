'use client';

import React, { useState } from 'react';
import {
  Wrench,
  Calculator,
  Truck,
  ArrowRightLeft,
  CheckCircle2,
  DollarSign,
  Percent,
  ShieldCheck,
  Info,
} from 'lucide-react';

export default function EngineeringToolsPage() {
  const [activeTab, setActiveTab] = useState<'wht' | 'incoterm' | 'crossref'>('wht');

  // Tool 1: WHT & GST Reverse Gross-Up Calculator State
  const [baseCost, setBaseCost] = useState<number>(14500);
  const [marginPct, setMarginPct] = useState<number>(15);
  const [whtPct, setWhtPct] = useState<number>(8);
  const [gstMode, setGstMode] = useState<'WITHOUT_GST' | 'GST_18' | 'CUSTOM'>('GST_18');
  const [customGstPct, setCustomGstPct] = useState<number>(18);

  // WHT Math
  const targetNetProceeds = baseCost * (1 + marginPct / 100);
  const invoiceUnitPriceExclTax = targetNetProceeds / (1 - whtPct / 100);
  const gstRate = gstMode === 'GST_18' ? 0.18 : gstMode === 'CUSTOM' ? customGstPct / 100 : 0;
  const gstAmount = invoiceUnitPriceExclTax * gstRate;
  const totalGrossInvoice = invoiceUnitPriceExclTax + gstAmount;
  const clientWhtDeduction = invoiceUnitPriceExclTax * (whtPct / 100);
  const netCashReceived = invoiceUnitPriceExclTax - clientWhtDeduction;

  // Tool 2: Incoterm Differential Estimator State
  const [supplierExwUsd, setSupplierExwUsd] = useState<number>(500);
  const [usdToPkr, setUsdToPkr] = useState<number>(278.5);
  const [freightType, setFreightType] = useState<'AIR' | 'SEA'>('AIR');
  const [customsDutyPct, setCustomsDutyPct] = useState<number>(20);

  const exwPkr = supplierExwUsd * usdToPkr;
  const freightPct = freightType === 'AIR' ? 15 : 6;
  const freightCostPkr = exwPkr * (freightPct / 100);
  const customsCostPkr = (exwPkr + freightCostPkr) * (customsDutyPct / 100);
  const inlandPortClearingPkr = 25000;
  const estimatedDdpLandedCostPkr = exwPkr + freightCostPkr + customsCostPkr + inlandPortClearingPkr;

  // Tool 3: Industrial Cross-Matcher Matrix
  const [crossSearch, setCrossSearch] = useState('');
  const crossReferenceDatabase = [
    {
      siemens: '3RH2122-1BB40 (24V DC)',
      schneider: 'CAD32BD (24V DC)',
      abb: 'NF22E-11 (24V DC)',
      category: 'Auxiliary Contactor Relay (2NO+2NC)',
    },
    {
      siemens: '3RH2131-1BB40 (24V DC)',
      schneider: 'CAD31BD (24V DC)',
      abb: 'NF31E-11 (24V DC)',
      category: 'Auxiliary Contactor Relay (3NO+1NC)',
    },
    {
      siemens: '3RT2026-1BB40 (25A 11kW)',
      schneider: 'LC1D25BD (25A 11kW)',
      abb: 'AF26-30-00-11 (26A 11kW)',
      category: '3-Pole Power Contactor 24V DC',
    },
    {
      siemens: '3RT2016-1BB41 (9A 4kW)',
      schneider: 'LC1D09BD (9A 4kW)',
      abb: 'AF09-30-10-11 (9A 4kW)',
      category: '3-Pole Power Contactor 24V DC',
    },
    {
      siemens: '6ES7214-1AG40-0XB0 (1214C DC/DC/DC)',
      schneider: 'TM221CE16T (M221 16 IO)',
      abb: 'PM554-TP-ETH (AC500-eCo)',
      category: 'Compact Industrial PLC Controller',
    },
  ];

  const filteredCross = crossReferenceDatabase.filter(
    (item) =>
      item.siemens.toLowerCase().includes(crossSearch.toLowerCase()) ||
      item.schneider.toLowerCase().includes(crossSearch.toLowerCase()) ||
      item.abb.toLowerCase().includes(crossSearch.toLowerCase()) ||
      item.category.toLowerCase().includes(crossSearch.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden text-slate-100">
      {/* Top Header */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Wrench className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center space-x-2">
              <span>Engineering Procurement Tools</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">
                Team Suite
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              Rapid commercial calculators, tax gross-up tools, and drop-in equipment matchers
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('wht')}
            className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              activeTab === 'wht'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">WHT &amp; GST Gross-Up</span>
            <span className="sm:hidden">WHT</span>
          </button>
          <button
            onClick={() => setActiveTab('incoterm')}
            className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              activeTab === 'incoterm'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Incoterm Estimator</span>
            <span className="sm:hidden">Incoterms</span>
          </button>
          <button
            onClick={() => setActiveTab('crossref')}
            className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              activeTab === 'crossref'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cross-Reference</span>
            <span className="sm:hidden">SKU Match</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Area */}
      <main className="flex-1 p-3 sm:p-6 overflow-y-auto space-y-6">
        {/* =========================================================================
            TOOL 1: WHT & GST REVERSE GROSS-UP CALCULATOR
        ========================================================================= */}
        {activeTab === 'wht' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 shadow-xl space-y-6">
              <div className="border-b border-slate-800 pb-3">
                <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Calculator className="w-4 h-4 text-amber-400" />
                  <span>Reverse Gross-Up Calculator (Withholding Tax Protection)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Prevents margin erosion caused by corporate Withholding Tax deductions in Pakistan. Automatically scales invoice price so net bank proceeds equal 100% of target margin.
                </p>
              </div>

              {/* Inputs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                    Base Cost (Supplier PKR):
                  </label>
                  <input
                    type="number"
                    value={baseCost}
                    onChange={(e) => setBaseCost(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                    Target Margin (%):
                  </label>
                  <input
                    type="number"
                    value={marginPct}
                    onChange={(e) => setMarginPct(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                    Client WHT Deduction (%):
                  </label>
                  <select
                    value={whtPct}
                    onChange={(e) => setWhtPct(parseFloat(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="0">0% (Exempt)</option>
                    <option value="5">5% (Special Filer)</option>
                    <option value="8">8% (Standard Goods Filer)</option>
                    <option value="11">11% (Services / Turnkey)</option>
                    <option value="16">16% (Non-Filer Penalty)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                    Sales Tax Mode (GST):
                  </label>
                  <select
                    value={gstMode}
                    onChange={(e) => setGstMode(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="WITHOUT_GST">Without GST (0%)</option>
                    <option value="GST_18">+18% Sales Tax (GST)</option>
                    <option value="CUSTOM">Custom %</option>
                  </select>
                </div>
              </div>

              {/* Calculation Results Card */}
              <div className="bg-slate-950 border border-amber-500/30 rounded-xl p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Invoice Unit Price (Excl GST)</div>
                  <div className="text-base font-bold font-mono text-white mt-1">
                    Rs. {new Intl.NumberFormat('en-PK').format(Math.round(invoiceUnitPriceExclTax))}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Target Net: Rs. {new Intl.NumberFormat('en-PK').format(Math.round(targetNetProceeds))}
                  </div>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Expected WHT Deduction ({whtPct}%)</div>
                  <div className="text-base font-bold font-mono text-rose-400 mt-1">
                    - Rs. {new Intl.NumberFormat('en-PK').format(Math.round(clientWhtDeduction))}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Deducted at source by client</div>
                </div>

                <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                  <div className="text-[10px] text-emerald-400 uppercase font-mono font-bold flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Guaranteed Net Bank Cash</span>
                  </div>
                  <div className="text-lg font-black font-mono text-emerald-400 mt-1">
                    Rs. {new Intl.NumberFormat('en-PK').format(Math.round(netCashReceived))}
                  </div>
                  <div className="text-[10px] text-emerald-300/80 mt-1">
                    Exact {marginPct}% margin retained!
                  </div>
                </div>
              </div>

              {/* Formula & Rule Note */}
              <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-300 flex items-start space-x-2.5">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold">Golden Procurement Math Rule:</div>
                  <div className="text-[11px] text-slate-300 leading-relaxed font-mono">
                    UnitPrice = (Cost × (1 + Margin%)) ÷ (1 - WHT%)
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Never multiply by (1 + WHT%). Because withholding tax is deducted on the gross invoice, multiplying leaves you short on cash. Dividing ensures 100% of profit is protected.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TOOL 2: INCOTERM DIFFERENTIAL ESTIMATOR
        ========================================================================= */}
        {activeTab === 'incoterm' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 shadow-xl space-y-6">
              <div className="border-b border-slate-800 pb-3">
                <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Truck className="w-4 h-4 text-amber-400" />
                  <span>Incoterm Landed Cost Estimator (EXW vs DDP)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Estimate total landed cost when a foreign supplier quotes Ex-Works (EXW Factory) instead of Delivered Duty Paid (DDP).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                    Supplier EXW (USD):
                  </label>
                  <input
                    type="number"
                    value={supplierExwUsd}
                    onChange={(e) => setSupplierExwUsd(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                    USD to PKR Rate:
                  </label>
                  <input
                    type="number"
                    value={usdToPkr}
                    onChange={(e) => setUsdToPkr(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                    Freight Mode:
                  </label>
                  <select
                    value={freightType}
                    onChange={(e) => setFreightType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="AIR">Express Air Freight (15%)</option>
                    <option value="SEA">Standard Ocean Freight (6%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                    Customs Duty &amp; RD (%):
                  </label>
                  <input
                    type="number"
                    value={customsDutyPct}
                    onChange={(e) => setCustomsDutyPct(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Incoterm Breakdown Table */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden p-4 space-y-3 font-mono text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">1. Base Factory EXW (PKR Equivalent):</span>
                  <span className="text-white font-bold">Rs. {new Intl.NumberFormat('en-PK').format(Math.round(exwPkr))}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">2. International Freight ({freightType}):</span>
                  <span className="text-white font-bold">+ Rs. {new Intl.NumberFormat('en-PK').format(Math.round(freightCostPkr))}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">3. Customs Duty, Regulatory Duty &amp; Clearance:</span>
                  <span className="text-white font-bold">+ Rs. {new Intl.NumberFormat('en-PK').format(Math.round(customsCostPkr))}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">4. Port Handling &amp; Inland Trucking:</span>
                  <span className="text-white font-bold">+ Rs. {new Intl.NumberFormat('en-PK').format(inlandPortClearingPkr)}</span>
                </div>
                <div className="flex justify-between py-2 text-sm bg-amber-500/10 px-3 rounded-lg border border-amber-500/30">
                  <span className="text-amber-300 font-bold">Estimated Landed Cost (DDP Equivalent):</span>
                  <span className="text-amber-300 font-extrabold">Rs. {new Intl.NumberFormat('en-PK').format(Math.round(estimatedDdpLandedCostPkr))}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TOOL 3: INDUSTRIAL EQUIPMENT CROSS-REFERENCE
        ========================================================================= */}
        {activeTab === 'crossref' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 shadow-xl space-y-4">
              <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                    <ArrowRightLeft className="w-4 h-4 text-amber-400" />
                    <span>Industrial Equipment Drop-in Cross-Reference</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Find equivalent drop-in models across Siemens, Schneider Electric, and ABB when stock is unavailable.
                  </p>
                </div>
                <input
                  type="text"
                  placeholder="Filter by part number or model..."
                  value={crossSearch}
                  onChange={(e) => setCrossSearch(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono w-full sm:w-64"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs text-left">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Equipment Class</th>
                      <th className="py-2.5 px-3 text-cyan-400">Siemens Sirius</th>
                      <th className="py-2.5 px-3 text-emerald-400">Schneider TeSys</th>
                      <th className="py-2.5 px-3 text-rose-400">ABB Control</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono">
                    {filteredCross.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-850/50">
                        <td className="py-3 px-3 font-sans font-medium text-slate-300">
                          {row.category}
                        </td>
                        <td className="py-3 px-3 font-bold text-cyan-300">
                          {row.siemens}
                        </td>
                        <td className="py-3 px-3 font-bold text-emerald-300">
                          {row.schneider}
                        </td>
                        <td className="py-3 px-3 font-bold text-rose-300">
                          {row.abb}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
