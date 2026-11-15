'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Wrench,
  Calculator,
  Truck,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  Activity,
  Zap,
  ArrowLeft,
  Search,
  ChevronRight,
  Filter,
  Check,
  Copy,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

type ToolId = 'tank' | 'pipe' | 'wht' | 'incoterm' | 'crossref' | 'motor';

function ToolsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const toolParam = searchParams.get('tool') as ToolId | null;
  const [activeTool, setActiveTool] = useState<ToolId | null>(toolParam || null);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('ALL');

  // Synchronize state with URL search params
  useEffect(() => {
    if (toolParam && ['tank', 'pipe', 'wht', 'incoterm', 'crossref', 'motor'].includes(toolParam)) {
      setActiveTool(toolParam);
    }
  }, [toolParam]);

  const selectTool = (id: ToolId) => {
    setActiveTool(id);
    router.push(`/tools?tool=${id}`, { scroll: false });
  };

  const backToMenu = () => {
    setActiveTool(null);
    router.push('/tools', { scroll: false });
  };

  // =========================================================================
  // TOOL 1: TANK VOLUME & BEVERAGE PROCESS SIZING STATE
  // =========================================================================
  const [tankDiameter, setTankDiameter] = useState<number>(2.0); // meters
  const [tankCylHeight, setTankCylHeight] = useState<number>(3.5); // meters
  const [tankConeHeight, setTankConeHeight] = useState<number>(0.6); // meters
  const [tankFillPct, setTankFillPct] = useState<number>(85); // %
  const [liquidType, setLiquidType] = useState<'WATER' | 'SYRUP' | 'CIP'>('WATER');

  const tankRadius = tankDiameter / 2;
  const cylVolM3 = Math.PI * Math.pow(tankRadius, 2) * tankCylHeight;
  const coneVolM3 = (1 / 3) * Math.PI * Math.pow(tankRadius, 2) * tankConeHeight;
  const totalTankVolM3 = cylVolM3 + coneVolM3;
  const totalTankLiters = totalTankVolM3 * 1000;
  const currentLiquidLiters = totalTankLiters * (tankFillPct / 100);
  const workingCapacityLiters = totalTankLiters * 0.9; // 10% ullage headroom
  const liquidDensityKgM3 = liquidType === 'SYRUP' ? 1280 : liquidType === 'CIP' ? 1050 : 1000;
  const liquidWeightKg = (currentLiquidLiters / 1000) * liquidDensityKgM3;
  // Estimated SS304/SS316 sheet area
  const shellSurfaceAreaM2 =
    2 * Math.PI * tankRadius * tankCylHeight +
    Math.PI * tankRadius * Math.sqrt(Math.pow(tankRadius, 2) + Math.pow(tankConeHeight, 2)) +
    Math.PI * Math.pow(tankRadius, 2);

  // =========================================================================
  // TOOL 2: PIPE FLOW RATE & VELOCITY SIZING STATE
  // =========================================================================
  const [pipeDiameterMm, setPipeDiameterMm] = useState<number>(50); // DN50 = 50mm
  const [flowRateM3H, setFlowRateM3H] = useState<number>(15); // m³/hour
  const [pipingApplication, setPipingApplication] = useState<'PROCESS' | 'CIP' | 'SUCTION'>('PROCESS');

  const pipeAreaM2 = Math.PI * Math.pow(pipeDiameterMm / 2000, 2);
  const flowRateM3S = flowRateM3H / 3600;
  const fluidVelocityMS = pipeAreaM2 > 0 ? flowRateM3S / pipeAreaM2 : 0;
  const flowLitersPerMin = (flowRateM3H * 1000) / 60;

  // Velocity status check
  const getVelocityEvaluation = (v: number) => {
    if (v < 0.5) {
      return {
        status: 'Low Velocity',
        color: 'text-amber-700 bg-amber-50 border-amber-200',
        message: 'Risk of sediment buildup in beverage syrup or food-grade lines.',
      };
    }
    if (v <= 2.2) {
      return {
        status: 'Optimal Velocity',
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        message: 'Ideal flow velocity for process lines. Low friction head loss.',
      };
    }
    if (v <= 3.0) {
      return {
        status: 'Acceptable / High',
        color: 'text-blue-700 bg-blue-50 border-blue-200',
        message: 'High flow velocity. Verify pump discharge pressure and pipe brackets.',
      };
    }
    return {
      status: 'Excessive Velocity (>3.0 m/s)',
      color: 'text-rose-700 bg-rose-50 border-rose-200',
      message: 'Severe risk of hydraulic water hammer, cavitation, and pipe erosion!',
    };
  };

  const velocityEval = getVelocityEvaluation(fluidVelocityMS);

  // =========================================================================
  // TOOL 3: WHT & GST REVERSE GROSS-UP STATE
  // =========================================================================
  const [baseCost, setBaseCost] = useState<number>(14500);
  const [marginPct, setMarginPct] = useState<number>(15);
  const [whtPct, setWhtPct] = useState<number>(8);
  const [gstMode, setGstMode] = useState<'WITHOUT_GST' | 'GST_18' | 'CUSTOM'>('GST_18');
  const [customGstPct, setCustomGstPct] = useState<number>(18);

  const targetNetProceeds = baseCost * (1 + marginPct / 100);
  const invoiceUnitPriceExclTax = targetNetProceeds / (1 - whtPct / 100);
  const gstRate = gstMode === 'GST_18' ? 0.18 : gstMode === 'CUSTOM' ? customGstPct / 100 : 0;
  const gstAmount = invoiceUnitPriceExclTax * gstRate;
  const totalGrossInvoice = invoiceUnitPriceExclTax + gstAmount;
  const clientWhtDeduction = invoiceUnitPriceExclTax * (whtPct / 100);
  const netCashReceived = invoiceUnitPriceExclTax - clientWhtDeduction;

  // =========================================================================
  // TOOL 4: INCOTERM LANDED COST ESTIMATOR STATE
  // =========================================================================
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

  // =========================================================================
  // TOOL 5: INDUSTRIAL CROSS-MATCHER MATRIX
  // =========================================================================
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
      siemens: '3RT2035-1BB40 (40A 18.5kW)',
      schneider: 'LC1D40ABD (40A 18.5kW)',
      abb: 'AF40-30-00-11 (40A 18.5kW)',
      category: 'Heavy Motor Contactor 24V DC',
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

  // =========================================================================
  // TOOL 6: MOTOR FLA & CABLE SIZER STATE
  // =========================================================================
  const [motorKw, setMotorKw] = useState<number>(11); // 11 kW motor
  const [motorPf, setMotorPf] = useState<number>(0.85); // cos phi
  const [motorEff, setMotorEff] = useState<number>(0.9); // efficiency
  const voltage = 415; // 3-phase 415V

  const motorFlaAmps = (motorKw * 1000) / (Math.sqrt(3) * voltage * motorPf * motorEff);
  const contactorRatingAmps = motorFlaAmps * 1.25;

  const getRecommendedContactor = (amps: number) => {
    const standardSizes = [9, 12, 18, 25, 32, 40, 50, 65, 80, 95, 115, 150];
    return standardSizes.find((s) => s >= amps) || 150;
  };

  const getRecommendedCableMm2 = (amps: number) => {
    if (amps <= 15) return '2.5 mm²';
    if (amps <= 25) return '4.0 mm²';
    if (amps <= 35) return '6.0 mm²';
    if (amps <= 50) return '10.0 mm²';
    if (amps <= 70) return '16.0 mm²';
    if (amps <= 95) return '25.0 mm²';
    return '35.0 mm²';
  };

  // Tools master directory
  const toolsCatalog = [
    {
      id: 'tank' as ToolId,
      title: 'Tank Volume & Capacity Sizer',
      discipline: 'PROCESS',
      badge: 'Beverage & Process Systems',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: Layers,
      iconColor: 'text-blue-600 bg-blue-50 border-blue-200',
      description: 'Calculates volume in liters & m³ for cylindrical and conical bottom tanks used in beverage, dairy, and chemical plants.',
      formula: 'V = πr²h + ⅓πr²h(cone)',
      highlights: ['Cylindrical + Conical Geometry', 'Working Capacity (10% Ullage)', 'Liquid Weight by Density'],
    },
    {
      id: 'pipe' as ToolId,
      title: 'Piping Flow & Velocity Sizer',
      discipline: 'MECHANICAL',
      badge: 'Hydraulics & Mechanical',
      badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      icon: Activity,
      iconColor: 'text-cyan-600 bg-cyan-50 border-cyan-200',
      description: 'Calculates fluid velocity in m/s for process, steam, and CIP lines with automated velocity limit checks.',
      formula: 'v = 4Q ÷ (πD²)',
      highlights: ['DN25 - DN150 Standard Sizes', 'Automated Water Hammer Warning', 'Liters/min Flow Rating'],
    },
    {
      id: 'wht' as ToolId,
      title: 'Reverse WHT & GST Gross-Up',
      discipline: 'COMMERCIAL',
      badge: 'Commercial Tax Math',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: Calculator,
      iconColor: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      description: 'Eliminates margin erosion from corporate tax deductions in Pakistan. Scales the invoice unit price so net bank cash equals profit target.',
      formula: 'Price = TargetNet ÷ (1 - WHT%)',
      highlights: ['Guaranteed Net Cash', 'FBR Standard Goods (8%)', 'Sales Tax Invoice (+18% GST)'],
    },
    {
      id: 'incoterm' as ToolId,
      title: 'Incoterm Landed Cost Estimator',
      discipline: 'COMMERCIAL',
      badge: 'Import Logistics',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      icon: Truck,
      iconColor: 'text-amber-600 bg-amber-50 border-amber-200',
      description: 'Calculates total delivered cost when international suppliers quote Ex-Works (EXW) instead of Delivered Duty Paid (DDP).',
      formula: 'EXW(USD) → Landed DDP(PKR)',
      highlights: ['Air vs Ocean Freight', 'Customs Duty & RD Breakdown', 'Port Clearing & Transport'],
    },
    {
      id: 'crossref' as ToolId,
      title: 'Switchgear Drop-in Cross-Ref',
      discipline: 'AUTOMATION',
      badge: 'Industrial Automation',
      badgeColor: 'bg-rose-50 text-[#FF4D6D] border-rose-200',
      icon: ArrowRightLeft,
      iconColor: 'text-[#FF4D6D] bg-rose-50 border-rose-200',
      description: 'Direct drop-in equivalents across Siemens SIRIUS, Schneider TeSys, and ABB Control for contactors, relays, and PLCs.',
      formula: 'Siemens ↔ Schneider ↔ ABB',
      highlights: ['24V DC / 220V AC Relays', '3-Pole Power Contactors', 'Compact PLCs'],
    },
    {
      id: 'motor' as ToolId,
      title: 'Motor FLA & Cable Sizer',
      discipline: 'ELECTRICAL',
      badge: 'Electrical Engineering',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      icon: Zap,
      iconColor: 'text-purple-600 bg-purple-50 border-purple-200',
      description: 'Calculates full load current (FLA), contactor ampere rating, and minimum copper cable cross-section for 3-phase induction motors.',
      formula: 'I = P ÷ (√3 × V × cosφ × η)',
      highlights: ['Full Load Current (FLA)', 'Contactor AC-3 Match', 'Thermal Overload Setting'],
    },
  ];

  const filteredCatalog = toolsCatalog.filter((t) => {
    const matchesDiscipline = selectedDiscipline === 'ALL' || t.discipline === selectedDiscipline;
    const matchesSearch =
      t.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.description.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.badge.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesDiscipline && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden text-slate-900 select-none">
      {/* =========================================================================
          VIEW A: FOCUSED TOOL WORKSPACE (When a card is active)
      ========================================================================= */}
      {activeTool ? (
        <div className="flex-1 flex flex-col h-full overflow-hidden animate-in fade-in">
          {/* Top Back Navigation Bar */}
          <div className="bg-white border border-slate-200/80 rounded-2xl px-5 py-3.5 mb-4 flex items-center justify-between flex-shrink-0 shadow-xs">
            <div className="flex items-center space-x-3">
              <button
                onClick={backToMenu}
                className="px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer border border-slate-200 active:scale-95"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>← Back to All Tools</span>
              </button>

              <div className="h-5 w-px bg-slate-200 hidden sm:block"></div>

              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm sm:text-base text-slate-900">
                  {toolsCatalog.find((t) => t.id === activeTool)?.title}
                </span>
                <span
                  className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border hidden sm:inline-block ${
                    toolsCatalog.find((t) => t.id === activeTool)?.badgeColor
                  }`}
                >
                  {toolsCatalog.find((t) => t.id === activeTool)?.badge}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 font-mono hidden md:inline">
                {toolsCatalog.find((t) => t.id === activeTool)?.formula}
              </span>
            </div>
          </div>

          {/* Focused Tool Canvas */}
          <div className="flex-1 overflow-y-auto space-y-6 pr-1">
            {/* -------------------------------------------------------------
                TOOL 1: TANK VOLUME & BEVERAGE PROCESS SIZING
            ------------------------------------------------------------- */}
            {activeTool === 'tank' && (
              <div className="max-w-4xl space-y-6">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center space-x-2.5">
                      <Layers className="w-6 h-6 text-blue-600" />
                      <span>Tank Volume &amp; Capacity Sizer (Beverage &amp; Dairy Systems)</span>
                    </h2>
                    <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                      Computes total geometric volume, working capacity, and liquid weight for vertical cylindrical tanks with conical bottom drainage.
                    </p>
                  </div>

                  {/* Preset Buttons */}
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-400 font-bold">Standard Presets:</span>
                    {[
                      { name: '5,000L Syrup Tank', d: 1.6, hCyl: 2.6, hCone: 0.5 },
                      { name: '10,000L CIP Caustic Tank', d: 2.2, hCyl: 2.8, hCone: 0.6 },
                      { name: '25,000L Storage Silo', d: 2.8, hCyl: 4.2, hCone: 0.8 },
                    ].map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setTankDiameter(p.d);
                          setTankCylHeight(p.hCyl);
                          setTankConeHeight(p.hCone);
                        }}
                        className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>

                  {/* Inputs Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                        Internal Diameter (m):
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        value={tankDiameter}
                        onChange={(e) => setTankDiameter(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-base font-mono text-slate-900 focus:outline-none focus:border-[#FF4D6D] focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                        Cylinder Height (m):
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={tankCylHeight}
                        onChange={(e) => setTankCylHeight(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-base font-mono text-slate-900 focus:outline-none focus:border-[#FF4D6D] focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                        Bottom Cone Height (m):
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        value={tankConeHeight}
                        onChange={(e) => setTankConeHeight(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-base font-mono text-slate-900 focus:outline-none focus:border-[#FF4D6D] focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                        Process Fluid:
                      </label>
                      <select
                        value={liquidType}
                        onChange={(e) => setLiquidType(e.target.value as any)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-900 focus:outline-none focus:border-[#FF4D6D] focus:bg-white"
                      >
                        <option value="WATER">Water / Beverage (1000 kg/m³)</option>
                        <option value="SYRUP">Sugar Syrup 65° Brix (1280 kg/m³)</option>
                        <option value="CIP">CIP Caustic Solution (1050 kg/m³)</option>
                      </select>
                    </div>
                  </div>

                  {/* Calculated Results Breakdown */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
                      <div className="text-[11px] text-slate-500 uppercase font-mono font-bold">Total Tank Volume</div>
                      <div className="text-2xl font-black font-mono text-slate-900 mt-1">
                        {Math.round(totalTankLiters).toLocaleString()} L
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{totalTankVolM3.toFixed(2)} m³</div>
                    </div>

                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 shadow-2xs">
                      <div className="text-[11px] text-emerald-800 uppercase font-mono font-bold">Working Capacity (90%)</div>
                      <div className="text-2xl font-black font-mono text-emerald-700 mt-1">
                        {Math.round(workingCapacityLiters).toLocaleString()} L
                      </div>
                      <div className="text-xs text-emerald-600 mt-0.5">Includes 10% headspace / ullage</div>
                    </div>

                    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
                      <div className="text-[11px] text-slate-500 uppercase font-mono font-bold">Estimated Full Weight</div>
                      <div className="text-2xl font-black font-mono text-slate-900 mt-1">
                        {Math.round(liquidWeightKg).toLocaleString()} kg
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{(liquidWeightKg / 1000).toFixed(1)} Metric Tons (Liquid)</div>
                    </div>

                    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
                      <div className="text-[11px] text-slate-500 uppercase font-mono font-bold">SS Sheet Surface Area</div>
                      <div className="text-2xl font-black font-mono text-slate-900 mt-1">
                        {shellSurfaceAreaM2.toFixed(1)} m²
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">Shell + Top &amp; Bottom Cone</div>
                    </div>
                  </div>

                  {/* Formula Note */}
                  <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl text-sm text-blue-950 flex items-start space-x-3">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-bold text-blue-950 text-sm">Industrial Geometry Formulation:</div>
                      <div className="text-xs font-mono text-blue-900">
                        V_total = (π × R² × H_cyl) + (⅓ × π × R² × H_cone)
                      </div>
                      <p className="text-xs text-blue-800 leading-relaxed">
                        Conical bottoms ensure 100% complete clean-in-place (CIP) drainage without liquid puddling.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* -------------------------------------------------------------
                TOOL 2: PIPING FLOW & VELOCITY SIZING
            ------------------------------------------------------------- */}
            {activeTool === 'pipe' && (
              <div className="max-w-4xl space-y-6">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center space-x-2.5">
                      <Activity className="w-6 h-6 text-cyan-600" />
                      <span>Piping Flow Rate &amp; Fluid Velocity Sizer</span>
                    </h2>
                    <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                      Sizes beverage process and CIP lines. Analyzes fluid velocity (m/s) to prevent hydraulic water hammer and pump cavitation.
                    </p>
                  </div>

                  {/* Inputs Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                        Standard Stainless Tube (DN / ID mm):
                      </label>
                      <select
                        value={pipeDiameterMm}
                        onChange={(e) => setPipeDiameterMm(parseFloat(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-900 focus:outline-none focus:border-[#FF4D6D] focus:bg-white"
                      >
                        <option value="25">DN25 (1&quot; - ID: 25 mm)</option>
                        <option value="38">DN40 (1.5&quot; - ID: 38 mm)</option>
                        <option value="50">DN50 (2&quot; - ID: 50 mm)</option>
                        <option value="63">DN65 (2.5&quot; - ID: 63 mm)</option>
                        <option value="76">DN80 (3&quot; - ID: 76 mm)</option>
                        <option value="101">DN100 (4&quot; - ID: 101 mm)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                        Flow Rate (m³/hour):
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={flowRateM3H}
                        onChange={(e) => setFlowRateM3H(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-base font-mono text-slate-900 focus:outline-none focus:border-[#FF4D6D] focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                        Piping Duty / Application:
                      </label>
                      <select
                        value={pipingApplication}
                        onChange={(e) => setPipingApplication(e.target.value as any)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-900 focus:outline-none focus:border-[#FF4D6D] focus:bg-white"
                      >
                        <option value="PROCESS">Product Process Line (Max 2.0 m/s)</option>
                        <option value="CIP">CIP Cleaning Loop (1.5 - 2.5 m/s)</option>
                        <option value="SUCTION">Pump Suction Line (Max 1.2 m/s)</option>
                      </select>
                    </div>
                  </div>

                  {/* Calculated Velocity Results */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
                      <div className="text-[11px] text-slate-500 uppercase font-mono font-bold">Fluid Velocity</div>
                      <div className="text-3xl font-black font-mono text-slate-900 mt-1">
                        {fluidVelocityMS.toFixed(2)} m/s
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{(fluidVelocityMS * 3.28084).toFixed(2)} ft/s</div>
                    </div>

                    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
                      <div className="text-[11px] text-slate-500 uppercase font-mono font-bold">Volumetric Flow</div>
                      <div className="text-2xl font-black font-mono text-cyan-700 mt-1">
                        {Math.round(flowLitersPerMin)} L/min
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{flowRateM3H} m³/hr • {Math.round(flowLitersPerMin * 0.264172)} GPM</div>
                    </div>

                    <div className={`p-4 rounded-xl border shadow-2xs ${velocityEval.color}`}>
                      <div className="text-[11px] uppercase font-mono font-bold">Safety Verification</div>
                      <div className="text-base font-bold mt-1">{velocityEval.status}</div>
                      <div className="text-xs mt-1 leading-snug">{velocityEval.message}</div>
                    </div>
                  </div>

                  {/* Velocity Design Guidelines */}
                  <div className="p-4 bg-cyan-50/80 border border-cyan-200 rounded-xl text-xs text-cyan-950 space-y-1">
                    <div className="font-bold text-sm">Industrial Design Limits:</div>
                    <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-cyan-900">
                      <li><strong>Beverage / Syrup Lines:</strong> 1.2 to 2.0 m/s recommended to minimize shear degradation.</li>
                      <li><strong>CIP Cleaning Return:</strong> 1.5 to 2.2 m/s required for turbulent wall scrub action.</li>
                      <li><strong>Pump Suction Header:</strong> Must not exceed 1.2 m/s to prevent pump NPSH cavitation.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* -------------------------------------------------------------
                TOOL 3: REVERSE WHT & GST GROSS-UP
            ------------------------------------------------------------- */}
            {activeTool === 'wht' && (
              <div className="max-w-4xl space-y-6">
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

            {/* -------------------------------------------------------------
                TOOL 4: INCOTERM LANDED COST ESTIMATOR
            ------------------------------------------------------------- */}
            {activeTool === 'incoterm' && (
              <div className="max-w-4xl space-y-6">
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

            {/* -------------------------------------------------------------
                TOOL 5: INDUSTRIAL EQUIPMENT CROSS-REFERENCE
            ------------------------------------------------------------- */}
            {activeTool === 'crossref' && (
              <div className="max-w-4xl space-y-6">
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

            {/* -------------------------------------------------------------
                TOOL 6: MOTOR FLA & CABLE SIZER
            ------------------------------------------------------------- */}
            {activeTool === 'motor' && (
              <div className="max-w-4xl space-y-6">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center space-x-2.5">
                      <Zap className="w-6 h-6 text-purple-600" />
                      <span>3-Phase Induction Motor FLA &amp; Cable Sizer</span>
                    </h2>
                    <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                      Calculates full load current (FLA), contactor ampere rating, thermal overload protection, and copper cable cross-section for 415V motors.
                    </p>
                  </div>

                  {/* Inputs Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                        Motor Rating:
                      </label>
                      <select
                        value={motorKw}
                        onChange={(e) => setMotorKw(parseFloat(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-900 focus:outline-none focus:border-[#FF4D6D] focus:bg-white"
                      >
                        <option value="2.2">2.2 kW (3.0 HP)</option>
                        <option value="4.0">4.0 kW (5.5 HP)</option>
                        <option value="5.5">5.5 kW (7.5 HP)</option>
                        <option value="7.5">7.5 kW (10.0 HP)</option>
                        <option value="11.0">11.0 kW (15.0 HP)</option>
                        <option value="15.0">15.0 kW (20.0 HP)</option>
                        <option value="22.0">22.0 kW (30.0 HP)</option>
                        <option value="30.0">30.0 kW (40.0 HP)</option>
                        <option value="45.0">45.0 kW (60.0 HP)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                        Power Factor (cos φ):
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={motorPf}
                        onChange={(e) => setMotorPf(parseFloat(e.target.value) || 0.85)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-base font-mono text-slate-900 focus:outline-none focus:border-[#FF4D6D] focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                        Motor Efficiency (η):
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={motorEff}
                        onChange={(e) => setMotorEff(parseFloat(e.target.value) || 0.9)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-base font-mono text-slate-900 focus:outline-none focus:border-[#FF4D6D] focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Calculated Results */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
                      <div className="text-[11px] text-slate-500 uppercase font-mono font-bold">Full Load Amps (FLA)</div>
                      <div className="text-3xl font-black font-mono text-slate-900 mt-1">
                        {motorFlaAmps.toFixed(1)} A
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">At 415V 3-Phase 50Hz</div>
                    </div>

                    <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 shadow-2xs">
                      <div className="text-[11px] text-purple-800 uppercase font-mono font-bold">Recommended Contactor</div>
                      <div className="text-2xl font-black font-mono text-purple-700 mt-1">
                        {getRecommendedContactor(contactorRatingAmps)} A (AC-3)
                      </div>
                      <div className="text-xs text-purple-600 mt-0.5">125% starting safety margin</div>
                    </div>

                    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
                      <div className="text-[11px] text-slate-500 uppercase font-mono font-bold">Thermal Overload Range</div>
                      <div className="text-xl font-black font-mono text-slate-900 mt-1">
                        {(motorFlaAmps * 0.9).toFixed(1)} - {(motorFlaAmps * 1.15).toFixed(1)} A
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">Set dial to exactly {motorFlaAmps.toFixed(1)}A</div>
                    </div>

                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 shadow-2xs">
                      <div className="text-[11px] text-emerald-800 uppercase font-mono font-bold">Minimum Copper Cable</div>
                      <div className="text-2xl font-black font-mono text-emerald-700 mt-1">
                        {getRecommendedCableMm2(motorFlaAmps)}
                      </div>
                      <div className="text-xs text-emerald-600 mt-0.5">3-Core / 4-Core XLPE/PVC</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* =========================================================================
            VIEW B: MAIN TOOL SELECTION MENU (Card Grid Catalog)
        ========================================================================= */
        <div className="flex-1 flex flex-col h-full overflow-hidden space-y-4">
          {/* Header & Filter Controls */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs flex-shrink-0">
            <div>
              <div className="flex items-center space-x-2">
                <Wrench className="w-5 h-5 text-[#FF4D6D]" />
                <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                  Engineering Tools Suite
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Select an engineering calculator below to open into focused workspace mode.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search tools or formulas..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-full pl-9 pr-4 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#FF4D6D] focus:bg-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Discipline Category Filter Chips */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 flex-shrink-0">
            {[
              { id: 'ALL', label: 'All Tools (6)' },
              { id: 'PROCESS', label: 'Beverage & Process (1)' },
              { id: 'MECHANICAL', label: 'Hydraulics & Piping (1)' },
              { id: 'COMMERCIAL', label: 'Tax & Logistics (2)' },
              { id: 'AUTOMATION', label: 'Switchgear & Automation (1)' },
              { id: 'ELECTRICAL', label: 'Electrical & Motors (1)' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedDiscipline(f.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedDiscipline === f.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Catalog Cards Grid */}
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
              {filteredCatalog.map((tool) => {
                const Icon = tool.icon;
                return (
                  <div
                    key={tool.id}
                    onClick={() => selectTool(tool.id)}
                    className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs hover:shadow-md hover:border-[#FF4D6D]/60 transition-all cursor-pointer flex flex-col justify-between group active:scale-[0.99]"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shadow-2xs ${tool.iconColor}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${tool.badgeColor}`}>
                          {tool.badge}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 group-hover:text-[#FF4D6D] transition-colors leading-snug">
                        {tool.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                        {tool.description}
                      </p>

                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                        <span className="text-[11px] font-mono text-slate-400 font-bold block">
                          Formula: {tool.formula}
                        </span>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {tool.highlights.map((h, i) => (
                            <span key={i} className="text-[10px] bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md font-medium">
                              ✓ {h}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-medium">
                        Click card to launch
                      </span>
                      <span className="text-xs font-bold text-slate-900 group-hover:text-[#FF4D6D] flex items-center space-x-1.5 transition-colors">
                        <span>Open Tool</span>
                        <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EngineeringToolsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center bg-transparent text-slate-400 font-mono text-xs">
          Loading Engineering Tools...
        </div>
      }
    >
      <ToolsContent />
    </Suspense>
  );
}