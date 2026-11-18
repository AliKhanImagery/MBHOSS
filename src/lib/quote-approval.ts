// ==============================================================================
// Approval before download. Pure functions, no I/O.
//
// Rules (decided with the owner):
//   - The quote's owner (or an admin) asks ONE named colleague to approve it.
//   - That colleague may change anything, prices included, and then approve or send it back.
//   - The quote stays editable while it waits.
//   - Editing an approved quote withdraws the approval (it is tied to exactly what was approved).
//   - Only an approved quote can be downloaded. Admins can always download.
// ==============================================================================

import { isAdminRole } from './roles';
import type { ApprovalInfo, Lifecycle, QuoteCheck, QuotationCase, QuotationTemplate } from '../types';
import type { Actor } from './quote-lifecycle';

const LOG_LIMIT = 50;
const RECENT_DAYS = 14;

function logged(lc: Lifecycle, by: string, text: string, now: Date): Lifecycle {
  return { ...lc, log: [...(lc.log ?? []), { at: now.toISOString(), by, text }].slice(-LOG_LIMIT) };
}

/** Everything the customer could see. Cost and margin are left out: changing only those changes nothing the customer reads. */
export function quoteFingerprint(q: QuotationTemplate): string {
  const content = JSON.stringify([
    q.quoteRef, q.date, q.validityDays, q.clientName, q.clientContact, q.deliveryTerms, q.paymentTerms,
    q.subject ?? '', q.greeting ?? null, q.intro ?? null, q.terms ?? null, q.notes, q.taxAmount,
    q.lineItems.map((l) => [l.description, l.brand, l.partNumber, l.qty, l.uom, l.unitPrice, l.total]),
  ]);
  let h = 0x811c9dc5; // FNV-1a
  for (let i = 0; i < content.length; i++) {
    h ^= content.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0') + ':' + content.length;
}

export type ApprovalState = 'none' | 'awaiting' | 'approved' | 'changed' | 'sent_back';

export function approvalState(q: QuotationTemplate): ApprovalState {
  const a = q.lifecycle?.approval;
  if (!a) return 'none';
  if (a.status === 'awaiting') return 'awaiting';
  if (a.status === 'sent_back') return 'sent_back';
  return a.fingerprint === quoteFingerprint(q) ? 'approved' : 'changed';
}

/** Owner or admin may ask. Nobody asks themselves unless they are an admin. */
export function canRequestApproval(lc: Lifecycle | undefined, who: Actor, targetId: string): boolean {
  const mine = isAdminRole(who.role) || (!!lc?.ownerId && lc.ownerId === who.id);
  return mine && (targetId !== who.id || isAdminRole(who.role));
}

/** The tagged person (or an admin) may approve or send back while it is waiting. */
export function canDecide(lc: Lifecycle | undefined, who: Actor): boolean {
  const a = lc?.approval;
  return !!a && a.status === 'awaiting' && (a.requestedFromId === who.id || isAdminRole(who.role));
}

export function requestApproval(lc: Lifecycle | undefined, from: { id: string; name: string }, who: Actor, message: string, now: Date): Lifecycle {
  const info: ApprovalInfo = {
    requestedFromId: from.id,
    requestedFromName: from.name,
    requestedById: who.id,
    requestedByName: who.name,
    requestedAt: now.toISOString(),
    status: 'awaiting',
    ...(message.trim() ? { note: message.trim().slice(0, 200) } : {}),
  };
  return logged({ ...(lc ?? {}), approval: info }, who.name, `Asked ${from.name} to approve`, now);
}

export function approve(lc: Lifecycle | undefined, q: QuotationTemplate, who: Actor, now: Date): Lifecycle {
  const a = lc?.approval;
  if (!a || a.status !== 'awaiting') return lc ?? {};
  const done: ApprovalInfo = { ...a, status: 'approved', decidedAt: now.toISOString(), decidedByName: who.name, fingerprint: quoteFingerprint(q) };
  delete done.note;
  return logged({ ...(lc ?? {}), approval: done }, who.name, 'Approved', now);
}

export function sendBack(lc: Lifecycle | undefined, who: Actor, note: string, now: Date): Lifecycle {
  const a = lc?.approval;
  if (!a || a.status !== 'awaiting') return lc ?? {};
  const done: ApprovalInfo = { ...a, status: 'sent_back', decidedAt: now.toISOString(), decidedByName: who.name, note: note.trim().slice(0, 200) };
  return logged({ ...(lc ?? {}), approval: done }, who.name, `Sent back${done.note ? `: ${done.note}` : ''}`, now);
}

/** The owner (or an admin) takes the request back. */
export function cancelApproval(lc: Lifecycle | undefined, who: Actor, now: Date): Lifecycle {
  if (!lc?.approval) return lc ?? {};
  return logged({ ...lc, approval: null }, who.name, 'Approval request cancelled', now);
}

export const canDownload = (q: QuotationTemplate, who: Actor | null): boolean =>
  (!!who && isAdminRole(who.role)) || approvalState(q) === 'approved';

/** Blocks the download until the quote is approved. Admins are never blocked. */
export function approvalChecks(q: QuotationTemplate, who: Actor | null): QuoteCheck[] {
  if (who && isAdminRole(who.role)) return [];
  const a = q.lifecycle?.approval;
  switch (approvalState(q)) {
    case 'approved': return [];
    case 'awaiting': return [{ severity: 'block', code: 'approval_waiting', message: `Waiting for ${a!.requestedFromName} to approve this quote.` }];
    case 'changed': return [{ severity: 'block', code: 'approval_changed', message: 'The quote was changed after it was approved. Ask for approval again.' }];
    case 'sent_back': return [{ severity: 'block', code: 'approval_sent_back', message: `${a!.decidedByName ?? a!.requestedFromName} sent this back${a!.note ? `: “${a!.note}”` : ''}. Fix it and ask again.` }];
    default: return [{ severity: 'block', code: 'approval_needed', message: 'Ask a colleague to approve this quote before it can be downloaded.' }];
  }
}

// ─── bell and "waiting for you" ──────────────────────────────────────────────

export interface InboxItem {
  key: string; // stable id of this event, used to remember what has been seen
  caseId: string;
  caseRef: string;
  clientName: string;
  kind: 'approve' | 'approved' | 'sent_back';
  needsAction: boolean;
  text: string;
  at: string;
}

/** What this person should hear about: quotes waiting for their approval, and answers to quotes they own. */
export function inboxFor(cases: QuotationCase[], who: Actor | null, now: Date): InboxItem[] {
  if (!who) return [];
  const out: InboxItem[] = [];
  for (const c of cases) {
    const q = c.templateState;
    const lc = q?.lifecycle;
    const a = lc?.approval;
    if (!q || !a || lc?.archived || c.status === 'Completed') continue;
    const base = { caseId: c.id, caseRef: c.caseRef, clientName: c.clientName };
    if (a.status === 'awaiting' && a.requestedFromId === who.id) {
      out.push({ ...base, key: `${c.id}:req:${a.requestedAt}`, kind: 'approve', needsAction: true, at: a.requestedAt, text: `${a.requestedByName} asked you to approve${a.note ? `: “${a.note}”` : ''}` });
    } else if (a.status !== 'awaiting' && a.decidedAt && lc?.ownerId === who.id && a.requestedFromId !== who.id) {
      const ageDays = (now.getTime() - Date.parse(a.decidedAt)) / 86400000;
      if (ageDays > RECENT_DAYS) continue;
      out.push({
        ...base, key: `${c.id}:dec:${a.decidedAt}`, kind: a.status === 'approved' ? 'approved' : 'sent_back', needsAction: a.status === 'sent_back', at: a.decidedAt,
        text: a.status === 'approved' ? `${a.decidedByName ?? a.requestedFromName} approved it` : `${a.decidedByName ?? a.requestedFromName} sent it back${a.note ? `: “${a.note}”` : ''}`,
      });
    }
  }
  return out.sort((x, y) => y.at.localeCompare(x.at));
}
