// Per-employee quotation number ranges. An admin gives each employee a range
// (prefix + a run of numbers, e.g. Q26 + 01001..01999) and the app issues the next
// free number from it. Nothing here guesses: with no range assigned, no number is made up.

export interface QuoteRange {
  prefix: string; // e.g. "Q26"
  digits: number; // zero-padded width of the number part, e.g. 5
  start: number; // first number the employee may use
  end: number; // last number the employee may use
  ignored?: number[]; // freed numbers this person chose never to be offered again
}

export const formatRef = (r: QuoteRange, n: number): string => `${r.prefix}${String(n).padStart(r.digits, '0')}`;

/** The number part of `ref` if it belongs to this range's format and sits inside it, else null. */
export function numberInRange(r: QuoteRange, ref: string): number | null {
  const t = ref.trim();
  if (!t.startsWith(r.prefix)) return null;
  const rest = t.slice(r.prefix.length);
  if (rest.length !== r.digits || !/^\d+$/.test(rest)) return null;
  const n = Number(rest);
  return n >= r.start && n <= r.end ? n : null;
}

export type NextRef = { ok: true; ref: string; n: number } | { ok: false; reason: 'exhausted' };

/** Next free number: one after the highest already used in this range (or the first one). */
export function nextRef(r: QuoteRange, usedRefs: string[]): NextRef {
  let highest = r.start - 1;
  for (const ref of usedRefs) {
    const n = numberInRange(r, ref);
    if (n !== null && n > highest) highest = n;
  }
  const n = highest + 1;
  if (n > r.end) return { ok: false, reason: 'exhausted' };
  return { ok: true, ref: formatRef(r, n), n };
}

/** Plain-language problems with a range an admin typed; empty list means it is fine. */
export function validateRange(r: QuoteRange): string[] {
  const out: string[] = [];
  if (!r.prefix.trim()) out.push('Type the starting letters, for example Q26.');
  if (!/^[A-Za-z0-9\-_/]*$/.test(r.prefix)) out.push('The starting letters can only use letters, numbers, - _ and /.');
  if (!Number.isInteger(r.digits) || r.digits < 1 || r.digits > 8) out.push('Number length must be between 1 and 8 digits.');
  if (!Number.isInteger(r.start) || !Number.isInteger(r.end) || r.start < 0) out.push('From and To must be whole numbers.');
  else if (r.end < r.start) out.push('To must not be smaller than From.');
  else if (String(r.end).length > r.digits) out.push('To needs more digits than the number length allows.');
  return out;
}

/** True when two ranges could ever issue the same reference. */
export function rangesOverlap(a: QuoteRange, b: QuoteRange): boolean {
  if (a.prefix !== b.prefix || a.digits !== b.digits) return false;
  return a.start <= b.end && b.start <= a.end;
}

/**
 * Numbers inside the range that sit below the highest one in use but are not used by any
 * saved quotation (typically a deleted quote), lowest first. Numbers the person chose to
 * ignore for good are left out. The normal next number (see nextRef) is unaffected.
 */
export function freedSlots(r: QuoteRange, usedRefs: string[]): number[] {
  const used = new Set<number>();
  for (const ref of usedRefs) {
    const n = numberInRange(r, ref);
    if (n !== null) used.add(n);
  }
  if (used.size === 0) return [];
  const highest = Math.max(...used);
  const skip = new Set(r.ignored ?? []);
  const out: number[] = [];
  for (let n = r.start; n < highest; n++) if (!used.has(n) && !skip.has(n)) out.push(n);
  return out;
}

/** The same range with extra numbers added to its "never offer again" list. */
export function withIgnored(r: QuoteRange, numbers: number[]): QuoteRange {
  return { ...r, ignored: [...new Set([...(r.ignored ?? []), ...numbers])].sort((a, b) => a - b) };
}
