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
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden text-slate-900 select-none">
      {/* Tab Switcher Header */}
      <div className="flex items-center justify-between pb-4 flex-shrink-0">
        <div className="flex bg-white p-1 rounded-full border border-slate-200/80 shadow-xs">
          <button
            onClick={() => setActiveTab('wht')}
            className={`px-4 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'wht'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calculator className="w-4 h-4 text-[#FF4D6D]" />
            <span>WHT &amp; GST Gross-Up</span>
          </button>
          <button
            onClick={() => setActiveTab('incoterm')}
            className={`px-4 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'incoterm'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Truck className="w-4 h-4 text-[#FF4D6D]" />
            <span>Incoterm Estimator</span>
          </button>
          <button
            onClick={() => setActiveTab('crossref')}
            className={`px-4 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'crossref'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4 text-[#FF4D6D]" />
            <span>SKU Cross-Reference</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Area */}
      <main className="flex-1 overflow-y-auto space-y-6 pr-1">
        {/* =========================================================================
            TOOL 1: WHT & GST REVERSE GROSS-UP CALCULATOR
        ========================================================================= */}
        {activeTab === 'wht' && (
          <div className="max-w-4xl space-y-6 animate-in fade-in">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center space-x-2.5">
                  <Calculator className="w-6 h-6 text-[#FF4D6D]" />
                  <span>Reverse Gross-Up Calculator (Withholding Tax Protection)</span>
                </h2>
                <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                  Eliminates margin erosion from corporate tax deductions in Pakistan. Scales the invoice unit price so net cash received in bank equals 100% of profit target.
                </p>
              </div>

              {/* Inputs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                    Base Cost (Supplier PKR):
                  </label>
                  <input
                    type="number"
                    value={baseCost}
                    onChange={(e) => setBaseCost(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-base font-mono text-slate-900 focus:outline-none focus:border-[#FF4D6D] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                    Target Margin (%):
                  </label>
                  <input
                    type="number"
                    value={marginPct}
                    onChange={(e) => setMarginPct(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-base font-mono text-slate-900 focus:outline-none focus:border-[#FF4D6D] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                    Client WHT Deduction (%):
                  </label>
                  <select
                    value={whtPct}
                    onChange={(e) => setWhtPct(parseFloat(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-900 focus:outline-none focus:border-[#FF4D6D] focus:bg-white"
                  >
                    <option value="0">0% (Exempt)</option>
                    <option value="5">5% (Special Filer)</option>
                    <option value="8">8% (Standard Goods Filer)</option>
                    <option value="11">11% (Services / Turnkey)</option>
                    <option value="16">16% (Non-Filer Penalty)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                    Sales Tax Mode (GST):
                  </label>
                  <select
                    value={gstMode}
                    onChange={(e) => setGstMode(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-900 focus:outline-none focus:border-[#FF4D6D] focus:bg-white"
                  >
                    <option value="WITHOUT_GST">Without GST (0%)</option>
                    <option value="GST_18">+18% Sales Tax (GST)</option>
                    <option value="CUSTOM">Custom %</option>
                  </select>
                </div>
              </div>

              {/* Calculation Results Card */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-xs text-slate-500 uppercase font-mono font-bold">Invoice Unit Price (Excl GST)</div>
                  <div className="text-2xl font-black font-mono text-slate-900 mt-1.5">
                    Rs. {new Intl.NumberFormat('en-PK').format(Math.round(invoiceUnitPriceExclTax))}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Target Net: Rs. {new Intl.NumberFormat('en-PK').format(Math.round(targetNetProceeds))}
                  </div>
                </div>

                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-xs text-slate-500 uppercase font-mono font-bold">Expected WHT Deduction ({whtPct}%)</div>
                  <div className="text-2xl font-black font-mono text-[#FF4D6D] mt-1.5">
                    - Rs. {new Intl.NumberFormat('en-PK').format(Math.round(clientWhtDeduction))}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Deducted at source by client</div>
                </div>

                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 shadow-2xs">
                  <div className="text-xs text-emerald-800 uppercase font-mono font-bold flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Guaranteed Net Bank Cash</span>
                  </div>
                  <div className="text-2xl font-black font-mono text-emerald-700 mt-1.5">
                    Rs. {new Intl.NumberFormat('en-PK').format(Math.round(netCashReceived))}
                  </div>
                  <div className="text-xs text-emerald-600 font-semibold mt-1">
                    Exact {marginPct}% profit margin retained!
                  </div>
                </div>
              </div>

              {/* Formula & Rule Note */}
              <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl text-sm text-amber-950 flex items-start space-x-3">
                <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-amber-950 text-base">Golden Rule of Commercial Tax Math:</div>
                  <div className="text-sm font-mono text-amber-900 font-bold">
                    UnitPrice = (BaseCost × (1 + Margin%)) ÷ (1 - WHT%)
                  </div>
                  <div className="text-xs text-amber-800 leading-relaxed">
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
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center space-x-2.5">
                  <Truck className="w-6 h-6 text-[#FF4D6D]" />
                  <span>Incoterm Landed Cost Estimator (EXW vs DDP)</span>
                </h2>
                <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                  Calculates total delivered cost when international suppliers quote Ex-Works (EXW Factory) instead of Delivered Duty Paid (DDP).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                    Supplier EXW (USD):
                  </label>
                  <input
                    type="number"
                    value={supplierExwUsd}
                    onChange={(e) => setSupplierExwUsd(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-base font-mono text-slate-900 focus:outline-none focus:border-[#FF4D6D] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                    USD to PKR Rate:
                  </label>
                  <input
                    type="number"
                    value={usdToPkr}
                    onChange={(e) => setUsdToPkr(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-base font-mono text-slate-900 focus:outline-none focus:border-[#FF4D6D] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                    Freight Mode:
                  </label>
                  <select
                    value={freightType}
                    onChange={(e) => setFreightType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-900 focus:outline-none focus:border-[#FF4D6D] focus:bg-white"
                  >
                    <option value="AIR">Express Air Freight (15%)</option>
                    <option value="SEA">Standard Ocean Freight (6%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                    Customs Duty &amp; RD (%):
                  </label>
                  <input
                    type="number"
                    value={customsDutyPct}
                    onChange={(e) => setCustomsDutyPct(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-base font-mono text-slate-900 focus:outline-none focus:border-[#FF4D6D] focus:bg-white"
                  />
                </div>
              </div>

              {/* Incoterm Breakdown Table */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-3 font-mono text-sm shadow-2xs text-slate-900">
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-600 font-sans">1. Base Factory EXW (PKR Equivalent):</span>
                  <span className="text-slate-900 font-bold text-base">Rs. {new Intl.NumberFormat('en-PK').format(Math.round(exwPkr))}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-600 font-sans">2. International Freight ({freightType}):</span>
                  <span className="text-slate-900 font-bold text-base">+ Rs. {new Intl.NumberFormat('en-PK').format(Math.round(freightCostPkr))}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-600 font-sans">3. Customs Duty, Regulatory Duty &amp; Taxes:</span>
                  <span className="text-slate-900 font-bold text-base">+ Rs. {new Intl.NumberFormat('en-PK').format(Math.round(customsCostPkr))}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-600 font-sans">4. Port Handling &amp; Inland Logistics:</span>
                  <span className="text-slate-900 font-bold text-base">+ Rs. {new Intl.NumberFormat('en-PK').format(inlandPortClearingPkr)}</span>
                </div>
                <div className="flex justify-between py-3 text-base bg-white px-4 rounded-xl border border-slate-200 mt-2 shadow-2xs">
                  <span className="text-slate-700 font-bold font-sans">Estimated Landed Cost (DDP Equivalent):</span>
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
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center space-x-2.5">
                    <ArrowRightLeft className="w-6 h-6 text-[#FF4D6D]" />
                    <span>Industrial Equipment Drop-in Cross-Reference</span>
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Direct drop-in equivalents across Siemens, Schneider Electric, and ABB when stock is unavailable.
                  </p>
                </div>
                <input
                  type="text"
                  placeholder="Search SKU or model..."
                  value={crossSearch}
                  onChange={(e) => setCrossSearch(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#FF4D6D] focus:bg-white font-mono w-full sm:w-64"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200/80 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Equipment Class</th>
                      <th className="py-3 px-4 text-cyan-700">Siemens Sirius</th>
                      <th className="py-3 px-4 text-emerald-700">Schneider TeSys</th>
                      <th className="py-3 px-4 text-[#FF4D6D]">ABB Control</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {filteredCross.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-sans font-semibold text-slate-800">
                          {row.category}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-cyan-700 text-sm">
                          {row.siemens}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-emerald-700 text-sm">
                          {row.schneider}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#FF4D6D] text-sm">
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
