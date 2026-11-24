// Case Tracker logic. Pure functions: used by the app screens, the Claude (MCP) connection and the tests.
// Rule: never fill gaps. Empty input stays empty; nothing is guessed or defaulted except the status "open".
import type { CaseStatus, CaseUpdate, CaseUpdateKind, ProjectCase } from '@/types';

export const STATUS_LABEL: Record<CaseStatus, string> = { open: 'Open', quoted: 'Quoted', closed: 'Closed' };
export const KIND_LABEL: Record<CaseUpdateKind, string> = { note: 'Note', call: 'Call', voice: 'Voice note', photo: 'Photo', quote: 'Quote', system: 'Change' };
const KINDS: CaseUpdateKind[] = ['note', 'call', 'voice', 'photo', 'quote'];
const STATUSES: CaseStatus[] = ['open', 'quoted', 'closed'];
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export type Via = 'app' | 'claude';
export interface Who { by: string; via: Via }

let seq = 0;
const uid = (prefix: string, now: Date) => `${prefix}-${now.getTime().toString(36)}${(seq++ % 1296).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

const clean = (v: unknown): string | undefined => {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t ? t : undefined;
};

export function isValidDay(v: string): boolean {
  if (!ISO_DAY.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

function checkDay(v: unknown): string | undefined {
  const t = clean(v);
  if (t === undefined) return undefined;
  if (!isValidDay(t)) throw new Error(`"${t}" is not a date. Use YYYY-MM-DD.`);
  return t;
}

function checkKind(v: unknown, fallback: CaseUpdateKind = 'note'): CaseUpdateKind {
  if (v === undefined || v === null || v === '') return fallback;
  if (typeof v === 'string' && (KINDS as string[]).includes(v)) return v as CaseUpdateKind;
  throw new Error(`kind must be one of: ${KINDS.join(', ')}.`);
}

function checkStatus(v: unknown): CaseStatus {
  if (typeof v === 'string' && (STATUSES as string[]).includes(v)) return v as CaseStatus;
  throw new Error(`status must be one of: ${STATUSES.join(', ')}.`);
}

function makeUpdate(text: string, kind: CaseUpdateKind, who: Who, now: Date): CaseUpdate {
  return { id: uid('u', now), at: now.toISOString(), by: who.by, via: who.via, kind, text };
}

export interface NewCaseInput {
  title?: unknown; client?: unknown; summary?: unknown; origin?: unknown; quoteRef?: unknown;
  nextAction?: unknown; nextActionDue?: unknown; note?: unknown; noteKind?: unknown;
}

export function newCase(input: NewCaseInput, ownerEmail: string, who: Who, now: Date): ProjectCase {
  const title = clean(input.title);
  if (!title) throw new Error('A case needs a title.');
  const c: ProjectCase = {
    id: uid('pc', now), title, client: clean(input.client), summary: clean(input.summary), origin: clean(input.origin),
    quoteRef: clean(input.quoteRef), status: 'open', nextAction: clean(input.nextAction), nextActionDue: checkDay(input.nextActionDue),
    ownerEmail, createdAt: now.toISOString(), updatedAt: now.toISOString(), updates: [],
  };
  const note = clean(input.note);
  if (note) c.updates.push(makeUpdate(note, checkKind(input.noteKind), who, now));
  return c;
}

export function addUpdate(c: ProjectCase, input: { text?: unknown; kind?: unknown }, who: Who, now: Date): ProjectCase {
  const text = clean(input.text);
  if (!text) throw new Error('An update needs some text.');
  return { ...c, updatedAt: now.toISOString(), updates: [...c.updates, makeUpdate(text, checkKind(input.kind), who, now)] };
}

export interface CasePatch {
  title?: unknown; client?: unknown; summary?: unknown; origin?: unknown; quoteRef?: unknown;
  status?: unknown; nextAction?: unknown; nextActionDue?: unknown;
}
const TEXT_FIELDS = ['client', 'summary', 'origin', 'quoteRef'] as const;

/** Change fields. A field that is present and empty clears it; a field that is absent is left alone. Changes are logged. */
export function patchCase(c: ProjectCase, patch: CasePatch, who: Who, now: Date): ProjectCase {
  const next: ProjectCase = { ...c };
  const log: string[] = [];
  if ('title' in patch && patch.title !== undefined) {
    const t = clean(patch.title);
    if (!t) throw new Error('A case needs a title.');
    if (t !== c.title) { next.title = t; log.push(`Title changed to "${t}"`); }
  }
  for (const f of TEXT_FIELDS) {
    if (f in patch && (patch as Record<string, unknown>)[f] !== undefined) {
      const v = clean((patch as Record<string, unknown>)[f]);
      if (v !== c[f]) {
        next[f] = v;
        const label = f === 'quoteRef' ? 'Quote number' : f[0].toUpperCase() + f.slice(1);
        log.push(v ? `${label}: ${v}` : `${label} cleared`);
      }
    }
  }
  if ('status' in patch && patch.status !== undefined) {
    const s = checkStatus(patch.status);
    if (s !== c.status) { next.status = s; log.push(`Status: ${STATUS_LABEL[c.status]} → ${STATUS_LABEL[s]}`); }
  }
  if ('nextAction' in patch && patch.nextAction !== undefined) {
    const v = clean(patch.nextAction);
    if (v !== c.nextAction) { next.nextAction = v; log.push(v ? `Next action: ${v}` : 'Next action cleared'); }
  }
  if ('nextActionDue' in patch && patch.nextActionDue !== undefined) {
    const v = checkDay(patch.nextActionDue);
    if (v !== c.nextActionDue) { next.nextActionDue = v; log.push(v ? `Next action due ${v}` : 'Due date cleared'); }
  }
  if (log.length === 0) return c;
  next.updatedAt = now.toISOString();
  next.updates = [...c.updates, ...log.map((l) => makeUpdate(l, 'system', who, now))];
  return next;
}

// ─── Reading the tracker ─────────────────────────────────────────────────────

export type DueState = 'overdue' | 'today' | 'upcoming' | 'none';

export function dueState(c: ProjectCase, today: string): DueState {
  if (c.status === 'closed' || !c.nextActionDue) return 'none';
  if (c.nextActionDue < today) return 'overdue';
  return c.nextActionDue === today ? 'today' : 'upcoming';
}

export function daysSince(iso: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - Date.parse(iso)) / 86400000));
}

export interface Attention { c: ProjectCase; reason: 'overdue' | 'today' | 'no_next_action' }

/** What needs you now: overdue and due-today next actions, then live cases with no next action at all. */
export function attention(cases: ProjectCase[], today: string): Attention[] {
  const live = cases.filter((c) => c.status !== 'closed');
  const over = live.filter((c) => dueState(c, today) === 'overdue').sort((a, b) => (a.nextActionDue ?? '').localeCompare(b.nextActionDue ?? ''));
  const due = live.filter((c) => dueState(c, today) === 'today');
  const none = live.filter((c) => !c.nextAction && !c.nextActionDue).sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  return [
    ...over.map((c) => ({ c, reason: 'overdue' as const })),
    ...due.map((c) => ({ c, reason: 'today' as const })),
    ...none.map((c) => ({ c, reason: 'no_next_action' as const })),
  ];
}

/** Live cases: least recently touched first, so what you forgot is on top. Closed cases: newest first. */
export function sortCases(cases: ProjectCase[], closed: boolean): ProjectCase[] {
  return [...cases].sort((a, b) => (closed ? b.updatedAt.localeCompare(a.updatedAt) : a.updatedAt.localeCompare(b.updatedAt)));
}

export function matches(c: ProjectCase, term: string): boolean {
  const s = term.trim().toLowerCase();
  if (!s) return true;
  return [c.title, c.client, c.summary, c.origin, c.quoteRef, c.nextAction, ...c.updates.map((u) => u.text)]
    .filter(Boolean).some((v) => (v as string).toLowerCase().includes(s));
}

/** Owner and admins only. */
export function canSee(c: ProjectCase, who: { email?: string | null; isAdmin: boolean } | null): boolean {
  if (!who) return false;
  if (who.isAdmin) return true;
  return !!who.email && c.ownerEmail.toLowerCase() === who.email.toLowerCase();
}

/** Combine this device's copy with the cloud copy: same id → the more recently updated one wins. Nothing is dropped. */
export function mergeCases(local: ProjectCase[], cloud: ProjectCase[]): ProjectCase[] {
  const map = new Map<string, ProjectCase>();
  for (const c of [...local, ...cloud]) {
    const have = map.get(c.id);
    if (!have || c.updatedAt > have.updatedAt) map.set(c.id, c);
  }
  return [...map.values()];
}

/** Find one case by id, or by part of its title (or client). More than one match is an error, never a guess. */
export function findCase(cases: ProjectCase[], ref: unknown): ProjectCase {
  const r = clean(ref);
  if (!r) throw new Error('Say which case (its id or part of its title).');
  const byId = cases.find((c) => c.id === r);
  if (byId) return byId;
  const s = r.toLowerCase();
  const hits = cases.filter((c) => c.title.toLowerCase().includes(s) || (c.client ?? '').toLowerCase().includes(s));
  if (hits.length === 1) return hits[0];
  if (hits.length === 0) throw new Error(`No case matches "${r}".`);
  throw new Error(`"${r}" matches ${hits.length} cases, so I did not pick one. Use the id: ${hits.slice(0, 8).map((c) => `${c.id} (${c.title}${c.client ? ` – ${c.client}` : ''})`).join('; ')}.`);
}
