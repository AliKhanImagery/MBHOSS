// ==============================================================================
// The life of a quote: who owns it, whether it is on hold (and why), whether it is
// archived, and whether its prices have gone stale. Pure functions, no I/O.
//
// Rules (decided with the owner):
//   - Nothing is deleted by accident: "archive" hides a quote, and its number stays reserved.
//   - Only the owner of a quote, or an admin, may archive or restore it.
//   - Only an admin may delete for good, and only an archived quote.
//   - A quote with a pending rate cannot be downloaded.
//   - Prices older than STALE_PRICE_DAYS must be rechecked (or confirmed) before sending.
// ==============================================================================

import { isAdminRole } from './roles';
import type { Lifecycle, QuoteCheck, QuotationCase, QuotationTemplate, WaitingInfo, WaitingReason } from '../types';

export const STALE_PRICE_DAYS = 30; // decided by the owner: prices older than 30 days must be rechecked
const LOG_LIMIT = 50;

export const WAITING_LABEL: Record<WaitingReason, string> = {
  rate_pending: 'Supplier rate pending',
  ceo_confirming: 'CEO confirming',
  client_clarification: 'Client clarification',
  market_news: 'Market / industry news',
  other: 'Other',
};
export const WAITING_REASONS = Object.keys(WAITING_LABEL) as WaitingReason[];

export interface Actor { id: string; name: string; role?: string }

const day = (d: Date) => d.toISOString().slice(0, 10);
const toDays = (iso: string) => Math.floor(Date.parse(iso.slice(0, 10) + 'T00:00:00Z') / 86400000);
export function daysBetween(fromIso: string, toIso: string): number {
  return toDays(toIso) - toDays(fromIso);
}
export const addDays = (iso: string, n: number) => new Date((toDays(iso) + n) * 86400000).toISOString().slice(0, 10);

function logged(lc: Lifecycle, by: string, text: string, now: Date): Lifecycle {
  const log = [...(lc.log ?? []), { at: now.toISOString(), by, text }];
  return { ...lc, log: log.slice(-LOG_LIMIT) };
}

// ─── ownership and permissions ───────────────────────────────────────────────

/** Sets the owner once (the person who first saves the quote). Never overwrites. */
export function withOwner(lc: Lifecycle | undefined, who: Actor): Lifecycle {
  const cur = lc ?? {};
  return cur.ownerId ? cur : { ...cur, ownerId: who.id, ownerName: who.name };
}

export const isArchived = (lc?: Lifecycle) => !!lc?.archived;

/** Owner or admin. A quote with no recorded owner (made before owners were tracked) is admin-only. */
export function canArchive(lc: Lifecycle | undefined, who: Actor): boolean {
  return isAdminRole(who.role) || (!!lc?.ownerId && lc.ownerId === who.id);
}

export const canDeleteForever = (lc: Lifecycle | undefined, who: Actor): boolean => isAdminRole(who.role) && isArchived(lc);

// ─── archive / restore ───────────────────────────────────────────────────────

export function archive(lc: Lifecycle | undefined, who: Actor, now: Date): Lifecycle {
  const cur = lc ?? {};
  if (cur.archived) return cur;
  return logged({ ...cur, archived: { at: now.toISOString(), by: who.name } }, who.name, 'Archived', now);
}

export function restore(lc: Lifecycle | undefined, who: Actor, now: Date): Lifecycle {
  const cur = lc ?? {};
  if (!cur.archived) return cur;
  return logged({ ...cur, archived: null }, who.name, 'Restored from archive', now);
}

// ─── hold / resume ───────────────────────────────────────────────────────────

export function hold(lc: Lifecycle | undefined, w: { reason: WaitingReason; note: string; owner: string; followUp: string | null }, who: Actor, now: Date): Lifecycle {
  const cur = lc ?? {};
  const info: WaitingInfo = {
    reason: w.reason,
    note: w.note.trim().slice(0, 200),
    owner: w.owner.trim() || who.name,
    followUp: w.followUp && /^\d{4}-\d{2}-\d{2}$/.test(w.followUp) ? w.followUp : null,
    since: cur.waiting?.since ?? now.toISOString(),
    by: cur.waiting?.by ?? who.name,
  };
  const text = `${cur.waiting ? 'Hold updated' : 'Put on hold'}: ${WAITING_LABEL[info.reason]}${info.note ? ` — ${info.note}` : ''}`;
  return logged({ ...cur, waiting: info }, who.name, text, now);
}

export function resume(lc: Lifecycle | undefined, who: Actor, now: Date): Lifecycle {
  const cur = lc ?? {};
  if (!cur.waiting) return cur;
  return logged({ ...cur, waiting: null }, who.name, 'Resumed', now);
}

