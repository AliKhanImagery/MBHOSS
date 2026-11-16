'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useHideTopBar } from '@/components/ChromeContext';
import {
  Wrench, Calculator, Truck, ArrowRightLeft, CheckCircle2,
  AlertTriangle, Info, Layers, Activity, Zap, ArrowLeft,
  Search, ChevronRight, Thermometer, Hammer, ShieldCheck, DollarSign, Scale,
} from 'lucide-react';

type ToolId = 'tank' | 'pipe' | 'wht' | 'incoterm' | 'crossref' | 'motor';

// ─── Reusable Slider Component ───────────────────────────────────────────────
interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  note?: string;
  color?: string;
  onChange: (v: number) => void;
  formatValue?: (v: number) => string;
}

function SliderRow({ label, value, min, max, step, unit, note, onChange, formatValue }: SliderRowProps) {
  const pct = ((value - min) / (max - min)) * 100;
  const display = formatValue ? formatValue(value) : value.toString();
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-slate-900 uppercase tracking-wider">{label}</span>
        <span className="text-sm font-black font-mono text-slate-950 bg-slate-100 px-3 py-1 rounded-lg border border-slate-300 shadow-2xs">
          {display} <span className="text-slate-700 font-bold">{unit}</span>
        </span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-2.5 rounded-full appearance-none cursor-pointer accent-[#FF4D6D] bg-slate-200"
          style={{
            background: `linear-gradient(to right, #FF4D6D 0%, #FF4D6D ${pct}%, #cbd5e1 ${pct}%, #cbd5e1 100%)`,
          }}
        />
        <div className="flex justify-between mt-1">
          <span className="text-[11px] text-slate-700 font-bold font-mono">{min}{unit}</span>
          <span className="text-[11px] text-slate-700 font-bold font-mono">{max}{unit}</span>
        </div>
      </div>
      {note && <p className="text-xs text-slate-700 font-medium leading-tight">{note}</p>}
    </div>
  );
}

