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
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden text-slate-100">
      {/* Tab Switcher Header */}
      <div className="flex items-center justify-between pb-3 flex-shrink-0">
        <div className="flex bg-[#16171B] p-1.5 rounded-full border border-white/5 shadow-md">
          <button
            onClick={() => setActiveTab('wht')}
            className={`px-4 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all ${
              activeTab === 'wht'
                ? 'bg-[#FF4D6D] text-white shadow-md shadow-[#FF4D6D]/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>WHT &amp; GST Gross-Up</span>
          </button>
          <button
            onClick={() => setActiveTab('incoterm')}
            className={`px-4 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all ${
              activeTab === 'incoterm'
                ? 'bg-[#FF4D6D] text-white shadow-md shadow-[#FF4D6D]/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Incoterm Estimator</span>
          </button>
          <button
            onClick={() => setActiveTab('crossref')}
            className={`px-4 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all ${
              activeTab === 'crossref'
                ? 'bg-[#FF4D6D] text-white shadow-md shadow-[#FF4D6D]/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>SKU Cross-Reference</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Area */}
      <main className="flex-1 overflow-y-auto space-y-6">
        {/* =========================================================================
            TOOL 1: WHT & GST REVERSE GROSS-UP CALCULATOR
        ========================================================================= */}
        {activeTab === 'wht' && (
          <div className="max-w-4xl space-y-6 animate-in fade-in">
            <div className="bg-[#16171B] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
              <div className="border-b border-[#262830] pb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center space-x-2.5">
                  <Calculator className="w-6 h-6 text-[#FF4D6D]" />
                  <span>Reverse Gross-Up Calculator (Withholding Tax Protection)</span>
                </h2>
                <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
                  Eliminates margin erosion from corporate tax deductions in Pakistan. Scales the invoice unit price so net cash received in bank equals 100% of profit target.
                </p>
              </div>

              {/* Inputs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
                    Base Cost (Supplier PKR):
                  </label>
                  <input
                    type="number"
                    value={baseCost}
                    onChange={(e) => setBaseCost(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0E0F12] border border-[#2B2E37] rounded-xl px-4 py-3 text-base font-mono text-white focus:outline-none focus:border-[#FF4D6D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
                    Target Margin (%):
                  </label>
                  <input
                    type="number"
                    value={marginPct}
                    onChange={(e) => setMarginPct(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0E0F12] border border-[#2B2E37] rounded-xl px-4 py-3 text-base font-mono text-white focus:outline-none focus:border-[#FF4D6D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
                    Client WHT Deduction (%):
                  </label>
                  <select
                    value={whtPct}
                    onChange={(e) => setWhtPct(parseFloat(e.target.value))}
                    className="w-full bg-[#0E0F12] border border-[#2B2E37] rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-[#FF4D6D]"
                  >
                    <option value="0">0% (Exempt)</option>
                    <option value="5">5% (Special Filer)</option>
                    <option value="8">8% (Standard Goods Filer)</option>
                    <option value="11">11% (Services / Turnkey)</option>
                    <option value="16">16% (Non-Filer Penalty)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
                    Sales Tax Mode (GST):
                  </label>
                  <select
                    value={gstMode}
                    onChange={(e) => setGstMode(e.target.value as any)}
                    className="w-full bg-[#0E0F12] border border-[#2B2E37] rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-[#FF4D6D]"
                  >
                    <option value="WITHOUT_GST">Without GST (0%)</option>
                    <option value="GST_18">+18% Sales Tax (GST)</option>
                    <option value="CUSTOM">Custom %</option>
                  </select>
                </div>
              </div>

              {/* Calculation Results Card */}
              <div className="bg-[#121316] border border-[#2B2E37] rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                <div className="p-4 bg-[#1A1B20] rounded-xl border border-[#282A33]">
                  <div className="text-xs text-slate-400 uppercase font-mono font-bold">Invoice Unit Price (Excl GST)</div>
                  <div className="text-2xl font-black font-mono text-white mt-1.5">
                    Rs. {new Intl.NumberFormat('en-PK').format(Math.round(invoiceUnitPriceExclTax))}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Target Net: Rs. {new Intl.NumberFormat('en-PK').format(Math.round(targetNetProceeds))}
                  </div>
                </div>

                <div className="p-4 bg-[#1A1B20] rounded-xl border border-[#282A33]">
                  <div className="text-xs text-slate-400 uppercase font-mono font-bold">Expected WHT Deduction ({whtPct}%)</div>
                  <div className="text-2xl font-black font-mono text-[#FF4D6D] mt-1.5">
                    - Rs. {new Intl.NumberFormat('en-PK').format(Math.round(clientWhtDeduction))}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Deducted at source by client</div>
                </div>

                <div className="p-4 bg-[#22C55E]/10 rounded-xl border border-[#22C55E]/30">
                  <div className="text-xs text-[#34D399] uppercase font-mono font-bold flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Guaranteed Net Bank Cash</span>
                  </div>
                  <div className="text-2xl font-black font-mono text-[#34D399] mt-1.5">
                    Rs. {new Intl.NumberFormat('en-PK').format(Math.round(netCashReceived))}
                  </div>
                  <div className="text-xs text-emerald-300 font-medium mt-1">
                    Exact {marginPct}% profit margin retained!
                  </div>
                </div>
              </div>

              {/* Formula & Rule Note */}
              <div className="p-4 bg-[#484B53] rounded-2xl text-sm text-slate-200 flex items-start space-x-3 shadow-md">
                <Info className="w-5 h-5 text-[#FF4D6D] flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-white text-base">Golden Rule of Commercial Tax Math:</div>
                  <div className="text-sm font-mono text-white font-bold">
                    UnitPrice = (BaseCost × (1 + Margin%)) ÷ (1 - WHT%)
                  </div>
                  <div className="text-xs text-slate-300 leading-relaxed">
                    Always divide by (1 - WHT%). Never multiply by (1 + WHT%). Because clients deduct withholding tax on the gross invoiced value, multiplying leaves you short on cash.
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
          <div className="max-w-4xl space-y-6 animate-in fade-in">
            <div className="bg-[#16171B] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
              <div className="border-b border-[#262830] pb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center space-x-2.5">
                  <Truck className="w-6 h-6 text-[#FF4D6D]" />
                  <span>Incoterm Landed Cost Estimator (EXW vs DDP)</span>
                </h2>
                <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
                  Calculates total delivered cost when international suppliers quote Ex-Works (EXW Factory) instead of Delivered Duty Paid (DDP).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
                    Supplier EXW (USD):
                  </label>
                  <input
                    type="number"
                    value={supplierExwUsd}
                    onChange={(e) => setSupplierExwUsd(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0E0F12] border border-[#2B2E37] rounded-xl px-4 py-3 text-base font-mono text-white focus:outline-none focus:border-[#FF4D6D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
                    USD to PKR Rate:
                  </label>
                  <input
                    type="number"
                    value={usdToPkr}
                    onChange={(e) => setUsdToPkr(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0E0F12] border border-[#2B2E37] rounded-xl px-4 py-3 text-base font-mono text-white focus:outline-none focus:border-[#FF4D6D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
                    Freight Mode:
                  </label>
                  <select
                    value={freightType}
                    onChange={(e) => setFreightType(e.target.value as any)}
                    className="w-full bg-[#0E0F12] border border-[#2B2E37] rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-[#FF4D6D]"
                  >
                    <option value="AIR">Express Air Freight (15%)</option>
                    <option value="SEA">Standard Ocean Freight (6%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
                    Customs Duty &amp; RD (%):
                  </label>
                  <input
                    type="number"
                    value={customsDutyPct}
                    onChange={(e) => setCustomsDutyPct(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0E0F12] border border-[#2B2E37] rounded-xl px-4 py-3 text-base font-mono text-white focus:outline-none focus:border-[#FF4D6D]"
                  />
                </div>
              </div>

              {/* Incoterm Breakdown Table inside Slate Pod */}
              <div className="bg-[#484B53] rounded-2xl p-5 space-y-3 font-mono text-sm shadow-lg text-white">
                <div className="flex justify-between py-2 border-b border-white/10">
                  <span className="text-slate-300 font-sans">1. Base Factory EXW (PKR Equivalent):</span>
                  <span className="text-white font-bold text-base">Rs. {new Intl.NumberFormat('en-PK').format(Math.round(exwPkr))}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/10">
                  <span className="text-slate-300 font-sans">2. International Freight ({freightType}):</span>
                  <span className="text-white font-bold text-base">+ Rs. {new Intl.NumberFormat('en-PK').format(Math.round(freightCostPkr))}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/10">
                  <span className="text-slate-300 font-sans">3. Customs Duty, Regulatory Duty &amp; Taxes:</span>
                  <span className="text-white font-bold text-base">+ Rs. {new Intl.NumberFormat('en-PK').format(Math.round(customsCostPkr))}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/10">
                  <span className="text-slate-300 font-sans">4. Port Handling &amp; Inland Logistics:</span>
                  <span className="text-white font-bold text-base">+ Rs. {new Intl.NumberFormat('en-PK').format(inlandPortClearingPkr)}</span>
                </div>
                <div className="flex justify-between py-3 text-base bg-black/40 px-4 rounded-xl border border-white/10 mt-2">
                  <span className="text-slate-200 font-bold font-sans">Estimated Landed Cost (DDP Equivalent):</span>
                  <span className="text-[#FF4D6D] font-black text-xl">Rs. {new Intl.NumberFormat('en-PK').format(Math.round(estimatedDdpLandedCostPkr))}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TOOL 3: INDUSTRIAL EQUIPMENT CROSS-REFERENCE
        ========================================================================= */}
        {activeTab === 'crossref' && (
          <div className="max-w-4xl space-y-6 animate-in fade-in">
            <div className="bg-[#16171B] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
              <div className="border-b border-[#262830] pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center space-x-2.5">
                    <ArrowRightLeft className="w-6 h-6 text-[#FF4D6D]" />
                    <span>Industrial Equipment Drop-in Cross-Reference</span>
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Direct drop-in equivalents across Siemens, Schneider Electric, and ABB when stock is unavailable.
                  </p>
                </div>
                <input
                  type="text"
                  placeholder="Search SKU or model..."
                  value={crossSearch}
                  onChange={(e) => setCrossSearch(e.target.value)}
                  className="bg-[#0E0F12] border border-[#2B2E37] rounded-full px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FF4D6D] font-mono w-full sm:w-64"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm text-left">
                  <thead>
                    <tr className="bg-[#121316] border-b border-[#262830] text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3.5 px-4">Equipment Class</th>
                      <th className="py-3.5 px-4 text-cyan-400">Siemens Sirius</th>
                      <th className="py-3.5 px-4 text-[#34D399]">Schneider TeSys</th>
                      <th className="py-3.5 px-4 text-[#FF4D6D]">ABB Control</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#23252E] font-mono">
                    {filteredCross.map((row, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.03] transition-colors">
                        <td className="py-4 px-4 font-sans font-semibold text-slate-200">
                          {row.category}
                        </td>
                        <td className="py-4 px-4 font-bold text-cyan-300 text-sm">
                          {row.siemens}
                        </td>
                        <td className="py-4 px-4 font-bold text-[#34D399] text-sm">
                          {row.schneider}
                        </td>
                        <td className="py-4 px-4 font-bold text-[#FF4D6D] text-sm">
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
