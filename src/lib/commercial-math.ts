// ==============================================================================
// OOS Procurement Commercial Math & Predictive Margin Engine
// ==============================================================================

export type TaxMode = 'WITHOUT_GST' | 'GST_18' | 'CUSTOM';
export type ConfidenceLevel = 'GREEN' | 'YELLOW' | 'RED';
export type IncotermCode = 'DDP' | 'EXW' | 'FOB' | 'CIF' | 'UNSPECIFIED';

export interface IncotermInfo {
  code: IncotermCode;
  badge: string;
  tooltip: string;
  badgeShort: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  color: string;
}

export const INCOTERM_DICTIONARY: Record<IncotermCode, IncotermInfo> = {
  DDP: {
    code: 'DDP',
    badge: '🚚 Supplier Delivers to Door (DDP)',
    badgeShort: 'DDP (Delivered)',
    tooltip: 'Safe: Supplier pays all shipping, customs, and duties to our door.',
    riskLevel: 'LOW',
    color: 'emerald',
  },
  EXW: {
    code: 'EXW',
    badge: '🏭 We Pick Up at Factory (EXW)',
    badgeShort: 'EXW (Ex-Works)',
    tooltip: 'Warning: Extra cost! We must pay freight, insurance, and customs from their factory.',
    riskLevel: 'HIGH',
    color: 'amber',
  },
  FOB: {
    code: 'FOB',
    badge: '🚢 Port Only (FOB)',
    badgeShort: 'FOB (Port Only)',
    tooltip: 'Warning: Supplier delivers to port only; we pay ocean freight and local clearance.',
    riskLevel: 'MEDIUM',
    color: 'blue',
  },
  CIF: {
    code: 'CIF',
    badge: '🚢 Sea Freight & Insurance (CIF)',
    badgeShort: 'CIF (Freight Paid)',
    tooltip: 'Supplier pays ocean freight and basic insurance to destination port; we handle port clearance and duties.',
    riskLevel: 'MEDIUM',
    color: 'indigo',
  },
  UNSPECIFIED: {
    code: 'UNSPECIFIED',
    badge: '❓ Terms Unspecified',
    badgeShort: 'Unspecified',
    tooltip: 'Ask supplier if price includes delivery to our warehouse or is ex-counter Brandreth Rd.',
    riskLevel: 'HIGH',
    color: 'gray',
  },
};

export interface PricingCalculationResult {
  baseCost: number;
  marginPct: number;
  targetPrice: number; // Base cost + profit margin
  whtPct: number;
  grossedUpPrice: number; // targetPrice / (1 - whtPct/100)
  whtDeductionAmount: number; // grossedUpPrice * (whtPct/100)
  netProceedsAfterWht: number; // grossedUpPrice - whtDeductionAmount (should match targetPrice)
  taxMode: TaxMode;
  appliedTaxPct: number;
  taxAmount: number; // calculated on grossedUpPrice if GST applicable
  finalUnitPrice: number; // grossedUpPrice + taxAmount
}

/**
 * Calculates pricing with strict WHT Reverse Gross-Up and Tax Modes
 * Rule: Never add WHT as a flat %!
 * GrossedUp = Target / (1 - (wht / 100))
 * Client withholding = GrossedUp * (wht / 100)
 * Net received = GrossedUp - Client withholding == Target.
 */
export function calculateCommercialPricing(
  baseCost: number,
  marginPct: number,
  whtPct: number = 0,
  taxMode: TaxMode = 'WITHOUT_GST',
  customTaxPct: number = 0
): PricingCalculationResult {
  const safeCost = Math.max(0, Number(baseCost) || 0);
  const safeMargin = Number(marginPct) || 0;
  const safeWht = Math.min(95, Math.max(0, Number(whtPct) || 0)); // Prevent division by zero or negative

  // 1. Target price with company margin
  const targetPrice = safeCost * (1 + safeMargin / 100);

  // 2. Reverse Gross-up for WHT
  const whtFactor = safeWht > 0 ? (1 - safeWht / 100) : 1;
  const grossedUpPrice = targetPrice / whtFactor;
  const whtDeductionAmount = grossedUpPrice * (safeWht / 100);
  const netProceedsAfterWht = grossedUpPrice - whtDeductionAmount;

  // 3. Tax mode
  let appliedTaxPct = 0;
  if (taxMode === 'GST_18') {
    appliedTaxPct = 18;
  } else if (taxMode === 'CUSTOM') {
    appliedTaxPct = Math.max(0, Number(customTaxPct) || 0);
  } else {
    appliedTaxPct = 0;
  }

  const taxAmount = grossedUpPrice * (appliedTaxPct / 100);
  const finalUnitPrice = grossedUpPrice + taxAmount;

  return {
    baseCost: safeCost,
    marginPct: safeMargin,
    targetPrice: round2(targetPrice),
    whtPct: safeWht,
    grossedUpPrice: round2(grossedUpPrice),
    whtDeductionAmount: round2(whtDeductionAmount),
    netProceedsAfterWht: round2(netProceedsAfterWht),
    taxMode,
    appliedTaxPct,
    taxAmount: round2(taxAmount),
    finalUnitPrice: round2(finalUnitPrice),
  };
}

/**
 * Evaluates rate confidence decay and suggests dynamic protective margin
 * Strictly uses source_validity_date (when supplier validated price)
 */
export function evaluateConfidence(
  sourceValidityDate: string | Date,
  hasEvidence: boolean = false,
  isVerifiedSupplier: boolean = false
): {
  level: ConfidenceLevel;
  suggestedMarginPct: number;
  ageDays: number;
  label: string;
  pillColor: string;
  badgeIcon: string;
  explanation: string;
} {
  const validDate = new Date(sourceValidityDate);
  const today = new Date();
  const diffTime = today.getTime() - validDate.getTime();
  const ageDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

  if (ageDays <= 30 && (hasEvidence || isVerifiedSupplier)) {
    return {
      level: 'GREEN',
      suggestedMarginPct: 15,
      ageDays,
      label: '🟢 High Confidence',
      pillColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      badgeIcon: '🟢',
      explanation: `Fresh quote (${ageDays}d old) with verified evidence. Standard 15% margin recommended.`,
    };
  }

  if (ageDays <= 90) {
    return {
      level: 'YELLOW',
      suggestedMarginPct: 20,
      ageDays,
      label: '🟡 Moderate Risk',
      pillColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      badgeIcon: '🟡',
      explanation: `Aging rate (${ageDays}d old). +5% volatility buffer added (20% margin recommended).`,
    };
  }

  return {
    level: 'RED',
    suggestedMarginPct: 25,
    ageDays,
    label: '🔴 Stale Rate',
    pillColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    badgeIcon: '🔴',
    explanation: `Stale rate (${ageDays}d old). Market prices likely changed. +10% stale risk buffer (25% margin) or re-verify.`,
  };
}

export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function formatPKR(val: number): string {
  return new Intl.NumberFormat('en-PK', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(val);
}

export function formatUSD(val: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(val);
}