// ─── Pill Toggle Group ────────────────────────────────────────────────────────
interface PillOption { label: string; value: string | number; sub?: string; }
interface PillGroupProps { options: PillOption[]; value: string | number; onChange: (v: string | number) => void; }
function PillGroup({ options, value, onChange }: PillGroupProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={String(o.value)}
          onClick={() => onChange(o.value)}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all border cursor-pointer ${
            value === o.value
              ? 'bg-slate-950 text-white border-slate-950 shadow-sm'
              : 'bg-white text-slate-800 border-slate-300 hover:border-slate-500 font-semibold'
          }`}
        >
          {o.label}
          {o.sub && <span className={`ml-1 text-[11px] font-bold ${value === o.value ? 'text-slate-300' : 'text-slate-600'}`}>{o.sub}</span>}
        </button>
      ))}
    </div>
  );
}

// ─── Result Stat Card ─────────────────────────────────────────────────────────
interface StatCardProps { label: string; value: string; sub?: string; accent?: 'green' | 'red' | 'purple' | 'blue' | 'amber' | 'default'; }
function StatCard({ label, value, sub, accent = 'default' }: StatCardProps) {
  const colors = {
    default: 'bg-white border-slate-300 text-slate-950',
    green: 'bg-emerald-50 border-emerald-300 text-emerald-900',
    red: 'bg-rose-50 border-rose-300 text-[#FF4D6D]',
    purple: 'bg-purple-50 border-purple-300 text-purple-900',
    blue: 'bg-blue-50 border-blue-300 text-blue-900',
    amber: 'bg-amber-50 border-amber-300 text-amber-900',
  };
  return (
    <div className={`p-2.5 sm:p-3 rounded-xl border shadow-2xs ${colors[accent]}`}>
      <div className="text-[11px] uppercase font-mono font-black text-slate-700">{label}</div>
      <div className="text-lg sm:text-xl font-black font-mono mt-1 leading-none text-slate-950 truncate">{value}</div>
      {sub && <div className="text-[11px] mt-1 font-bold text-slate-700 leading-snug">{sub}</div>}
    </div>
  );
}

// ─── Engineering Note Card ────────────────────────────────────────────────────
interface NoteCardProps { icon?: React.ReactNode; title: string; children: React.ReactNode; color?: string; }
function NoteCard({ icon, title, children, color = 'bg-blue-50/80 border-blue-200 text-blue-950' }: NoteCardProps) {
  return (
    <div className={`p-4 border rounded-xl ${color}`}>
      <div className="flex items-start space-x-3">
        {icon && <div className="flex-shrink-0 mt-0.5">{icon}</div>}
        <div className="space-y-1.5 text-sm">
          <div className="font-bold text-base">{title}</div>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Instant 2D CAD Mechanical Tank Diagram ─────────────────────────────────
export type TankStyle = 'CONICAL' | 'TORISPHERICAL' | 'SLOPED_FLAT';
export type TankMaterial = 'SS_316L' | 'SS_304' | 'CARBON_STEEL' | 'DUPLEX_2205';

interface TankCadDiagramProps {
  diameter: number;
  cylHeight: number;
  coneHeight: number;
  legHeight: number;
  fillPct: number;
  liquidType: 'WATER' | 'SYRUP' | 'CIP' | 'ALCOHOL';
  liquidLiters: number;
  totalLiters: number;
  workingCapacityLiters: number;
  liquidWeightKg: number;
  tankStyle: TankStyle;
  materialType: TankMaterial;
  plateThicknessMm: number;
  drySteelKg: number;
  estTankPricePkr: number;
}

function TankCadDiagram({
  diameter,
  cylHeight,
  coneHeight,
  legHeight,
  fillPct,
  liquidType,
  liquidLiters,
  totalLiters,
  workingCapacityLiters,
  liquidWeightKg,
  tankStyle,
  materialType,
  plateThicknessMm,
  drySteelKg,
  estTankPricePkr,
}: TankCadDiagramProps) {
  // SVG Canvas: 520 wide, 540 tall (High-Definition CAD Layout)
  const centerX = 235;
  const availH = 360;
  const availW = 250;

  const totalH = Math.max(cylHeight + coneHeight + legHeight, 0.8);
  const scaleH = availH / (totalH + 0.35);
  const scaleW = availW / Math.max(diameter, 0.8);
  const scale = Math.min(scaleH, scaleW);

  const tankW = Math.max(diameter * scale, 90);
  const cylHPx = Math.max(cylHeight * scale, 45);
  const dishHPx = Math.min(tankW * 0.14, 26);
  const coneHPx = tankStyle === 'CONICAL' ? Math.max(coneHeight * scale, 15) : tankStyle === 'TORISPHERICAL' ? dishHPx * 1.5 : 22;
  const legHPx = Math.max(legHeight * scale, 24);

  const tankTotalVisualH = cylHPx + coneHPx + legHPx + dishHPx;
  const baseFloorY = 462;
  const verticalSlack = Math.max(0, availH - tankTotalVisualH);
  const floorY = baseFloorY - verticalSlack * 0.42;

  const coneBottomY = floorY - legHPx;
  const cylBottomY = coneBottomY - coneHPx;
  const cylTopY = cylBottomY - cylHPx;
  const topY = cylTopY - dishHPx;
  const leftX = centerX - tankW / 2;
  const rightX = centerX + tankW / 2;

  // Liquid Math
  const radius = diameter / 2;
  const cylVol = Math.PI * radius * radius * cylHeight;
  const coneVol = tankStyle === 'CONICAL' ? (1 / 3) * Math.PI * radius * radius * coneHeight : (0.0847 * diameter ** 3);
  const totalVol = cylVol + coneVol;
  const currentLiqVol = totalVol * (fillPct / 100);

  let liquidTopY = cylBottomY;
  let liquidPath = '';

  if (fillPct > 0) {
    if (currentLiqVol <= coneVol && coneVol > 0) {
      const coneHeightRatio = Math.cbrt(Math.max(currentLiqVol / coneVol, 0.001));
      const liqConeH = coneHPx * coneHeightRatio;
      liquidTopY = coneBottomY - liqConeH;
      const liqHalfW = (tankW / 2) * (liqConeH / Math.max(coneHPx, 1));
      const liqLeftX = centerX - liqHalfW;
      const liqRightX = centerX + liqHalfW;
      if (tankStyle === 'CONICAL') {
        liquidPath = `M ${centerX - 12} ${coneBottomY} L ${liqLeftX} ${liquidTopY} Q ${centerX} ${liquidTopY - 2} ${liqRightX} ${liquidTopY} L ${centerX + 12} ${coneBottomY} Z`;
      } else if (tankStyle === 'TORISPHERICAL') {
        liquidPath = `M ${leftX} ${liquidTopY} Q ${centerX} ${coneBottomY} ${rightX} ${liquidTopY} Z`;
      } else {
        liquidPath = `M ${leftX} ${liquidTopY} L ${rightX} ${liquidTopY} L ${rightX} ${coneBottomY} L ${leftX} ${cylBottomY} Z`;
      }
    } else {
      const remVol = Math.max(currentLiqVol - coneVol, 0);
      const cylFrac = cylVol > 0 ? Math.min(remVol / cylVol, 1) : 0;
      const liqCylH = cylHPx * cylFrac;
      liquidTopY = cylBottomY - liqCylH;

      if (tankStyle === 'CONICAL') {
        liquidPath = `M ${leftX} ${liquidTopY} Q ${centerX} ${liquidTopY - 3} ${rightX} ${liquidTopY} L ${rightX} ${cylBottomY} L ${centerX + 12} ${coneBottomY} L ${centerX - 12} ${coneBottomY} L ${leftX} ${cylBottomY} Z`;
      } else if (tankStyle === 'TORISPHERICAL') {
        liquidPath = `M ${leftX} ${liquidTopY} Q ${centerX} ${liquidTopY - 3} ${rightX} ${liquidTopY} L ${rightX} ${cylBottomY} Q ${centerX} ${cylBottomY + coneHPx * 1.8} ${leftX} ${cylBottomY} Z`;
      } else {
        liquidPath = `M ${leftX} ${liquidTopY} Q ${centerX} ${liquidTopY - 3} ${rightX} ${liquidTopY} L ${rightX} ${cylBottomY + 22} L ${leftX} ${cylBottomY} Z`;
      }
    }
  }

  const FLUID_CONFIG = {
    WATER: {
      gradStart: '#38BDF8',
      gradEnd: '#0284C7',
      label: 'Water / Aqueous',
      tag: 'ρ = 1,000 kg/m³',
      glow: '#0284C7',
    },
    SYRUP: {
      gradStart: '#FBBF24',
      gradEnd: '#D97706',
      label: 'Sugar Syrup (65° Bx)',
      tag: 'ρ = 1,280 kg/m³',
      glow: '#D97706',
    },
    CIP: {
      gradStart: '#34D399',
      gradEnd: '#059669',
      label: 'CIP Caustic Loop',
      tag: 'ρ = 1,050 kg/m³',
      glow: '#059669',
    },
    ALCOHOL: {
      gradStart: '#A78BFA',
      gradEnd: '#7C3AED',
      label: 'Ethanol / Spirits',
      tag: 'ρ = 789 kg/m³',
      glow: '#7C3AED',
    },
  }[liquidType];

  const MATERIAL_CONFIG = {
    SS_316L: { label: 'SS 316L (Contact)', badge: 'Pharma / High-Acid' },
    SS_304: { label: 'SS 304 (Food Grade)', badge: 'Standard Beverage' },
    CARBON_STEEL: { label: 'Carbon Steel A36', badge: 'Utility / Water' },
    DUPLEX_2205: { label: 'Duplex 2205', badge: 'High-Chloride / Chemical' },
  }[materialType];

  const workingVol = totalVol * 0.9;
  let ullageY = cylTopY;
  if (coneVol >= workingVol && coneVol > 0) {
    const r = Math.cbrt(workingVol / coneVol);
    ullageY = coneBottomY - coneHPx * r;
  } else {
    const rem = workingVol - coneVol;
    const f = cylVol > 0 ? rem / cylVol : 0;
    ullageY = cylBottomY - cylHPx * f;
  }
  const isOverfill = fillPct > 90;

  return (
    <div className="bg-[#0B132B] border border-slate-800 rounded-3xl p-5 shadow-xl text-slate-100 flex flex-col justify-between overflow-hidden relative">
      {/* CAD Schematic Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-2">
        <div className="flex items-center space-x-2.5">
          <div className="w-3 h-3 rounded-full bg-[#FF4D6D] animate-pulse"></div>
          <div>
            <div className="text-xs font-mono font-black text-sky-400 tracking-wider">
              2D CAD MECHANICAL SCHEMATIC
            </div>
            <div className="text-sm font-black text-slate-100">
              Orthographic Cross-Section (ASME BPE &amp; DIN 28011)
            </div>
          </div>
        </div>
        <div className="text-right font-mono">
          <span className="text-xs text-slate-300 font-bold block">SCALE 1:25</span>
          <span className="text-xs font-black text-emerald-400">DWG: TK-2026</span>
        </div>
      </div>

      {/* Warning if overfilled */}
      {isOverfill && (
        <div className="bg-rose-500/20 border border-rose-500/60 rounded-xl px-3 py-1.5 mb-2 flex items-center space-x-2 text-rose-200 text-xs animate-pulse">
          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span><strong>Safety Cutoff Exceeded:</strong> Headspace &lt; 10% ullage limit. Risk of foam overflow into CIP vent!</span>
        </div>
      )}

      {/* SVG Canvas - Scaled up for crisp readability */}
      <div className="relative w-full min-h-[500px] h-[520px] sm:h-[550px] flex items-center justify-center">
        <svg
          viewBox="0 0 520 540"
          className="w-full h-full select-none"
          style={{ filter: 'drop-shadow(0px 10px 20px rgba(0,0,0,0.4))' }}
        >
          <defs>
            <pattern id="cadGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1E293B" strokeWidth="0.5" />
              <circle cx="20" cy="20" r="0.8" fill="#475569" />
            </pattern>

            <marker id="arrowStart" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M 10 1.5 L 0 5 L 10 8.5 z" fill="#38BDF8" />
            </marker>
            <marker id="arrowEnd" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#38BDF8" />
            </marker>

            <marker id="arrowStartCyan" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M 10 1.5 L 0 5 L 10 8.5 z" fill="#0284C7" />
            </marker>
            <marker id="arrowEndCyan" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#0284C7" />
            </marker>

            <linearGradient id="fluidGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={FLUID_CONFIG.gradStart} stopOpacity="0.88" />
              <stop offset="100%" stopColor={FLUID_CONFIG.gradEnd} stopOpacity="0.96" />
            </linearGradient>
          </defs>

          {/* Technical Grid Background */}
          <rect x="0" y="0" width="520" height="540" fill="url(#cadGrid)" />

          {/* Vertical Centerline (CAD Standard) */}
          <line
            x1={centerX}
            y1="25"
            x2={centerX}
            y2={floorY + 25}
            stroke="#0284C7"
            strokeWidth="1"
            strokeDasharray="18 4 4 4"
            opacity="0.8"
          />

          {/* Grade Ground Line */}
          <line
            x1="20"
            y1={floorY}
            x2="500"
            y2={floorY}
            stroke="#64748B"
            strokeWidth="2"
            strokeDasharray="8 4"
          />
          <text x="24" y={floorY + 16} fill="#CBD5E1" fontSize="11" fontFamily="monospace" fontWeight="bold">
            ▼ FINISHED FLOOR (±0.00)
          </text>

          {/* Dynamic Structural Support Legs with Foot Plates & ASME Repads */}
          <line
            x1={leftX + 10}
            y1={cylBottomY - 15}
            x2={leftX - 12}
            y2={floorY}
            stroke="#CBD5E1"
            strokeWidth="6"
            strokeLinecap="round"
          />
          {/* Leg Attachment Repad */}
          <rect
            x={leftX - 2}
            y={cylBottomY - 20}
            width="16"
            height="10"
            fill="#1E293B"
            stroke="#64748B"
            strokeWidth="0.8"
            rx="1"
          />
          <rect
            x={leftX - 26}
            y={floorY - 3}
            width="28"
            height="6"
            fill="#F8FAFC"
            stroke="#94A3B8"
            strokeWidth="1.2"
            rx="1.5"
          />

          <line
            x1={rightX - 10}
            y1={cylBottomY - 15}
            x2={rightX + 12}
            y2={floorY}
            stroke="#CBD5E1"
            strokeWidth="6"
            strokeLinecap="round"
          />
          {/* Leg Attachment Repad */}
          <rect
            x={rightX - 14}
            y={cylBottomY - 20}
            width="16"
            height="10"
            fill="#1E293B"
            stroke="#64748B"
            strokeWidth="0.8"
            rx="1"
          />
          <rect
            x={rightX - 2}
            y={floorY - 3}
            width="28"
            height="6"
            fill="#F8FAFC"
            stroke="#94A3B8"
            strokeWidth="1.2"
            rx="1.5"
          />

          {/* Dynamic Fluid Fill */}
          {fillPct > 0 && liquidPath && (
            <path
              d={liquidPath}
              fill="url(#fluidGrad)"
              className="transition-all duration-300"
              style={{ filter: `drop-shadow(0 0 14px ${FLUID_CONFIG.glow})` }}
            />
          )}

          {/* Top Dished Head */}
          <path
            d={`M ${leftX} ${cylTopY} Q ${centerX} ${cylTopY - dishHPx * 2} ${rightX} ${cylTopY}`}
            fill="none"
            stroke="#38BDF8"
            strokeWidth="3.2"
          />

          {/* Fabrication Weld Seam: Top Head Circumferential Joint */}
          <line
            x1={leftX}
            y1={cylTopY}
            x2={rightX}
            y2={cylTopY}
            stroke="#0284C7"
            strokeWidth="1"
            strokeDasharray="4 3"
            opacity="0.8"
          />

          {/* Tank Cylinder Shell */}
          <line
            x1={leftX}
            y1={cylTopY}
            x2={leftX}
            y2={cylBottomY}
            stroke="#38BDF8"
            strokeWidth="3.2"
          />
          <line
            x1={rightX}
            y1={cylTopY}
            x2={rightX}
            y2={cylBottomY}
            stroke="#38BDF8"
            strokeWidth="3.2"
          />

          {/* Fabrication Weld Seam: Mid-Height Shell Course Joint (if height > 2m) */}
          {cylHeight > 2.0 && (
            <g>
              <line
                x1={leftX}
                y1={cylTopY + cylHPx / 2}
                x2={rightX}
                y2={cylTopY + cylHPx / 2}
                stroke="#64748B"
                strokeWidth="0.8"
                strokeDasharray="5 3"
                opacity="0.6"
              />
              <text
                x={rightX - 6}
                y={cylTopY + cylHPx / 2 - 3}
                fill="#64748B"
                fontSize="7.5"
                fontFamily="monospace"
                textAnchor="end"
              >
                COURSE SEAM W-1
              </text>
            </g>
          )}

          {/* Fabrication Weld Seam: Bottom Circumferential Joint */}
          <line
            x1={leftX}
            y1={cylBottomY}
            x2={rightX}
            y2={cylBottomY}
            stroke="#0284C7"
            strokeWidth="1"
            strokeDasharray="4 3"
            opacity="0.8"
          />

          {/* DYNAMIC BOTTOM HEAD GEOMETRY (CONICAL vs TORISPHERICAL vs SLOPED FLAT) */}
          {tankStyle === 'CONICAL' && (
            <>
              <line
                x1={leftX}
                y1={cylBottomY}
                x2={centerX - 12}
                y2={coneBottomY}
                stroke="#38BDF8"
                strokeWidth="3.2"
              />
              <line
                x1={rightX}
                y1={cylBottomY}
                x2={centerX + 12}
                y2={coneBottomY}
                stroke="#38BDF8"
                strokeWidth="3.2"
              />
              {/* Central Sanitary Discharge Nozzle */}
              <rect
                x={centerX - 12}
                y={coneBottomY}
                width="24"
                height="20"
                fill="#1E293B"
                stroke="#38BDF8"
                strokeWidth="2"
              />
              <polygon
                points={`${centerX - 15},${coneBottomY + 20} ${centerX + 15},${coneBottomY + 20} ${centerX + 15},${coneBottomY + 25} ${centerX - 15},${coneBottomY + 25}`}
                fill="#38BDF8"
              />
              <polygon
                points={`${centerX - 9},${coneBottomY + 7} ${centerX + 9},${coneBottomY + 13} ${centerX + 9},${coneBottomY + 7} ${centerX - 9},${coneBottomY + 13}`}
                fill="#0284C7"
              />
            </>
          )}

          {tankStyle === 'TORISPHERICAL' && (
            <>
              {/* Torispherical Dished Bottom (DIN 28011) */}
              <path
                d={`M ${leftX} ${cylBottomY} Q ${centerX} ${cylBottomY + coneHPx * 1.8} ${rightX} ${cylBottomY}`}
                fill="none"
                stroke="#38BDF8"
                strokeWidth="3.2"
              />
              {/* Bottom Central Sanitary Nozzle */}
              <rect
                x={centerX - 12}
                y={cylBottomY + coneHPx * 1.8 - 4}
                width="24"
                height="20"
                fill="#1E293B"
                stroke="#38BDF8"
                strokeWidth="2"
              />
              <polygon
                points={`${centerX - 15},${cylBottomY + coneHPx * 1.8 + 16} ${centerX + 15},${cylBottomY + coneHPx * 1.8 + 16} ${centerX + 15},${cylBottomY + coneHPx * 1.8 + 21} ${centerX - 15},${cylBottomY + coneHPx * 1.8 + 21}`}
                fill="#38BDF8"
              />
            </>
          )}

          {tankStyle === 'SLOPED_FLAT' && (
            <>
              {/* 5° Sloped Flat Bottom with Offset Side Sump */}
              <line
                x1={leftX}
                y1={cylBottomY}
                x2={rightX - 35}
                y2={cylBottomY + 22}
                stroke="#38BDF8"
                strokeWidth="3.2"
              />
              {/* Side Sump Well */}
              <line x1={rightX - 35} y1={cylBottomY + 22} x2={rightX - 35} y2={cylBottomY + 36} stroke="#38BDF8" strokeWidth="2.5" />
              <line x1={rightX - 35} y1={cylBottomY + 36} x2={rightX} y2={cylBottomY + 36} stroke="#38BDF8" strokeWidth="2.5" />
              <line x1={rightX} y1={cylBottomY + 36} x2={rightX} y2={cylBottomY} stroke="#38BDF8" strokeWidth="2.5" />
              {/* Sump Discharge Valve */}
              <rect
                x={rightX - 25}
                y={cylBottomY + 36}
                width="18"
                height="16"
                fill="#1E293B"
                stroke="#38BDF8"
                strokeWidth="1.8"
              />
            </>
          )}

          {/* Top Nozzle Fittings with Reinforcement Repad */}
          <rect
            x={centerX - 30}
            y={topY - 18}
            width="60"
            height="22"
            fill="#0B132B"
            stroke="#0284C7"
            strokeWidth="0.8"
            strokeDasharray="3 2"
            rx="3"
          />
          <rect
            x={centerX - 24}
            y={topY - 14}
            width="48"
            height="15"
            fill="#1E293B"
            stroke="#38BDF8"
            strokeWidth="1.5"
            rx="3"
          />
          <text
            x={centerX}
            y={topY - 20}
            fill="#F1F5F9"
            fontSize="11"
            fontFamily="monospace"
            fontWeight="bold"
            textAnchor="middle"
          >
            DN400 MANWAY
          </text>

          {/* CIP Spray Ball Assembly */}
          <line
            x1={centerX - 40}
            y1={topY - 8}
            x2={centerX - 40}
            y2={cylTopY + 18}
            stroke="#0284C7"
            strokeWidth="1.8"
          />
          <circle cx={centerX - 40} cy={cylTopY + 18} r="5" fill="#38BDF8" />
          <path
            d={`M ${centerX - 48} ${cylTopY + 25} L ${centerX - 53} ${cylTopY + 30} M ${centerX - 32} ${cylTopY + 25} L ${centerX - 27} ${cylTopY + 30}`}
            stroke="#38BDF8"
            strokeWidth="1.2"
            strokeDasharray="2 2"
          />

          {/* 10% Ullage Cutoff Line */}
          <line
            x1={leftX + 2}
            y1={ullageY}
            x2={rightX - 2}
            y2={ullageY}
            stroke="#F43F5E"
            strokeWidth="1.8"
            strokeDasharray="6 3"
          />
          <rect
            x={rightX - 138}
            y={ullageY - 20}
            width="134"
            height="18"
            fill="#0B132B"
            stroke="#F43F5E"
            strokeWidth="0.9"
            rx="3"
          />
          <text
            x={rightX - 71}
            y={ullageY - 6}
            fill="#FB7185"
            fontSize="10.5"
            fontFamily="monospace"
            fontWeight="900"
            textAnchor="middle"
          >
            ▲ 90% WORKING CAP
          </text>

          {/* ================================================================
              CAD DIMENSION LINES & CALLOUT ARROWS
          ================================================================ */}
          {/* Top Diameter Dimension */}
          <g>
            <line
              x1={leftX}
              y1={topY - 26}
              x2={rightX}
              y2={topY - 26}
              stroke="#38BDF8"
              strokeWidth="1.5"
              markerStart="url(#arrowStart)"
              markerEnd="url(#arrowEnd)"
            />
            <line x1={leftX} y1={cylTopY} x2={leftX} y2={topY - 32} stroke="#64748B" strokeWidth="1" />
            <line x1={rightX} y1={cylTopY} x2={rightX} y2={topY - 32} stroke="#64748B" strokeWidth="1" />
            <rect
              x={centerX - 58}
              y={topY - 38}
              width="116"
              height="24"
              fill="#0F172A"
              stroke="#38BDF8"
              strokeWidth="1"
              rx="4"
            />
            <text
              x={centerX}
              y={topY - 22}
              fill="#38BDF8"
              fontSize="13"
              fontFamily="monospace"
              fontWeight="900"
              textAnchor="middle"
            >
              Ø {diameter.toFixed(2)} m ID
            </text>
          </g>

          {/* Cylinder Height Dimension */}
          <g>
            <line
              x1={leftX - 22}
              y1={cylTopY}
              x2={leftX - 22}
              y2={cylBottomY}
              stroke="#38BDF8"
              strokeWidth="1.5"
              markerStart="url(#arrowStart)"
              markerEnd="url(#arrowEnd)"
            />
            <line x1={leftX} y1={cylTopY} x2={leftX - 28} y2={cylTopY} stroke="#64748B" strokeWidth="1" />
            <line x1={leftX} y1={cylBottomY} x2={leftX - 28} y2={cylBottomY} stroke="#64748B" strokeWidth="1" />
            <rect
              x={leftX - 88}
              y={(cylTopY + cylBottomY) / 2 - 11}
              width="62"
              height="22"
              fill="#0F172A"
              stroke="#0284C7"
              strokeWidth="0.9"
              rx="3"
            />
            <text
              x={leftX - 57}
              y={(cylTopY + cylBottomY) / 2 + 5}
              fill="#38BDF8"
              fontSize="12"
              fontFamily="monospace"
              fontWeight="bold"
              textAnchor="middle"
            >
              H₁={cylHeight.toFixed(1)}m
            </text>
          </g>

          {/* Support Leg Height Dimension */}
          <g>
            <line
              x1={leftX - 22}
              y1={coneBottomY}
              x2={leftX - 22}
              y2={floorY}
              stroke="#38BDF8"
              strokeWidth="1.5"
              markerStart="url(#arrowStart)"
              markerEnd="url(#arrowEnd)"
            />
            <line x1={leftX - 12} y1={floorY} x2={leftX - 28} y2={floorY} stroke="#64748B" strokeWidth="1" />
            <rect
              x={leftX - 98}
              y={(coneBottomY + floorY) / 2 - 11}
              width="72"
              height="22"
              fill="#0F172A"
              stroke="#0284C7"
              strokeWidth="0.9"
              rx="3"
            />
            <text
              x={leftX - 62}
              y={(coneBottomY + floorY) / 2 + 5}
              fill="#38BDF8"
              fontSize="11.5"
              fontFamily="monospace"
              fontWeight="bold"
              textAnchor="middle"
            >
              H_leg={legHeight.toFixed(2)}m
            </text>
          </g>

          {/* Total Overall Height (H_SYS from floor to top) */}
          <g>
            <line
              x1={leftX - 104}
              y1={topY}
              x2={leftX - 104}
              y2={floorY}
              stroke="#0284C7"
              strokeWidth="1.5"
              markerStart="url(#arrowStartCyan)"
              markerEnd="url(#arrowEndCyan)"
            />
            <line x1={leftX} y1={topY} x2={leftX - 110} y2={topY} stroke="#64748B" strokeWidth="1" />
            <line x1={leftX - 12} y1={floorY} x2={leftX - 110} y2={floorY} stroke="#64748B" strokeWidth="1" />
            <g transform={`translate(${leftX - 112}, ${(topY + floorY) / 2}) rotate(-90)`}>
              <rect
                x="-95"
                y="-13"
                width="190"
                height="26"
                fill="#0F172A"
                stroke="#0284C7"
                strokeWidth="1"
                rx="4"
              />
              <text
                x="0"
                y="5"
                fill="#38BDF8"
                fontSize="12.5"
                fontFamily="monospace"
                fontWeight="900"
                textAnchor="middle"
              >
                H_SYS = {(cylHeight + coneHeight + legHeight).toFixed(2)} m (OVERALL)
              </text>
            </g>
          </g>

          {/* Current Liquid Meniscus Callout */}
          {fillPct > 0 && (
            <g>
              <line
                x1={rightX}
                y1={liquidTopY}
                x2={rightX + 22}
                y2={liquidTopY}
                stroke="#F59E0B"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />
              <line
                x1={rightX + 22}
                y1={liquidTopY}
                x2={rightX + 36}
                y2={liquidTopY - 14}
                stroke="#F59E0B"
                strokeWidth="1.5"
              />
              <rect
                x={rightX + 36}
                y={liquidTopY - 30}
                width="122"
                height="42"
                fill="#0F172A"
                stroke="#F59E0B"
                strokeWidth="1.5"
                rx="6"
                filter="drop-shadow(0 2px 8px rgba(0,0,0,0.5))"
              />
              <text
                x={rightX + 46}
                y={liquidTopY - 12}
                fill="#FBBF24"
                fontSize="13"
                fontFamily="monospace"
                fontWeight="900"
              >
                LEVEL: {fillPct}%
              </text>
              <text
                x={rightX + 46}
                y={liquidTopY + 5}
                fill="#F8FAFC"
                fontSize="12"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {Math.round(liquidLiters).toLocaleString()} L
              </text>
            </g>
          )}

          {/* Technical Drawing Stamp (ASME Title Block with Material & Price Attribution) */}
          <g transform="translate(290, 422)">
            <rect
              x="0"
              y="0"
              width="220"
              height="106"
              fill="#0A1128"
              stroke="#475569"
              strokeWidth="1.2"
              rx="4"
            />
            <rect x="0" y="0" width="220" height="24" fill="#1E293B" rx="4" />
            <line x1="0" y1="24" x2="220" y2="24" stroke="#475569" strokeWidth="1" />
            <line x1="0" y1="46" x2="220" y2="46" stroke="#334155" strokeWidth="0.8" />
            <line x1="0" y1="68" x2="220" y2="68" stroke="#334155" strokeWidth="0.8" />
            <line x1="0" y1="88" x2="220" y2="88" stroke="#334155" strokeWidth="0.8" />
            <text x="10" y="16" fill="#38BDF8" fontSize="10.5" fontFamily="monospace" fontWeight="900">
              ASME BPE • {tankStyle} SUMP
            </text>
            <text x="10" y="38" fill="#F8FAFC" fontSize="10" fontFamily="monospace" fontWeight="bold">
              MAT: {MATERIAL_CONFIG.label}
            </text>
            <text x="10" y="60" fill="#CBD5E1" fontSize="9.5" fontFamily="monospace">
              THK: {plateThicknessMm}mm Shell • {(plateThicknessMm + 1).toFixed(1)}mm Heads
            </text>
            <text x="10" y="80" fill="#38BDF8" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
              DRY STEEL: {Math.round(drySteelKg).toLocaleString()} kg (+14% scrap)
            </text>
            <text x="10" y="100" fill="#FBBF24" fontSize="10" fontFamily="monospace" fontWeight="900">
              EST. QUOTE: Rs. {new Intl.NumberFormat('en-PK').format(Math.round(estTankPricePkr))} (BETA)
            </text>
          </g>
        </svg>
      </div>

      {/* Real-time Technical Telemetry Bar */}
      <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-800/80 mt-2 font-mono">
        <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
          <span className="text-slate-400 block uppercase font-bold text-[10px]">Steel Mass</span>
          <span className="text-emerald-300 font-black text-sm mt-0.5 block">
            {(drySteelKg / 1000).toFixed(2)} MT
          </span>
        </div>
        <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
          <span className="text-slate-400 block uppercase font-bold text-[10px]">Headspace</span>
          <span className={`font-black text-sm mt-0.5 block ${isOverfill ? 'text-rose-400' : 'text-sky-300'}`}>
            {(100 - fillPct)}% Ullage
          </span>
        </div>
        <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
          <span className="text-slate-400 block uppercase font-bold text-[10px]">Working Cap</span>
          <span className="text-amber-300 font-black text-sm mt-0.5 block">
            {Math.round(workingCapacityLiters / 1000)} kL
          </span>
        </div>
        <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
          <span className="text-slate-400 block uppercase font-bold text-[10px]">Leg Clearance</span>
          <span className="text-purple-300 font-black text-sm mt-0.5 block">
            {legHeight.toFixed(2)} m
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
// ─── Tool view chips + header ────────────────────────────────────────────────
type ViewDef = { id: string; label: string };
const TOOL_VIEWS: Record<ToolId, ViewDef[]> = {
  tank: [{ id: 'dims', label: 'Dimensions' }, { id: 'fab', label: 'Fabrication & cost' }, { id: 'draw', label: '2D drawing' }],
  pipe: [{ id: 'inputs', label: 'Inputs' }, { id: 'gauge', label: 'Velocity gauge' }, { id: 'standards', label: 'Standards' }],
  wht: [{ id: 'inputs', label: 'Inputs' }, { id: 'compare', label: 'Rate comparison' }, { id: 'formula', label: 'Formula' }],
  incoterm: [{ id: 'inputs', label: 'Inputs' }, { id: 'breakdown', label: 'Cost breakdown' }, { id: 'note', label: 'Customs note' }],
  crossref: [{ id: 'table', label: 'Cross-reference' }, { id: 'checklist', label: 'Checklist' }],
  motor: [{ id: 'inputs', label: 'Inputs' }, { id: 'data', label: 'Data summary' }, { id: 'formula', label: 'Formula' }],
};

interface ToolHeaderProps {
  title: string; badge: string; badgeColor: string; formula: string;
  onBack: () => void; views: ViewDef[]; view: string; onView: (id: string) => void;
  children?: React.ReactNode;
}
function ToolHeader({ title, badge, badgeColor, formula, onBack, views, view, onView, children }: ToolHeaderProps) {
  const hasKpis = React.Children.toArray(children).some(Boolean);
  return (
    <div className="bg-white border border-slate-300 rounded-2xl px-4 py-3 mb-2 flex-shrink-0 shadow-2xs space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBack} className="px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 active:scale-95 flex-shrink-0">
            <ArrowLeft className="w-3.5 h-3.5" /> <span>All Tools</span>
          </button>
          <div className="h-4 w-px bg-slate-200 hidden sm:block" />
          <span className="font-bold text-sm sm:text-base text-slate-900 truncate">{title}</span>
          <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border hidden sm:inline-block flex-shrink-0 ${badgeColor}`}>{badge}</span>
          <span className="text-xs text-slate-500 font-mono font-bold hidden 2xl:inline truncate">{formula}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Sections">
          {views.map((v) => (
            <button key={v.id} role="tab" aria-selected={view === v.id} onClick={() => onView(v.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer ${view === v.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'}`}>
              {v.label}
            </button>
          ))}
        </div>
      </div>
      {hasKpis && <div>{children}</div>}
    </div>
  );
}

function ToolsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toolParam = searchParams.get('tool') as ToolId | null;
  const [activeTool, setActiveTool] = useState<ToolId | null>(toolParam || null);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('ALL');
  const [viewByTool, setViewByTool] = useState<Partial<Record<ToolId, string>>>({});
  useHideTopBar(activeTool !== null);

  useEffect(() => {
    if (toolParam && ['tank', 'pipe', 'wht', 'incoterm', 'crossref', 'motor'].includes(toolParam)) {
      setActiveTool(toolParam);
    }
  }, [toolParam]);

  const selectTool = (id: ToolId) => { setActiveTool(id); router.push(`/tools?tool=${id}`, { scroll: false }); };
  const backToMenu = () => { setActiveTool(null); router.push('/tools', { scroll: false }); };

  // =========================================================================
  // TOOL 1: TANK VOLUME & FABRICATION ESTIMATOR (BETA)
  // Standards: DIN 28011 (Torispherical Heads), EHEDG Doc. 9 (Sanitary 60°/90° Cones),
  // ASME BPE-2022, ASME Sec VIII Div 1, ASTM A380 (Passivation)
  // =========================================================================
  const [tankDiameter, setTankDiameter] = useState(2.0);    // 0.5–5.0 m
  const [tankCylHeight, setTankCylHeight] = useState(3.5);   // 0.5–8.0 m
  const [tankConeHeight, setTankConeHeight] = useState(0.6); // 0–1.5 m
  const [tankLegHeight, setTankLegHeight] = useState(0.8);   // 0.2–2.0 m
  const [tankFillPct, setTankFillPct] = useState(85);        // 50–100 %
  const [liquidType, setLiquidType] = useState<'WATER' | 'SYRUP' | 'CIP' | 'ALCOHOL'>('WATER');

  // Engineering Fabrication State
  const [tankStyle, setTankStyle] = useState<TankStyle>('CONICAL');
  const [materialType, setMaterialType] = useState<TankMaterial>('SS_316L');
  const [plateThicknessMm, setPlateThicknessMm] = useState<number>(4.0);
  const [customMaterialRatePkr, setCustomMaterialRatePkr] = useState<number>(1480);
  const [safetyMarginPct, setSafetyMarginPct] = useState<number>(15);

  const MATERIAL_DEFAULTS: Record<TankMaterial, { density: number; baseRate: number; laborRate: number; name: string; spec: string }> = {
    SS_316L: { density: 8000, baseRate: 1480, laborRate: 550, name: 'SS 316L', spec: 'Pharma / High-Acid Food Contact' },
    SS_304: { density: 7930, baseRate: 1150, laborRate: 520, name: 'SS 304', spec: 'Standard Food Grade / Beverage / Dairy' },
    CARBON_STEEL: { density: 7850, baseRate: 280, laborRate: 220, name: 'Carbon Steel (A36)', spec: 'Industrial Water / Oil / Utilities' },
    DUPLEX_2205: { density: 7800, baseRate: 2300, laborRate: 850, name: 'Duplex 2205', spec: 'High-Chloride / Acid / Marine Service' },
  };

  const getRecommendedThickness = (dia: number) => {
    if (dia <= 1.8) return 3.0;
    if (dia <= 2.8) return 4.0;
    if (dia <= 3.8) return 5.0;
    return 6.0;
  };

  const LIQUID_DENSITY: Record<typeof liquidType, number> = {
    WATER: 1000, SYRUP: 1280, CIP: 1050, ALCOHOL: 789,
  };
  const tankRadius = tankDiameter / 2;
  const cylVolM3 = Math.PI * tankRadius ** 2 * tankCylHeight;

  // Bottom Head Volume based on Tank Geometry
  const bottomVolM3 =
    tankStyle === 'CONICAL'
      ? (1 / 3) * Math.PI * tankRadius ** 2 * tankConeHeight
      : tankStyle === 'TORISPHERICAL'
      ? 0.0847 * tankDiameter ** 3
      : 0.0437 * tankDiameter ** 3; // 5° sloped flat bottom to drain sump

  const totalTankVolM3 = cylVolM3 + bottomVolM3;
  const totalTankLiters = totalTankVolM3 * 1000;
  const workingCapacityLiters = totalTankLiters * 0.9; // 10% ullage per EHEDG / 3-A Sanitary Standard
  const currentFillLiters = totalTankLiters * (tankFillPct / 100);
  const liquidDensity = LIQUID_DENSITY[liquidType];
  const liquidWeightKg = (currentFillLiters / 1000) * liquidDensity;

  // Surface Areas (DIN 28011 & ASME)
  const topHeadAreaM2 = 1.22 * Math.PI * tankRadius ** 2; // Torispherical dished blank area
  const cylShellAreaM2 = 2 * Math.PI * tankRadius * tankCylHeight;
  const bottomHeadAreaM2 =
    tankStyle === 'CONICAL'
      ? Math.PI * tankRadius * Math.sqrt(tankRadius ** 2 + tankConeHeight ** 2)
      : tankStyle === 'TORISPHERICAL'
      ? 1.22 * Math.PI * tankRadius ** 2
      : (Math.PI * tankRadius ** 2) / Math.cos((5 * Math.PI) / 180);

  const shellSurfaceAreaM2 = cylShellAreaM2 + topHeadAreaM2 + bottomHeadAreaM2;
  // CIP spray ball coverage: requires ≥25 L/min per m² of surface area
  const cipFlowRequiredLmin = shellSurfaceAreaM2 * 25;

  // Real-world Material & Fabrication Math
  const matConfig = MATERIAL_DEFAULTS[materialType];
  const headThicknessMm = plateThicknessMm + 1.0; // Spinning & knuckle forming thinning allowance per ASME Sec VIII Div 1
  const cylPlateVolM3 = cylShellAreaM2 * (plateThicknessMm / 1000);
  const headsPlateVolM3 = (topHeadAreaM2 + bottomHeadAreaM2) * (headThicknessMm / 1000);
  const netPlateMassKg = (cylPlateVolM3 + headsPlateVolM3) * matConfig.density;

  // Nesting & Circular Cutout Scrap (+14% per real fabrication shop yield)
  const grossPlateMassKg = netPlateMassKg * 1.14;

  // Structural Legs (4x Schedule 40 tubular legs with footpads, gusset plates, leveling bolts)
  const legsMassKg = 4 * (14 + 11 * tankLegHeight);
  // DN450/DN500 Sanitary Davit Arm Manway + Flange
  const manwayMassKg = 45;
  // Nozzles, Reinforcing Repads (ASME BPE Tri-Clamp: CIP, Inlet, Outlet Sump, Vent, Sample)
  const nozzlesMassKg = 28;
  // AWS TIG Weld Filler Wire & Consumables (~3% of net plate mass)
  const weldWireMassKg = netPlateMassKg * 0.03;

  const totalDrySteelKg = grossPlateMassKg + legsMassKg + manwayMassKg + nozzlesMassKg + weldWireMassKg;

  // Commercial Fabrication Costing
  const rawMaterialCostPkr = totalDrySteelKg * customMaterialRatePkr;
  const fabricationLaborCostPkr = totalDrySteelKg * matConfig.laborRate; // Automated rolling, TIG with Argon root backing, pickling/passivation bath, mechanical polish Ra < 0.4um, hydrotest
  const subtotalCostPkr = rawMaterialCostPkr + fabricationLaborCostPkr;
  const estimatedTankPricePkr = subtotalCostPkr * (1 + safetyMarginPct / 100);
  const estimatedTankPriceUsd = estimatedTankPricePkr / 278.50;

  // =========================================================================
  // TOOL 2: PIPE VELOCITY STATE
  // Real-world: DIN 11850 sanitary tubes; EHEDG Guideline Doc 9 velocity limits
  // =========================================================================
  // Sanitary tube inner diameters (mm) per DIN 11850 / ISO 1127 (OD - 2×wall)
  const PIPE_OPTIONS = [
    { label: 'DN20 (¾" – ID: 20mm)', id: 20 },
    { label: 'DN25 (1" – ID: 25mm)', id: 25 },
    { label: 'DN32 (1¼" – ID: 32mm)', id: 32 },
    { label: 'DN40 (1½" – ID: 38mm)', id: 38 },
    { label: 'DN50 (2" – ID: 50mm)', id: 50 },
    { label: 'DN65 (2½" – ID: 63mm)', id: 63 },
    { label: 'DN80 (3" – ID: 76mm)', id: 76 },
    { label: 'DN100 (4" – ID: 101mm)', id: 101 },
    { label: 'DN125 (5" – ID: 125mm)', id: 125 },
    { label: 'DN150 (6" – ID: 150mm)', id: 150 },
  ];
  const [pipeDiameterMm, setPipeDiameterMm] = useState(50);
  const [flowRateM3H, setFlowRateM3H] = useState(15.0);
  const [pipingApp, setPipingApp] = useState<'PROCESS' | 'CIP' | 'SUCTION' | 'UTILITY'>('PROCESS');
  const [fluidViscosityCp, setFluidViscosityCp] = useState(1.0); // centipoise: water=1.0, syrup≈50

  const pipeAreaM2 = Math.PI * (pipeDiameterMm / 2000) ** 2;
  const flowRateM3S = flowRateM3H / 3600;
  const fluidVelocityMS = pipeAreaM2 > 0 ? flowRateM3S / pipeAreaM2 : 0;
  const flowLpm = (flowRateM3H * 1000) / 60;
  // Reynolds number: Re = ρvD/μ (ρ=1000 kg/m³, μ in Pa·s = cP/1000)
  const reynoldsNo = (1000 * fluidVelocityMS * (pipeDiameterMm / 1000)) / (fluidViscosityCp / 1000);
  const flowRegime = reynoldsNo < 2300 ? 'Laminar' : reynoldsNo < 4000 ? 'Transitional' : 'Turbulent';
  // Darcy-Weisbach: hf/L = f × v²/(2gD)  → ΔP per 100m (kPa)
  const frictionFactor = reynoldsNo > 0 ? (reynoldsNo < 2300 ? 64 / reynoldsNo : 0.316 / reynoldsNo ** 0.25) : 0;
  const pressureDropKpaPer100m = frictionFactor * (100 / (pipeDiameterMm / 1000)) * (1000 * fluidVelocityMS ** 2) / 2000;

  const getVelocityStatus = (v: number, app: string) => {
    const limits: Record<string, { low: number; high: number; max: number }> = {
      PROCESS: { low: 0.5, high: 2.0, max: 3.0 },
      CIP: { low: 1.5, high: 2.5, max: 3.5 },
      SUCTION: { low: 0.3, high: 1.2, max: 1.5 },
      UTILITY: { low: 0.5, high: 3.0, max: 4.0 },
    };
    const lim = limits[app] || limits.PROCESS;
    if (v < lim.low) return { label: 'Too Slow', color: 'text-amber-700 bg-amber-50 border-amber-200', bar: 'bg-amber-400' };
    if (v <= lim.high) return { label: 'Optimal ✓', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', bar: 'bg-emerald-500' };
    if (v <= lim.max) return { label: 'High – Check', color: 'text-blue-700 bg-blue-50 border-blue-200', bar: 'bg-blue-500' };
    return { label: 'Excessive! ⚠', color: 'text-rose-700 bg-rose-50 border-rose-200', bar: 'bg-rose-500' };
  };
  const velStatus = getVelocityStatus(fluidVelocityMS, pipingApp);

  // =========================================================================
  // TOOL 3: WHT GROSS-UP STATE
  // FBR Income Tax Ordinance 2001 Rates (Finance Act 2024)
  // =========================================================================
  const [baseCost, setBaseCost] = useState(14500);
  const [marginPct, setMarginPct] = useState(15);
  const [whtPct, setWhtPct] = useState<number>(8);
  const [gstMode, setGstMode] = useState<'NONE' | 'GST18' | 'SRB13' | 'CUSTOM'>('GST18');
  const [customGstPct, setCustomGstPct] = useState(18);

  const GST_RATES: Record<typeof gstMode, number> = { NONE: 0, GST18: 18, SRB13: 13, CUSTOM: customGstPct };
  const gstRate = GST_RATES[gstMode] / 100;
  const targetNet = baseCost * (1 + marginPct / 100);
  const invoiceExclGst = targetNet / (1 - whtPct / 100);
  const gstAmount = invoiceExclGst * gstRate;
  const totalInvoice = invoiceExclGst + gstAmount;
  const whtDeduction = invoiceExclGst * (whtPct / 100);
  const netCash = invoiceExclGst - whtDeduction;
  const effectiveMarkup = baseCost > 0 ? ((netCash - baseCost) / baseCost) * 100 : 0;

  // =========================================================================
  // TOOL 4: INCOTERM LANDED COST STATE
  // Pakistani Customs: CD + RD + ACD + Import WHT 6% on (EXW+Freight+CD)
  // SRO 760(I)/2013 & SRO 471(I)/2015 (electrical/automation equipment)
  // =========================================================================
  const [exwUsd, setExwUsd] = useState(500);
  const [pkrRate, setPkrRate] = useState(278.5);
  const [freightMode, setFreightMode] = useState<'AIR' | 'SEA'>('AIR');
  const [cdPct, setCdPct] = useState(20);  // Customs Duty
  const [rdPct, setRdPct] = useState(5);   // Regulatory Duty
  const [acdPct, setAcdPct] = useState(5); // Additional Customs Duty
  const [importWhtPct] = useState(6);       // Fixed per FBR
  const [inlandPkr, setInlandPkr] = useState(25000); // Port clearing + transport

  const FREIGHT_PCT = { AIR: 16.5, SEA: 6.5 }; // mid-range estimates
  const exwPkr = exwUsd * pkrRate;
  const freightPkr = exwPkr * (FREIGHT_PCT[freightMode] / 100);
  const cifPkr = exwPkr + freightPkr;
  const cdPkr = cifPkr * (cdPct / 100);
  const rdPkr = cifPkr * (rdPct / 100);
  const acdPkr = cifPkr * (acdPct / 100);
  const iWhtBase = cifPkr + cdPkr + rdPkr + acdPkr;
  const importWhtPkr = iWhtBase * (importWhtPct / 100);
  const totalDdpPkr = cifPkr + cdPkr + rdPkr + acdPkr + importWhtPkr + inlandPkr;
  const totalMarkupPct = exwPkr > 0 ? ((totalDdpPkr - exwPkr) / exwPkr) * 100 : 0;

  // =========================================================================
  // TOOL 5: CROSS-REFERENCE DATABASE
  // IEC 60947-4-1 | IEC 60947-5-1 | SIRIUS 3RT/3RH | TeSys D/F | A/AF Series
  // =========================================================================
  const [crossSearch, setCrossSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const crossReferenceDatabase = [
    { cat: 'RELAY', category: 'Auxiliary Contactor (2NO+2NC) 24V DC', siemens: '3RH2122-1BB40', schneider: 'CAD32BD', abb: 'NF22E-11', rating: 'Ue: 690V, Ie: 10A', coil: '24V DC' },
    { cat: 'RELAY', category: 'Auxiliary Contactor (3NO+1NC) 24V DC', siemens: '3RH2131-1BB40', schneider: 'CAD31BD', abb: 'NF31E-11', rating: 'Ue: 690V, Ie: 10A', coil: '24V DC' },
    { cat: 'RELAY', category: 'Auxiliary Contactor (4NO) 24V DC', siemens: '3RH2140-1BB40', schneider: 'CAD40BD', abb: 'NF40E-11', rating: 'Ue: 690V, Ie: 10A', coil: '24V DC' },
    { cat: 'RELAY', category: 'Auxiliary Contactor (2NO+2NC) 220V AC', siemens: '3RH2122-1AP00', schneider: 'CAD32P7', abb: 'NF22E-13', rating: 'Ue: 690V, Ie: 10A', coil: '220V AC' },
    { cat: 'POWER', category: '3-Pole Contactor 9A / 4kW (24V DC)', siemens: '3RT2016-1BB41', schneider: 'LC1D09BD', abb: 'AF09-30-10-11', rating: 'AC-3: 9A/4kW@400V', coil: '24V DC' },
    { cat: 'POWER', category: '3-Pole Contactor 18A / 7.5kW (24V DC)', siemens: '3RT2024-1BB40', schneider: 'LC1D18BD', abb: 'AF18-30-10-11', rating: 'AC-3: 18A/7.5kW@400V', coil: '24V DC' },
    { cat: 'POWER', category: '3-Pole Contactor 25A / 11kW (24V DC)', siemens: '3RT2026-1BB40', schneider: 'LC1D25BD', abb: 'AF26-30-00-11', rating: 'AC-3: 25A/11kW@400V', coil: '24V DC' },
    { cat: 'POWER', category: '3-Pole Contactor 40A / 18.5kW (24V DC)', siemens: '3RT2035-1BB40', schneider: 'LC1D40ABD', abb: 'AF40-30-00-11', rating: 'AC-3: 40A/18.5kW@400V', coil: '24V DC' },
    { cat: 'POWER', category: '3-Pole Contactor 65A / 30kW (24V DC)', siemens: '3RT2045-1BB40', schneider: 'LC1D65BD', abb: 'AF65-30-00-11', rating: 'AC-3: 65A/30kW@400V', coil: '24V DC' },
    { cat: 'POWER', category: '3-Pole Contactor 95A / 45kW (220V AC)', siemens: '3RT2054-1AP36', schneider: 'LC1D95P7', abb: 'AF96-30-11-13', rating: 'AC-3: 95A/45kW@400V', coil: '220V AC' },
    { cat: 'PLC', category: 'Compact PLC – 14 DI/10 DO (DC)', siemens: '6ES7214-1AG40-0XB0 (S7-1214C)', schneider: 'TM221CE16T (M221)', abb: 'PM554-TP-ETH (AC500-eCo)', rating: 'CPU + Ethernet', coil: '24V DC' },
    { cat: 'PLC', category: 'Safety Relay – E-Stop / 2-channel', siemens: '3SK1111-1AB30 (SIRIUS)', schneider: 'XPSAC3421 (Preventa)', abb: 'ESR5-NX-31-24VAC-DC', rating: 'SIL 2 / PLd', coil: '24V DC' },
    { cat: 'OVERLOAD', category: 'Thermal Overload Relay 6–10A', siemens: '3UA5900-1E', schneider: 'LRD14 (5.5–8A)', abb: 'TA25DU-8.5 (6–8.5A)', rating: 'Class 10A', coil: '—' },
    { cat: 'OVERLOAD', category: 'Electronic Overload 3–12A', siemens: '3RB2026-2QB0', schneider: 'LR9D10 (4–8A)', abb: 'EF9 (4–13A) ACS310', rating: 'Class 10 / CLASS 20', coil: '24V DC' },
  ];

  const catOptions = ['ALL', 'RELAY', 'POWER', 'PLC', 'OVERLOAD'];
  const filteredCross = crossReferenceDatabase.filter((r) => {
    const matchCat = categoryFilter === 'ALL' || r.cat === categoryFilter;
    const q = crossSearch.toLowerCase();
    const matchSearch = !q || r.siemens.toLowerCase().includes(q) || r.schneider.toLowerCase().includes(q)
      || r.abb.toLowerCase().includes(q) || r.category.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  // =========================================================================
  // TOOL 6: MOTOR FLA & CABLE SIZER STATE
  // IEC 60034-1 / IEC 60364-5-52 / NEMA MG-1 standards
  // 415V 3-phase 50Hz (Pakistan standard)
  // =========================================================================
  const IEC_MOTOR_SIZES = [0.37, 0.55, 0.75, 1.1, 1.5, 2.2, 3.0, 4.0, 5.5, 7.5, 11, 15, 18.5, 22, 30, 37, 45, 55, 75, 90, 110, 132, 160, 200];
  const [motorKwIdx, setMotorKwIdx] = useState(10); // index into IEC_MOTOR_SIZES → 11kW
  const [motorPf, setMotorPf] = useState(0.85);
  const [motorEff, setMotorEff] = useState(0.90);
  const [starterType, setStarterType] = useState<'DOL' | 'STARDELTA' | 'VFD'>('DOL');
  const [ambientTemp, setAmbientTemp] = useState(40); // °C

  const motorKw = IEC_MOTOR_SIZES[motorKwIdx];
  const voltage = 415;
  const fla = (motorKw * 1000) / (Math.sqrt(3) * voltage * motorPf * motorEff);
  // Starting current multipliers: DOL 6-7× FLA, Star-Delta 2.3× FLA, VFD 1.0×
  const STARTING_MULT = { DOL: 6.5, STARDELTA: 2.33, VFD: 1.0 };
  const startingCurrent = fla * STARTING_MULT[starterType];
  const contactorTarget = fla * 1.25;
  const overloadLow = fla * 0.9;
  const overloadHigh = fla * 1.1;
  // Derating for ambient: subtract 1% per °C above 40°C (IEC 60364)
  const deratingFactor = ambientTemp > 40 ? 1 - (ambientTemp - 40) * 0.01 : 1.0;
  const deratedFla = fla / deratingFactor;

  const getContactor = (a: number) => {
    const std = [9, 12, 16, 18, 25, 32, 40, 50, 65, 80, 95, 115, 150, 185, 225, 300];
    return std.find((s) => s >= a) ?? 300;
  };
  const getCable = (a: number) => {
    const tbl = [
      [13, '2.5'], [18, '4.0'], [24, '6.0'], [32, '10.0'], [42, '16.0'],
      [56, '25.0'], [70, '35.0'], [88, '50.0'], [110, '70.0'], [135, '95.0'],
      [160, '120.0'], [200, '150.0'], [999, '185.0'],
    ];
    return (tbl.find(([cap]) => a <= (cap as number))?.[1] ?? '185.0') + ' mm²';
  };
  const getStarterNote = (k: number, s: string) => {
    if (s === 'VFD') return 'VFD: Contactor sized to 1.1× FLA only. Use VFD-rated cables.';
    if (k >= 11 && s === 'DOL') return '⚠ Above 11kW: DOL starting causes high line disturbances. Recommend Star-Delta or VFD.';
    if (s === 'STARDELTA') return 'Star-Delta: Starting current ≈ 33% of DOL. Requires 3-contactor panel (Main + Star + Delta).';
    return 'DOL: Simplest starter. Direct-on-line, full voltage applied instantly.';
  };

  // ─── Tool Catalog ───────────────────────────────────────────────────────────
  const toolsCatalog = [
    {
      id: 'tank' as ToolId, title: 'Tank Volume & Capacity Sizer', discipline: 'PROCESS',
      badge: 'Beverage & Process', badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: Layers, iconColor: 'text-blue-600 bg-blue-50 border-blue-200',
      description: 'Cylindrical + conical tank geometry, working capacity, liquid weight, CIP coverage, and SS shell area for beverage, dairy, and chemical plants.',
      formula: 'V = πr²h + ⅓πr²h(cone)',
      highlights: ['10% Ullage / Working Capacity', 'CIP Spray Coverage Calc', 'Foundation Weight Load'],
    },
    {
      id: 'pipe' as ToolId, title: 'Piping Flow & Velocity Sizer', discipline: 'MECHANICAL',
      badge: 'Hydraulics & Mechanical', badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      icon: Activity, iconColor: 'text-cyan-600 bg-cyan-50 border-cyan-200',
      description: 'Fluid velocity, Reynolds number, flow regime, Darcy-Weisbach pressure drop, and EHEDG velocity limits for DIN 11850 sanitary tubes.',
      formula: 'v = Q/A, Re = ρvD/μ',
      highlights: ['Reynolds Number & Flow Regime', 'Pressure Drop per 100m', 'Application Duty Checks'],
    },
    {
      id: 'wht' as ToolId, title: 'Reverse WHT & GST Gross-Up', discipline: 'COMMERCIAL',
      badge: 'Commercial Tax Math', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: Calculator, iconColor: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      description: 'FBR Pakistan withholding tax protection. Scales invoice price so net bank cash equals exact profit margin. GST 18% / SRB 13% support.',
      formula: 'Price = TargetNet ÷ (1 − WHT%)',
      highlights: ['FBR Standard Goods (8%)', 'SRB Sindh Services (13%)', 'GST 18% Invoice Calc'],
    },
    {
      id: 'incoterm' as ToolId, title: 'Incoterm Landed Cost Estimator', discipline: 'COMMERCIAL',
      badge: 'Import & Logistics', badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      icon: Truck, iconColor: 'text-amber-600 bg-amber-50 border-amber-200',
      description: 'Full Pakistan customs breakdown: CD, RD, ACD, Import WHT 6%, port clearing. Converts EXW (USD) to DDP landed cost (PKR).',
      formula: 'DDP = EXW + Freight + CD + RD + ACD + WHT + Inland',
      highlights: ['Pakistan Customs Breakdown', 'Air vs Ocean Freight', 'Total Markup % over EXW'],
    },
    {
      id: 'crossref' as ToolId, title: 'Switchgear Cross-Reference', discipline: 'AUTOMATION',
      badge: 'Industrial Automation', badgeColor: 'bg-rose-50 text-[#FF4D6D] border-rose-200',
      icon: ArrowRightLeft, iconColor: 'text-[#FF4D6D] bg-rose-50 border-rose-200',
      description: 'Direct drop-in equivalents: Siemens SIRIUS ↔ Schneider TeSys ↔ ABB Control. Contactors, relays, PLCs, overloads. IEC 60947-4-1.',
      formula: 'Siemens ↔ Schneider ↔ ABB',
      highlights: ['24V DC / 220V AC Coil Options', 'Safety Relays & PLCs', 'AC-3 Ratings & Contacts'],
    },
    {
      id: 'motor' as ToolId, title: 'Motor FLA & Cable Sizer', discipline: 'ELECTRICAL',
      badge: 'Electrical Engineering', badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      icon: Zap, iconColor: 'text-purple-600 bg-purple-50 border-purple-200',
      description: 'IEC 60034 motor FLA, starting current (DOL/Star-Delta/VFD), contactor AC-3 sizing, thermal overload, cable cross-section, ambient derating.',
      formula: 'I = P ÷ (√3 × V × cosφ × η)',
      highlights: ['DOL / Star-Delta / VFD', 'Ambient Temp Derating', 'IEC 60364 Cable Sizing'],
    },
  ];

  const filteredCatalog = toolsCatalog.filter((t) => {
    const matchesDiscipline = selectedDiscipline === 'ALL' || t.discipline === selectedDiscipline;
    const q = searchFilter.toLowerCase();
    const matchesSearch = !q || t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.badge.toLowerCase().includes(q);
    return matchesDiscipline && matchesSearch;
  });

  const activeTool_ = toolsCatalog.find((t) => t.id === activeTool);
  const toolViews = activeTool ? TOOL_VIEWS[activeTool] : [];
  const view = activeTool ? viewByTool[activeTool] ?? toolViews[0].id : '';

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden text-slate-900 select-none">

      {/* ─── FOCUSED TOOL WORKSPACE ─────────────────────────────────────────── */}
      {activeTool ? (
        <div className="flex-1 flex flex-col h-full overflow-hidden animate-in fade-in">
          <ToolHeader
            title={activeTool_?.title ?? ''}
            badge={activeTool_?.badge ?? ''}
            badgeColor={activeTool_?.badgeColor ?? ''}
            formula={activeTool_?.formula ?? ''}
            onBack={backToMenu}
            views={toolViews}
            view={view}
            onView={(v) => setViewByTool((m) => ({ ...m, [activeTool]: v }))}
          >
            {activeTool === 'tank' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <div className="p-2 sm:p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-[10px] font-mono font-black uppercase text-slate-600">Total Volume</div>
                    <div className="text-lg sm:text-xl font-black font-mono text-slate-950 mt-0.5">
                      {Math.round(totalTankLiters).toLocaleString()} L
                    </div>
                    <div className="text-[10px] font-bold text-slate-600">{totalTankVolM3.toFixed(2)} m³</div>
                  </div>

                  <div className="p-2 sm:p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                    <div className="text-[10px] font-mono font-black uppercase text-emerald-800">Working Cap (90%)</div>
                    <div className="text-lg sm:text-xl font-black font-mono text-emerald-800 mt-0.5">
                      {Math.round(workingCapacityLiters).toLocaleString()} L
                    </div>
                    <div className="text-[10px] font-bold text-emerald-700">10% Ullage Safe</div>
                  </div>

                  <div className="p-2 sm:p-2.5 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="text-[10px] font-mono font-black uppercase text-blue-800">Current Liquid</div>
                    <div className="text-lg sm:text-xl font-black font-mono text-blue-800 mt-0.5">
                      {Math.round(currentFillLiters).toLocaleString()} L
                    </div>
                    <div className="text-[10px] font-bold text-blue-700">{tankFillPct}% Fill ({(liquidWeightKg / 1000).toFixed(1)} MT)</div>
                  </div>

                  <div className="p-2 sm:p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-[10px] font-mono font-black uppercase text-slate-600">Est. Steel Mass</div>
                    <div className="text-lg sm:text-xl font-black font-mono text-slate-950 mt-0.5">
                      {Math.round(totalDrySteelKg).toLocaleString()} kg
                    </div>
                    <div className="text-[10px] font-bold text-slate-600">{(totalDrySteelKg / 1000).toFixed(2)} MT (+14% scrap)</div>
                  </div>

                  <div className="p-2 sm:p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                    <div className="text-[10px] font-mono font-black uppercase text-amber-800 flex items-center justify-between">
                      <span>Est. Quote</span>
                      <span className="text-[8px] bg-amber-200 text-amber-900 px-1 py-0.2 rounded font-black tracking-wider">BETA</span>
                    </div>
                    <div className="text-sm sm:text-base font-black font-mono text-amber-950 mt-0.5 truncate">
                      Rs. {new Intl.NumberFormat('en-PK').format(Math.round(estimatedTankPricePkr))}
                    </div>
                    <div className="text-[10px] font-bold text-amber-700">~${Math.round(estimatedTankPriceUsd).toLocaleString()} USD</div>
                  </div>

                  <div className="p-2 sm:p-2.5 bg-purple-50 rounded-xl border border-purple-200">
                    <div className="text-[10px] font-mono font-black uppercase text-purple-800">Total Height</div>
                    <div className="text-lg sm:text-xl font-black font-mono text-purple-900 mt-0.5">
                      {(tankCylHeight + (tankStyle === 'CONICAL' ? tankConeHeight : tankStyle === 'TORISPHERICAL' ? tankDiameter * 0.19 : tankDiameter * Math.tan((5 * Math.PI) / 180)) + tankLegHeight).toFixed(2)} m
                    </div>
                    <div className="text-[10px] font-bold text-purple-700">Legs: {tankLegHeight.toFixed(2)}m {tankLegHeight >= 0.4 ? '✓' : '⚠'}</div>
                  </div>
                </div>
            )}
            {activeTool === 'pipe' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard label="Fluid Velocity" value={`${fluidVelocityMS.toFixed(2)} m/s`} sub={`${(fluidVelocityMS * 3.281).toFixed(2)} ft/s`} />
                  <StatCard label="Volumetric Flow" value={`${Math.round(flowLpm)} L/min`} sub={`${flowRateM3H} m³/h`} accent="blue" />
                  <StatCard label="Reynolds Number" value={Math.round(reynoldsNo).toLocaleString()} sub={flowRegime} accent={reynoldsNo > 4000 ? 'green' : reynoldsNo > 2300 ? 'amber' : 'default'} />
                  <StatCard label="ΔP per 100m" value={`${pressureDropKpaPer100m.toFixed(1)} kPa`} sub="Darcy-Weisbach estimate" accent={pressureDropKpaPer100m > 50 ? 'red' : 'default'} />
                </div>
            )}
            {activeTool === 'wht' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard label="Invoice Price (Excl. GST)" value={`Rs. ${Math.round(invoiceExclGst).toLocaleString()}`} sub={`Target net: Rs. ${Math.round(targetNet).toLocaleString()}`} />
                  <StatCard label={`WHT Deduction (${whtPct}%)`} value={`−Rs. ${Math.round(whtDeduction).toLocaleString()}`} sub="Client deducts at source" accent="red" />
                  <StatCard label="Net Bank Cash Received" value={`Rs. ${Math.round(netCash).toLocaleString()}`} sub={`${effectiveMarkup.toFixed(1)}% retained margin`} accent="green" />
                  <StatCard label="Total Invoice (Incl. GST)" value={`Rs. ${Math.round(totalInvoice).toLocaleString()}`} sub={`GST: Rs. ${Math.round(gstAmount).toLocaleString()}`} accent="blue" />
                </div>
            )}
            {activeTool === 'incoterm' && (
<div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
  <StatCard label="EXW Price" value={`Rs. ${Math.round(exwPkr).toLocaleString()}`} sub={`$${exwUsd.toLocaleString()} USD`} />
  <StatCard label="Freight & Logistics" value={`Rs. ${Math.round(freightPkr + inlandPkr).toLocaleString()}`} sub="Freight + port & inland" accent="blue" />
  <StatCard label="Duties & Taxes" value={`Rs. ${Math.round(cdPkr + rdPkr + acdPkr + importWhtPkr).toLocaleString()}`} sub="CD + RD + ACD + import WHT" accent="amber" />
  <StatCard label="DDP Landed Cost" value={`Rs. ${Math.round(totalDdpPkr).toLocaleString()}`} sub={`+${totalMarkupPct.toFixed(1)}% over EXW`} accent="red" />
</div>
            )}
            {activeTool === 'motor' && (
<div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                <div className="contents">
                  <StatCard label="Full Load Current (FLA)" value={`${fla.toFixed(1)} A`} sub="At 415V 3φ 50Hz" />
                  <StatCard label="Starting Current" value={`${startingCurrent.toFixed(1)} A`} sub={`${STARTING_MULT[starterType]}× FLA (${starterType})`} accent="amber" />
                  <StatCard label="Recommended Contactor" value={`${getContactor(contactorTarget)} A`} sub="AC-3 duty class" accent="purple" />
                  <StatCard label="Thermal Overload Setting" value={`${overloadLow.toFixed(1)}–${overloadHigh.toFixed(1)} A`} sub={`Set dial to ${fla.toFixed(1)} A`} accent="green" />
                </div>
                <div className="contents">
                  <StatCard label="Min Copper Cable" value={getCable(deratedFla)} sub={`3-core XLPE/PVC (IEC 60364)`} />
                  <StatCard label="Derated FLA (Ambient)" value={`${deratedFla.toFixed(1)} A`}
                    sub={ambientTemp > 40 ? `×${deratingFactor.toFixed(2)} derating @ ${ambientTemp}°C` : 'No derating (≤40°C)'}
                    accent={ambientTemp > 40 ? 'amber' : 'default'} />
                  <StatCard label="Recommended MCB/MCCB" value={`${Math.ceil(fla * 1.5)} A`} sub="1.5× FLA (IEC 60898)" accent="blue" />
                </div>
</div>
            )}
          </ToolHeader>


          {/* Tool Canvas */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {/* ================================================================
                TOOL 1 — TANK VOLUME & CAPACITY SIZER (DUAL-PANE CAD BLUEPRINT)
                Standards: EHEDG Doc. 9, 3-A Sanitary Standard 20-28,
                           DIN 28050, ASME BPE-2022
            ================================================================ */}
            {activeTool === 'tank' && (
<div className="w-full space-y-2.5">
{view === 'dims' && (<>
<div className="max-w-4xl space-y-3">
                    {/* Presets with 20,000L and 30,000L included */}
                    <div className="flex items-center flex-wrap gap-1.5 bg-white border border-slate-300 rounded-2xl px-4 py-2.5 shadow-2xs">
                      <span className="text-xs text-slate-900 font-black mr-1 uppercase tracking-wider">Presets:</span>
                      {[
                        { name: '5,000L', d: 1.6, hCyl: 2.6, hCone: 0.5, hLeg: 0.6 },
                        { name: '10,000L', d: 2.2, hCyl: 2.8, hCone: 0.6, hLeg: 0.8 },
                        { name: '20,000L', d: 2.6, hCyl: 3.5, hCone: 0.7, hLeg: 0.8 },
                        { name: '25,000L', d: 2.8, hCyl: 4.2, hCone: 0.8, hLeg: 0.9 },
                        { name: '30,000L', d: 3.0, hCyl: 4.0, hCone: 0.8, hLeg: 0.9 },
                        { name: '50,000L', d: 3.6, hCyl: 5.0, hCone: 1.0, hLeg: 1.0 },
                        { name: '100,000L', d: 4.4, hCyl: 7.0, hCone: 1.2, hLeg: 1.2 },
                      ].map((p) => (
                        <button key={p.name}
                          onClick={() => {
                            setTankDiameter(p.d);
                            setTankCylHeight(p.hCyl);
                            setTankConeHeight(p.hCone);
                            setTankLegHeight(p.hLeg);
                            setPlateThicknessMm(getRecommendedThickness(p.d));
                          }}
                          className="px-3 py-1 rounded-full text-xs font-black bg-slate-50 hover:bg-slate-200 text-slate-900 border border-slate-300 transition-colors shadow-2xs cursor-pointer active:scale-95"
                        >{p.name}</button>
                      ))}
                    </div>

                    {/* Tank Dimensions & Fluid Card */}
                    <div className="bg-white border border-slate-300/90 rounded-2xl p-5 shadow-xs space-y-4">
                      <h2 className="text-base font-black text-slate-950 flex items-center space-x-2 pb-2.5 border-b border-slate-200">
                        <Layers className="w-4 h-4 text-blue-600" />
                        <span>Tank Dimensions &amp; Process Fluid</span>
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <SliderRow label="Internal Diameter" value={tankDiameter} min={0.5} max={5.0} step={0.05} unit="m"
                          note="Typical beverage tanks: 1.0m (5kL) to 4.5m (100kL)"
                          onChange={(v) => {
                            setTankDiameter(v);
                            // Keep plate thickness aligned if user hasn't heavily customized
                            if (plateThicknessMm <= 6.0) {
                              setPlateThicknessMm(getRecommendedThickness(v));
                            }
                          }}
                          formatValue={(v) => v.toFixed(2)} />
                        <SliderRow label="Cylinder Shell Height" value={tankCylHeight} min={0.5} max={8.0} step={0.1} unit="m"
                          note="Practical height-to-diameter ratio: 1.0–2.5× for stability"
                          onChange={setTankCylHeight} formatValue={(v) => v.toFixed(1)} />

                        {tankStyle === 'CONICAL' ? (
                          <SliderRow label="Conical Bottom Height" value={tankConeHeight} min={0} max={1.5} step={0.05} unit="m"
                            note="0.3–0.6m cone ensures full CIP drainage (EHEDG guideline)"
                            onChange={setTankConeHeight} formatValue={(v) => v.toFixed(2)} />
                        ) : tankStyle === 'TORISPHERICAL' ? (
                          <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-slate-900 uppercase tracking-wider">Torispherical Dish Depth</span>
                              <span className="text-sm font-black font-mono text-slate-950 bg-white px-2.5 py-0.5 rounded-lg border border-slate-300">
                                {(tankDiameter * 0.19).toFixed(2)} m
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium">Standard DIN 28011 Klöpperboden geometry (crown R=D, knuckle r=0.1D).</p>
                          </div>
                        ) : (
                          <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-slate-900 uppercase tracking-wider">5° Sloped Sump Depth</span>
                              <span className="text-sm font-black font-mono text-slate-950 bg-white px-2.5 py-0.5 rounded-lg border border-slate-300">
                                {(tankDiameter * Math.tan((5 * Math.PI) / 180)).toFixed(2)} m
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium">Full drainage 5° slope leading directly into offset cleanout well.</p>
                          </div>
                        )}

                        <SliderRow label="Support Leg Height" value={tankLegHeight} min={0.2} max={2.0} step={0.05} unit="m"
                          note="Sanitary clearance for bottom valve & floor washdown (min 0.3m per EHEDG)"
                          onChange={setTankLegHeight} formatValue={(v) => v.toFixed(2)} />

                        <div className="sm:col-span-2">
                          <SliderRow label="Current Fill Level" value={tankFillPct} min={0} max={100} step={1} unit="%"
                            note="Working capacity limited to 90% (10% ullage / headspace standard)"
                            onChange={setTankFillPct} />
                        </div>
                      </div>
                      <div>
                        <span className="text-xs font-black text-slate-900 uppercase tracking-wider block mb-1.5">Process Fluid</span>
                        <PillGroup
                          options={[
                            { label: 'Water / Beverage', value: 'WATER', sub: '1,000 kg/m³' },
                            { label: 'Syrup 65° Brix', value: 'SYRUP', sub: '1,280 kg/m³' },
                            { label: 'CIP Caustic', value: 'CIP', sub: '1,050 kg/m³' },
                            { label: 'Ethanol / Spirit', value: 'ALCOHOL', sub: '789 kg/m³' },
                          ]}
                          value={liquidType}
                          onChange={(v) => setLiquidType(v as typeof liquidType)}
                        />
                      </div>
                    </div>

</div>
</>)}
{view === 'fab' && (<>
<div className="max-w-4xl space-y-3">
                    {/* Fabrication Material & Cost Estimator Card (BETA) */}
                    <div className="bg-white border border-slate-300/90 rounded-2xl p-5 shadow-xs space-y-4">
                      <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
                        <h2 className="text-base font-black text-slate-950 flex items-center space-x-2">
                          <Hammer className="w-4 h-4 text-amber-600" />
                          <span>Fabrication Material &amp; Cost Estimator</span>
                        </h2>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                          BETA: Empirical Estimation Model
                        </span>
                      </div>

                      {/* Tank Mechanical Style Selector */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                            Tank Sump / Bottom Style
                          </span>
                          <span className="text-[11px] font-mono font-bold text-slate-500">
                            {tankStyle === 'CONICAL' ? 'EHEDG Doc. 9 Steep Cone' : tankStyle === 'TORISPHERICAL' ? 'DIN 28011 Klöpperboden' : '5° Atmospheric Sloped'}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'CONICAL', label: 'Conical 60° Hopper', desc: 'EHEDG Complete CIP Drain' },
                            { id: 'TORISPHERICAL', label: 'Torispherical Dish', desc: 'DIN 28011 / ASME VIII' },
                            { id: 'SLOPED_FLAT', label: '5° Sloped Flat', desc: 'Offset Sump Well' },
                          ].map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setTankStyle(s.id as TankStyle)}
                              className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                                tankStyle === s.id
                                  ? 'bg-slate-950 text-white border-slate-950 shadow-xs'
                                  : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                              }`}
                            >
                              <div className="text-xs font-black">{s.label}</div>
                              <div className={`text-[10px] font-medium mt-0.5 ${tankStyle === s.id ? 'text-slate-300' : 'text-slate-500'}`}>
                                {s.desc}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Material of Construction (MOC) */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                            Material of Construction (MOC)
                          </span>
                          <span className="text-[11px] font-mono font-bold text-slate-500">
                            Density: {matConfig.density} kg/m³
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {(['SS_316L', 'SS_304', 'CARBON_STEEL', 'DUPLEX_2205'] as TankMaterial[]).map((mat) => {
                            const cfg = MATERIAL_DEFAULTS[mat];
                            const isSelected = materialType === mat;
                            return (
                              <button
                                key={mat}
                                type="button"
                                onClick={() => {
                                  setMaterialType(mat);
                                  setCustomMaterialRatePkr(cfg.baseRate);
                                }}
                                className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-sky-950 text-white border-sky-800 shadow-xs'
                                    : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                                }`}
                              >
                                <div className="text-xs font-black">{cfg.name}</div>
                                <div className={`text-[10px] mt-0.5 line-clamp-1 ${isSelected ? 'text-sky-300' : 'text-slate-500'}`}>
                                  {cfg.spec}
                                </div>
                                <div className={`text-[10px] font-mono font-bold mt-1 ${isSelected ? 'text-amber-300' : 'text-slate-600'}`}>
                                  Rs. {cfg.baseRate}/kg
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Plate Thickness & Recommended Pill */}
                      <div className="space-y-2 pt-1 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                            Nominal Shell Plate Thickness
                          </span>
                          <div className="flex items-center space-x-2">
                            <span className="text-[11px] font-bold text-slate-600">
                              Heads Stock: <strong className="font-mono text-slate-900">{headThicknessMm.toFixed(1)}mm</strong> (+1mm forming allowance)
                            </span>
                            {plateThicknessMm !== getRecommendedThickness(tankDiameter) && (
                              <button
                                type="button"
                                onClick={() => setPlateThicknessMm(getRecommendedThickness(tankDiameter))}
                                className="text-[10px] font-black text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-2 py-0.5 hover:bg-blue-100 cursor-pointer"
                              >
                                Auto-Rec: {getRecommendedThickness(tankDiameter)}mm
                              </button>
                            )}
                          </div>
                        </div>
                        <SliderRow
                          label="Shell Plate Gauge"
                          value={plateThicknessMm}
                          min={2.0}
                          max={12.0}
                          step={0.5}
                          unit="mm"
                          note={`ASME VIII recommendation for D=${tankDiameter.toFixed(1)}m is ≥ ${getRecommendedThickness(tankDiameter)}mm`}
                          onChange={setPlateThicknessMm}
                          formatValue={(v) => v.toFixed(1)}
                        />
                      </div>

                      {/* Material Price & Safety Margin Inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-black text-slate-900 uppercase tracking-wider">
                              Material Rate (PKR / kg)
                            </label>
                            <button
                              type="button"
                              onClick={() => setCustomMaterialRatePkr(matConfig.baseRate)}
                              className="text-[10px] font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                            >
                              Reset default
                            </button>
                          </div>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-500">Rs.</span>
                            <input
                              type="number"
                              min={100}
                              max={10000}
                              step={10}
                              value={customMaterialRatePkr}
                              onChange={(e) => setCustomMaterialRatePkr(parseFloat(e.target.value) || 0)}
                              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1">
                            Base sheet/plate price. Default for {matConfig.name}: Rs. {matConfig.baseRate}/kg.
                          </p>
                        </div>

                        <div>
                          <SliderRow
                            label="Safety / Contingency Margin"
                            value={safetyMarginPct}
                            min={5}
                            max={35}
                            step={1}
                            unit="%"
                            note="Covers metal price volatility, NDT radiography, passivation bath & hydrotest"
                            onChange={setSafetyMarginPct}
                            formatValue={(v) => `${v}% (+Rs. ${Math.round((subtotalCostPkr * v) / 100).toLocaleString()})`}
                          />
                        </div>
                      </div>

                      {/* Fabrication Commercial Quotation Telemetry Card */}
                      <div className="bg-slate-900 rounded-2xl p-4 text-white space-y-3 mt-2">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Scale className="w-3.5 h-3.5" />
                            Cost &amp; Mass Breakdown (Fabrication Model)
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            Exchange: 1 USD = 278.50 PKR
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                          <div className="bg-slate-800/80 p-2 rounded-xl">
                            <div className="text-slate-400 text-[10px]">Net Plate Mass</div>
                            <div className="font-bold text-slate-200 mt-0.5">{Math.round(netPlateMassKg).toLocaleString()} kg</div>
                          </div>
                          <div className="bg-slate-800/80 p-2 rounded-xl">
                            <div className="text-slate-400 text-[10px]">Gross (+14% scrap)</div>
                            <div className="font-bold text-sky-300 mt-0.5">{Math.round(grossPlateMassKg).toLocaleString()} kg</div>
                          </div>
                          <div className="bg-slate-800/80 p-2 rounded-xl">
                            <div className="text-slate-400 text-[10px]">Appurtenances &amp; Legs</div>
                            <div className="font-bold text-slate-200 mt-0.5">{Math.round(legsMassKg + manwayMassKg + nozzlesMassKg + weldWireMassKg)} kg</div>
                          </div>
                          <div className="bg-slate-800/80 p-2 rounded-xl">
                            <div className="text-slate-400 text-[10px]">Total Fabricated Mass</div>
                            <div className="font-bold text-emerald-300 mt-0.5">{Math.round(totalDrySteelKg).toLocaleString()} kg</div>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs pt-1 border-t border-slate-800">
                          <div className="flex justify-between text-slate-300">
                            <span>Raw Material Cost ({Math.round(totalDrySteelKg)} kg @ Rs. {customMaterialRatePkr}/kg):</span>
                            <span className="font-mono font-bold text-slate-100">Rs. {Math.round(rawMaterialCostPkr).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span>Labor, TIG Purging &amp; Polish (Ra &lt; 0.4µm @ Rs. {matConfig.laborRate}/kg):</span>
                            <span className="font-mono font-bold text-slate-100">Rs. {Math.round(fabricationLaborCostPkr).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-slate-400 text-[11px]">
                            <span>Safety / Contingency Margin ({safetyMarginPct}%):</span>
                            <span className="font-mono text-amber-300">+Rs. {Math.round((subtotalCostPkr * safetyMarginPct) / 100).toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-700/80">
                          <div>
                            <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">
                              Total Commercial Fabrication Quote (BETA)
                            </span>
                            <span className="text-xs text-slate-400">
                              Ex-Works (EXW) Factory • Cleaned, Passivated &amp; Pressure-Tested
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-black font-mono text-amber-400">
                              Rs. {new Intl.NumberFormat('en-PK').format(Math.round(estimatedTankPricePkr))}
                            </div>
                            <div className="text-xs font-mono font-bold text-emerald-400">
                              ~${new Intl.NumberFormat('en-US').format(Math.round(estimatedTankPriceUsd))} USD
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <NoteCard icon={<Info className="w-5 h-5 text-blue-600" />} title="ASME BPE, DIN 28011 &amp; Fabrication Standards">
                      <p className="text-xs font-mono text-blue-950 font-black">V_total = V_cyl + V_bottom (Conical, Torispherical Klöpperboden, or 5° Sloped)</p>
                      <p className="text-xs text-blue-900 leading-relaxed font-medium">Pricing model accounts for circular dished head blank scrap (+14%), spinning knuckle thinning (+1mm stock), 4x Schedule 40 tubular support legs, DN500 davit manway, ASME BPE nozzles, TIG Argon root gas shielding, acid passivation per ASTM A380, and internal mechanical polishing to sanitary surface finish Ra &lt; 0.4µm.</p>
                    </NoteCard>
</div>
</>)}
{view === 'draw' && (<>
<div className="max-w-5xl mx-auto">
                    <TankCadDiagram
                      diameter={tankDiameter}
                      cylHeight={tankCylHeight}
                      coneHeight={tankConeHeight}
                      legHeight={tankLegHeight}
                      fillPct={tankFillPct}
                      liquidType={liquidType}
                      liquidLiters={currentFillLiters}
                      totalLiters={totalTankLiters}
                      workingCapacityLiters={workingCapacityLiters}
                      liquidWeightKg={liquidWeightKg}
                      tankStyle={tankStyle}
                      materialType={materialType}
                      plateThicknessMm={plateThicknessMm}
                      drySteelKg={totalDrySteelKg}
                      estTankPricePkr={estimatedTankPricePkr}
                    />
</div>
</>)}
</div>
)}

            {/* ================================================================
                TOOL 2 — PIPING FLOW & VELOCITY SIZER
                Standards: DIN 11850, EHEDG Doc. 9, Darcy-Weisbach, IEC 60534
            ================================================================ */}
            {activeTool === 'pipe' && (
<div className="max-w-4xl space-y-5">
{view === 'inputs' && (<>
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-6">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2 pb-3 border-b border-slate-100">
                    <Activity className="w-5 h-5 text-cyan-600" />
                    <span>Flow Rate, Velocity & Pressure Drop</span>
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <SliderRow label="Flow Rate" value={flowRateM3H} min={0.1} max={200} step={0.5} unit=" m³/h"
                      note="Typical beverage CIP: 10–60 m³/h. Process product: 2–30 m³/h"
                      onChange={setFlowRateM3H} formatValue={(v) => v.toFixed(1)} />
                    <SliderRow label="Fluid Viscosity" value={fluidViscosityCp} min={0.5} max={500} step={0.5} unit=" cP"
                      note="Water=1.0, light syrup≈5, 65°Brix syrup≈50, honey≈10,000 cP"
                      onChange={setFluidViscosityCp} formatValue={(v) => v.toFixed(1)} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">Pipe Size (DIN 11850 Sanitary Tube)</span>
                    <div className="flex flex-wrap gap-2">
                      {PIPE_OPTIONS.map((p) => (
                        <button key={p.id}
                          onClick={() => setPipeDiameterMm(p.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                            pipeDiameterMm === p.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                          }`}
                        >{p.label.split(' ')[0]} <span className="font-normal opacity-70">{p.label.split('–')[1]?.trim()}</span></button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">Piping Duty / Application</span>
                    <PillGroup
                      options={[
                        { label: 'Product Process', value: 'PROCESS', sub: '0.5–2.0 m/s' },
                        { label: 'CIP Cleaning', value: 'CIP', sub: '1.5–2.5 m/s' },
                        { label: 'Pump Suction', value: 'SUCTION', sub: 'max 1.2 m/s' },
                        { label: 'Utility / Water', value: 'UTILITY', sub: '0.5–3.0 m/s' },
                      ]}
                      value={pipingApp}
                      onChange={(v) => setPipingApp(v as typeof pipingApp)}
                    />
                  </div>
                </div>
</>)}
{view === 'gauge' && (<>
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Velocity Gauge — 0 to 5 m/s</span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${velStatus.color}`}>{velStatus.label}</span>
                  </div>
                  <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden">
                    <div className="absolute top-0 left-0 h-full bg-slate-200 rounded-full" style={{ width: '40%' }} />
                    <div className="absolute top-0 left-[40%] h-full bg-slate-200/50 rounded-full" style={{ width: '20%' }} />
                    {/* Colored fill */}
                    <div
                      className={`absolute top-0 left-0 h-full rounded-full transition-all ${velStatus.bar}`}
                      style={{ width: `${Math.min((fluidVelocityMS / 5) * 100, 100)}%` }}
                    />
                    {/* Zone markers */}
                    <div className="absolute top-0 left-[40%] h-full w-px bg-white/60" />
                    <div className="absolute top-0 left-[60%] h-full w-px bg-white/60" />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>0</span><span>Too Slow</span><span>Optimal</span><span>High</span><span>5.0 m/s</span>
                  </div>
                </div>
</>)}
{view === 'standards' && (<>
                <NoteCard icon={<Info className="w-5 h-5 text-cyan-600" />} title="EHEDG Velocity Design Limits" color="bg-cyan-50/80 border-cyan-200 text-cyan-950">
                  <div className="grid grid-cols-2 gap-x-4 text-xs text-cyan-900 leading-relaxed">
                    <div><strong>Product line:</strong> 1.2–2.0 m/s — minimize shear on liquid foods</div>
                    <div><strong>CIP return:</strong> 1.5–2.2 m/s — turbulent wall scrub Re &gt; 10,000</div>
                    <div><strong>Pump suction:</strong> ≤ 1.2 m/s — prevent cavitation (NPSH margin)</div>
                    <div><strong>Water hammer:</strong> &gt; 3.0 m/s — surge arrester required</div>
                  </div>
                </NoteCard>
</>)}
</div>
)}

            {/* ================================================================
                TOOL 3 — REVERSE WHT & GST GROSS-UP
                FBR Income Tax Ordinance 2001, Finance Act 2024
            ================================================================ */}
            {activeTool === 'wht' && (
<div className="max-w-4xl space-y-5">
{view === 'inputs' && (<>
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-6">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2 pb-3 border-b border-slate-100">
                    <Calculator className="w-5 h-5 text-[#FF4D6D]" />
                    <span>Reverse Gross-Up Calculator</span>
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-5">
                      <SliderRow label="Base / Supplier Cost (PKR)" value={baseCost} min={1000} max={500000} step={500}
                        unit="" note="Your purchase cost or cost of goods before margin"
                        onChange={setBaseCost} formatValue={(v) => `Rs. ${v.toLocaleString()}`} />
                      <SliderRow label="Target Net Margin" value={marginPct} min={1} max={50} step={0.5}
                        unit="%" note="Gross profit margin you want to retain after WHT deduction"
                        onChange={setMarginPct} formatValue={(v) => v.toFixed(1)} />
                    </div>
                    <div className="space-y-5">
                      <div>
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">WHT Rate (FBR Schedule)</span>
                        <PillGroup
                          options={[
                            { label: '0%', value: 0, sub: 'Exempt' },
                            { label: '5%', value: 5, sub: 'Special Filer' },
                            { label: '8%', value: 8, sub: 'Goods Filer' },
                            { label: '11%', value: 11, sub: 'Services' },
                            { label: '16%', value: 16, sub: 'Non-Filer' },
                          ]}
                          value={whtPct}
                          onChange={(v) => setWhtPct(v as number)}
                        />
                        <p className="text-[11px] text-slate-400 mt-2">Section 153(1)(a) — ITO 2001 / Finance Act 2024. 8% is standard for goods/supply to corporate buyers.</p>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">Sales Tax / GST Mode</span>
                        <PillGroup
                          options={[
                            { label: 'No GST', value: 'NONE', sub: '0%' },
                            { label: 'FBR GST', value: 'GST18', sub: '18%' },
                            { label: 'SRB Sindh', value: 'SRB13', sub: '13%' },
                            { label: 'Custom', value: 'CUSTOM', sub: `${customGstPct}%` },
                          ]}
                          value={gstMode}
                          onChange={(v) => setGstMode(v as typeof gstMode)}
                        />
                        {gstMode === 'CUSTOM' && (
                          <input type="number" value={customGstPct} step={0.5}
                            onChange={(e) => setCustomGstPct(parseFloat(e.target.value) || 0)}
                            className="mt-2 w-28 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-mono text-slate-900 focus:outline-none focus:border-[#FF4D6D]"
                            placeholder="Custom %"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
</>)}
{view === 'compare' && (<>
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">WHT Rate Comparison</div>
                  <div className="space-y-1.5">
                    {[0, 5, 8, 11, 16].map((rate) => {
                      const net = baseCost * (1 + marginPct / 100);
                      const price = net / (1 - rate / 100);
                      const isActive = rate === whtPct;
                      return (
                        <div key={rate} className={`flex items-center justify-between py-2 px-3 rounded-lg text-sm ${isActive ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-700'}`}>
                          <span className="font-mono font-bold">{rate}%</span>
                          <span className="text-xs opacity-70">{rate === 0 ? 'Exempt' : rate === 5 ? 'Special Filer' : rate === 8 ? 'Goods Filer' : rate === 11 ? 'Services' : 'Non-Filer'}</span>
                          <span className="font-black font-mono">Rs. {Math.round(price).toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
</>)}
{view === 'formula' && (<>
                <NoteCard icon={<Info className="w-5 h-5 text-amber-600" />} title="Golden Rule of Commercial Tax Math" color="bg-amber-50/80 border-amber-200 text-amber-950">
                  <p className="text-sm font-mono font-bold text-amber-900">UnitPrice = (BaseCost × (1 + Margin)) ÷ (1 − WHT%)</p>
                  <p className="text-xs text-amber-800 leading-relaxed">Always <strong>divide</strong> by (1 − WHT%). Never multiply by (1 + WHT%). Clients deduct WHT on gross invoiced value — multiplying leaves you short in bank.</p>
                </NoteCard>
</>)}
</div>
)}

            {/* ================================================================
                TOOL 4 — INCOTERM LANDED COST ESTIMATOR
                Pakistan Customs: CD (SRO 760), RD (SRO 471), ACD (Budget 2024)
                Import WHT: Section 148, ITO 2001 — 6% for filers
            ================================================================ */}
            {activeTool === 'incoterm' && (
<div className="max-w-4xl space-y-5">
{view === 'inputs' && (<>
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-6">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2 pb-3 border-b border-slate-100">
                    <Truck className="w-5 h-5 text-amber-600" />
                    <span>EXW → DDP Landed Cost (Pakistan)</span>
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-5">
                      <SliderRow label="Supplier EXW Price" value={exwUsd} min={100} max={50000} step={50}
                        unit=" USD" note="Ex-Works price at supplier's factory gate (before any freight)"
                        onChange={setExwUsd} formatValue={(v) => `$${v.toLocaleString()}`} />
                      <SliderRow label="USD → PKR Exchange Rate" value={pkrRate} min={250} max={340} step={0.5}
                        unit="" note="SBP open market rate. Update with live rate from forex.pk"
                        onChange={setPkrRate} formatValue={(v) => v.toFixed(1)} />
                      <SliderRow label="Port Clearing & Inland" value={inlandPkr} min={5000} max={100000} step={1000}
                        unit="" note="Port handling, clearing agent fee, inland transport to site"
                        onChange={setInlandPkr} formatValue={(v) => `Rs. ${v.toLocaleString()}`} />
                    </div>
                    <div className="space-y-5">
                      <div>
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">Freight Mode</span>
                        <PillGroup
                          options={[
                            { label: '✈ Air Express', value: 'AIR', sub: '≈16.5% EXW' },
                            { label: '🚢 Ocean FCL', value: 'SEA', sub: '≈6.5% EXW' },
                          ]}
                          value={freightMode}
                          onChange={(v) => setFreightMode(v as 'AIR' | 'SEA')}
                        />
                      </div>
                      <SliderRow label="Customs Duty (CD)" value={cdPct} min={0} max={35} step={1}
                        unit="%" note="SRO 760(I)/2013: Automation/electrical 10–25%, machinery 5–10%"
                        onChange={setCdPct} />
                      <SliderRow label="Regulatory Duty (RD)" value={rdPct} min={0} max={15} step={1}
                        unit="%" note="SRO 471(I)/2015: Varies 0–15% by HS tariff heading"
                        onChange={setRdPct} />
                      <SliderRow label="Additional CD (ACD)" value={acdPct} min={0} max={10} step={1}
                        unit="%" note="Budget 2024 ACD on most imports: typically 5%"
                        onChange={setAcdPct} />
                    </div>
                  </div>
                </div>
</>)}
{view === 'breakdown' && (<>
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs font-mono text-sm">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Cost Breakdown</div>
                  <div className="space-y-2.5">
                    {[
                      { label: `EXW (${exwUsd.toLocaleString()} USD × ${pkrRate})`, value: exwPkr, sub: `$${exwUsd.toLocaleString()} USD` },
                      { label: `${freightMode === 'AIR' ? 'Air Express' : 'Ocean'} Freight (${FREIGHT_PCT[freightMode]}%)`, value: freightPkr },
                      { label: `Customs Duty CD (${cdPct}% of CIF)`, value: cdPkr },
                      { label: `Regulatory Duty RD (${rdPct}% of CIF)`, value: rdPkr },
                      { label: `Additional CD ACD (${acdPct}% of CIF)`, value: acdPkr },
                      { label: `Import WHT (${importWhtPct}% of assessable value)`, value: importWhtPkr },
                      { label: 'Port Clearing & Inland Logistics', value: inlandPkr },
                    ].map((row, i) => (
                      <div key={i} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                        <span className="font-sans text-slate-600 text-sm">{i + 1}. {row.label}</span>
                        <div className="text-right">
                          <span className="font-bold text-slate-900">Rs. {Math.round(row.value).toLocaleString()}</span>
                          {row.sub && <div className="text-[10px] text-slate-400">{row.sub}</div>}
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between items-center py-3 bg-slate-50 rounded-xl px-4 mt-2 border border-slate-200">
                      <span className="font-bold text-slate-900 font-sans">Estimated DDP Landed Cost</span>
                      <div className="text-right">
                        <div className="text-2xl font-black text-[#FF4D6D]">Rs. {Math.round(totalDdpPkr).toLocaleString()}</div>
                        <div className="text-xs text-slate-500">+{totalMarkupPct.toFixed(1)}% over EXW</div>
                      </div>
                    </div>
                  </div>
                </div>
</>)}
{view === 'note' && (<>
                <NoteCard icon={<AlertTriangle className="w-5 h-5 text-amber-600" />} title="Pakistan Customs Note" color="bg-amber-50/80 border-amber-200 text-amber-950">
                  <p className="text-xs text-amber-800 leading-relaxed">Import WHT (Section 148, ITO 2001) is 6% for filers on CIF + duties. Rates vary by HS code — verify via FBR's customs portal (customs.fbr.gov.pk) before final commercial negotiation. WEBOC clearance adds 2–5 working days.</p>
                </NoteCard>
</>)}
</div>
)}

            {/* ================================================================
                TOOL 5 — SWITCHGEAR CROSS-REFERENCE
                IEC 60947-4-1 (Contactors), IEC 60947-5-1 (Control Devices)
            ================================================================ */}
            {activeTool === 'crossref' && (
<div className="max-w-5xl space-y-5">
{view === 'table' && (<>
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                        <ArrowRightLeft className="w-5 h-5 text-[#FF4D6D]" />
                        <span>Siemens ↔ Schneider ↔ ABB Cross-Reference</span>
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">IEC 60947-4-1 equivalents. AC-3 rated. Verify coil voltage before ordering.</p>
                    </div>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input type="text" placeholder="Search model or SKU..."
                        value={crossSearch} onChange={(e) => setCrossSearch(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-full pl-9 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#FF4D6D] focus:bg-white font-mono w-64"
                      />
                    </div>
                  </div>
                  <div>
                    <PillGroup
                      options={catOptions.map((c) => ({ label: c === 'ALL' ? 'All Types' : c === 'RELAY' ? 'Auxiliary Relays' : c === 'POWER' ? 'Power Contactors' : c === 'PLC' ? 'PLCs & Safety' : 'Overload Relays', value: c }))}
                      value={categoryFilter}
                      onChange={(v) => setCategoryFilter(String(v))}
                    />
                  </div>
                </div>
                <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          <th className="py-3 px-4">Equipment Class</th>
                          <th className="py-3 px-4 text-cyan-700">Siemens SIRIUS</th>
                          <th className="py-3 px-4 text-emerald-700">Schneider TeSys</th>
                          <th className="py-3 px-4 text-[#FF4D6D]">ABB Control</th>
                          <th className="py-3 px-4 text-slate-500">Rating / Coil</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredCross.length === 0 ? (
                          <tr><td colSpan={5} className="py-10 text-center text-sm text-slate-400">No matches found. Try different search term or category.</td></tr>
                        ) : filteredCross.map((row, i) => (
                          <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4 font-semibold text-slate-800 text-sm max-w-[200px]">{row.category}</td>
                            <td className="py-3 px-4 font-bold text-cyan-700 font-mono text-xs">{row.siemens}</td>
                            <td className="py-3 px-4 font-bold text-emerald-700 font-mono text-xs">{row.schneider}</td>
                            <td className="py-3 px-4 font-bold text-[#FF4D6D] font-mono text-xs">{row.abb}</td>
                            <td className="py-3 px-4 text-xs text-slate-500 font-mono">
                              <div>{row.rating}</div>
                              <div className="text-[10px] text-slate-400">{row.coil}</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
</>)}
{view === 'checklist' && (<>
                <NoteCard icon={<AlertTriangle className="w-5 h-5 text-rose-500" />} title="Cross-Reference Validation Checklist" color="bg-rose-50/60 border-rose-200 text-rose-950">
                  <div className="grid grid-cols-2 gap-x-4 text-xs text-rose-900 leading-relaxed">
                    <div>✓ <strong>Coil voltage</strong> must exactly match PLC output card rating</div>
                    <div>✓ <strong>AC-3 duty current</strong> ≥ 1.25× motor FLA at site voltage</div>
                    <div>✓ <strong>Contact configuration</strong> (NO/NC quantity) meets circuit design</div>
                    <div>✓ <strong>Mechanical life</strong>: check cycles for high-frequency switching duty</div>
                  </div>
                </NoteCard>
</>)}
</div>
)}

            {/* ================================================================
                TOOL 6 — MOTOR FLA & CABLE SIZER
                IEC 60034-1 (Motor ratings), IEC 60364-5-52 (Cable sizing),
                IEC 60947-4-1 (Contactor AC-3 duty)
            ================================================================ */}
            {activeTool === 'motor' && (
<div className="max-w-4xl space-y-5">
{view === 'inputs' && (<>
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-6">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2 pb-3 border-b border-slate-100">
                    <Zap className="w-5 h-5 text-purple-600" />
                    <span>3-Phase Motor FLA, Cable & Starter Sizing (415V / 50Hz)</span>
                  </h2>

                  {/* Motor kW — IEC standard step sizes */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Motor Rating (IEC 60034-1 Standard Sizes)</span>
                      <span className="text-sm font-black font-mono text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                        {motorKw} kW <span className="text-slate-500 font-normal text-xs">({(motorKw * 1.341).toFixed(1)} HP)</span>
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {IEC_MOTOR_SIZES.map((kw, idx) => (
                        <button key={kw}
                          onClick={() => setMotorKwIdx(idx)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                            motorKwIdx === idx ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                          }`}
                        >{kw}</button>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-400">IEC 60034-1 standard frame sizes. Click to select motor rating.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-5">
                      <SliderRow label="Power Factor (cos φ)" value={motorPf} min={0.70} max={0.95} step={0.01}
                        unit="" note="IE2 motors: 0.82–0.88 | IE3 motors: 0.86–0.92 (IEC 60034-30-1)"
                        onChange={setMotorPf} formatValue={(v) => v.toFixed(2)} />
                      <SliderRow label="Motor Efficiency (η)" value={motorEff} min={0.78} max={0.97} step={0.01}
                        unit="" note="IE2 eff: 0.85–0.91 | IE3 eff: 0.88–0.94 | IE4 eff: 0.91–0.96"
                        onChange={setMotorEff} formatValue={(v) => `${(v * 100).toFixed(0)}%`} />
                    </div>
                    <div className="space-y-5">
                      <div>
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">Starting Method</span>
                        <PillGroup
                          options={[
                            { label: 'DOL', value: 'DOL', sub: '6.5× FLA' },
                            { label: 'Star-Delta', value: 'STARDELTA', sub: '2.3× FLA' },
                            { label: 'VFD / Inverter', value: 'VFD', sub: '1.0× FLA' },
                          ]}
                          value={starterType}
                          onChange={(v) => setStarterType(v as typeof starterType)}
                        />
                        <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">{getStarterNote(motorKw, starterType)}</p>
                      </div>
                      <div>
                        <SliderRow label="Ambient Temperature" value={ambientTemp} min={25} max={60} step={1}
                          unit="°C" note="IEC 60364: Derate cable capacity 1% per °C above 40°C"
                          onChange={setAmbientTemp} />
                      </div>
                    </div>
                  </div>
                </div>
</>)}
{view === 'data' && (<>
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Complete Motor Data Summary</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm font-mono">
                    {[
                      ['Motor Power', `${motorKw} kW / ${(motorKw * 1.341).toFixed(1)} HP`],
                      ['Supply Voltage', '415V 3-phase 50Hz'],
                      ['Power Factor', `${motorPf.toFixed(2)} cos φ`],
                      ['Efficiency (η)', `${(motorEff * 100).toFixed(0)}%`],
                      ['FLA', `${fla.toFixed(2)} A`],
                      ['Contactor AC-3', `${getContactor(contactorTarget)} A frame`],
                      ['Thermal O/L', `${fla.toFixed(1)} A set point`],
                      ['Cable Size', getCable(deratedFla)],
                    ].map(([k, v]) => (
                      <div key={k} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                        <div className="text-[10px] text-slate-500 uppercase font-bold">{k}</div>
                        <div className="text-sm font-black text-slate-900 mt-0.5">{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
</>)}
{view === 'formula' && (<>
                <NoteCard icon={<Zap className="w-5 h-5 text-purple-600" />} title="IEC Motor Engineering Formula" color="bg-purple-50/80 border-purple-200 text-purple-950">
                  <p className="text-sm font-mono font-bold text-purple-900">I_FLA = P(W) ÷ (√3 × V × cos φ × η)</p>
                  <div className="grid grid-cols-2 gap-x-4 text-xs text-purple-800 leading-relaxed">
                    <div>Contactor must be rated ≥125% FLA for AC-3 duty (IEC 60947-4-1)</div>
                    <div>Star-Delta: use 3 contactors. Main + Star (simultaneous), Delta (after delay ~6s)</div>
                    <div>VFD: contactor rated to motor FLA only. Add EMC filter and output choke</div>
                    <div>Cable derating per IEC 60364-5-52 Table B.52.3 (grouping + temperature)</div>
                  </div>
                </NoteCard>
</>)}
</div>
)}

          </div>
        </div>

      ) : (
        /* ─── TOOL CATALOG GRID ───────────────────────────────────────────── */
        <div className="flex-1 flex flex-col h-full overflow-hidden space-y-4">
          {/* Header */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs flex-shrink-0">
            <div>
              <div className="flex items-center space-x-2">
                <Wrench className="w-5 h-5 text-[#FF4D6D]" />
                <h1 className="text-lg sm:text-xl font-bold text-slate-900">Engineering Tools Suite</h1>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">6 precision calculators for beverage, automation, electrical, and commercial engineering.</p>
            </div>
            <div className="relative flex-1 sm:w-64 max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input type="text" placeholder="Search tools or formulas..."
                value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-full pl-9 pr-4 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#FF4D6D] focus:bg-white font-mono"
              />
            </div>
          </div>

          {/* Discipline Chips */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 flex-shrink-0">
            {[
              { id: 'ALL', label: 'All (6)' },
              { id: 'PROCESS', label: 'Beverage & Process' },
              { id: 'MECHANICAL', label: 'Hydraulics & Piping' },
              { id: 'COMMERCIAL', label: 'Tax & Logistics' },
              { id: 'AUTOMATION', label: 'Switchgear' },
              { id: 'ELECTRICAL', label: 'Electrical & Motors' },
            ].map((f) => (
              <button key={f.id}
                onClick={() => setSelectedDiscipline(f.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedDiscipline === f.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >{f.label}</button>
            ))}
          </div>

          {/* Cards */}
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
                        <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${tool.badgeColor}`}>{tool.badge}</span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-[#FF4D6D] transition-colors leading-snug">{tool.title}</h3>
                      <p className="text-xs text-slate-500 mt-2 leading-relaxed">{tool.description}</p>
                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                        <span className="text-[11px] font-mono text-slate-400 font-bold block">Formula: {tool.formula}</span>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {tool.highlights.map((h, i) => (
                            <span key={i} className="text-[10px] bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md font-medium">✓ {h}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-medium">Click card to launch</span>
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
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center bg-transparent text-slate-400 font-mono text-xs">
        Loading Engineering Tools...
      </div>
    }>
      <ToolsContent />
    </Suspense>
  );
}