export function confirmPrices(lc: Lifecycle | undefined, who: Actor, now: Date): Lifecycle {
  return logged({ ...(lc ?? {}), pricesConfirmedAt: day(now) }, who.name, 'Prices rechecked and confirmed', now);
}

export type FollowUpState = 'none' | 'overdue' | 'today' | 'upcoming';
export function followUpState(w: WaitingInfo | null | undefined, todayIso: string): FollowUpState {
  if (!w?.followUp) return 'none';
  const d = daysBetween(todayIso, w.followUp);
  return d < 0 ? 'overdue' : d === 0 ? 'today' : 'upcoming';
}

// ─── price freshness ─────────────────────────────────────────────────────────

/** Days since the prices were last known good: the quote's date, or the last "rechecked" tap, whichever is later. */
export function priceAgeDays(q: Pick<QuotationTemplate, 'date' | 'lifecycle'>, todayIso: string): number {
  const base = q.lifecycle?.pricesConfirmedAt && q.lifecycle.pricesConfirmedAt > q.date ? q.lifecycle.pricesConfirmedAt : q.date;
  return Math.max(0, daysBetween(base, todayIso));
}

/** Last day the quoted prices hold, or null when no validity is set. */
export function validUntil(q: Pick<QuotationTemplate, 'date' | 'validityDays'>): string | null {
  return q.validityDays > 0 && q.date ? addDays(q.date, q.validityDays) : null;
}

// ─── checks shown on the quote ───────────────────────────────────────────────

export function lifecycleChecks(q: QuotationTemplate, todayIso: string): QuoteCheck[] {
  const out: QuoteCheck[] = [];
  q.lineItems.forEach((l, i) => {
    if (l.ratePending) out.push({ severity: 'block', code: 'rate_pending', message: `Line ${i + 1}: the rate is still pending. Enter it to continue.`, lineId: l.id });
  });
  const age = priceAgeDays(q, todayIso);
  if (q.lineItems.length > 0 && age > STALE_PRICE_DAYS) {
    out.push({ severity: 'warn', code: 'stale_prices', message: `Prices were last confirmed ${age} days ago. Recheck them before sending.` });
  }
  const until = validUntil(q);
  if (until && until < todayIso) out.push({ severity: 'warn', code: 'validity_passed', message: `The validity of this quote ended on ${until}.` });
  if (q.lifecycle?.waiting) {
    out.push({ severity: 'warn', code: 'on_hold', message: `This quote is on hold: ${WAITING_LABEL[q.lifecycle.waiting.reason]}.` });
  }
  return out;
}

// ─── the "needs attention" list ──────────────────────────────────────────────

export interface AttentionItem { caseId: string; caseRef: string; clientName: string; kind: 'overdue' | 'today' | 'expiring' | 'expired' | 'long_wait'; text: string; rank: number }

export function attentionList(cases: QuotationCase[], todayIso: string): AttentionItem[] {
  const items: AttentionItem[] = [];
  for (const c of cases) {
    const q = c.templateState;
    const lc = q?.lifecycle;
    if (!q || isArchived(lc) || c.status === 'Completed') continue;
    const base = { caseId: c.id, caseRef: c.caseRef, clientName: c.clientName };
    const w = lc?.waiting;
    const fu = followUpState(w, todayIso);
    if (w && fu === 'overdue') items.push({ ...base, kind: 'overdue', rank: 0, text: `Follow-up was due ${w.followUp} — ${WAITING_LABEL[w.reason]}${w.owner ? ` (${w.owner})` : ''}` });
    else if (w && fu === 'today') items.push({ ...base, kind: 'today', rank: 1, text: `Follow up today — ${WAITING_LABEL[w.reason]}${w.owner ? ` (${w.owner})` : ''}` });
    else if (w && daysBetween(w.since, todayIso) >= 7) items.push({ ...base, kind: 'long_wait', rank: 4, text: `On hold for ${daysBetween(w.since, todayIso)} days — ${WAITING_LABEL[w.reason]}` });
    const until = validUntil(q);
    if (until) {
      const left = daysBetween(todayIso, until);
      if (left < 0) items.push({ ...base, kind: 'expired', rank: 3, text: `Validity ended ${until}` });
      else if (left <= 2) items.push({ ...base, kind: 'expiring', rank: 2, text: left === 0 ? 'Validity ends today' : `Validity ends in ${left} day${left === 1 ? '' : 's'}` });
    }
  }
  return items.sort((a, b) => a.rank - b.rank);
}
