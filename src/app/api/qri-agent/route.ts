// ==============================================================================
// POST /api/qri-agent — the quote assistant.
// The model proposes operations; src/lib/quote-engine.ts validates and applies
// them. If no AI key is configured or the AI call fails, we say so plainly. We
// never fall back to guessing or to made-up data.
// ==============================================================================

import { NextRequest, NextResponse } from 'next/server';
import type { DataBankItem, QuotationTemplate, TemplateRules } from '@/types';
import { runAgent } from '@/lib/agent-loop';
import { LlmError, providerFromEnv } from '@/lib/llm';

export const maxDuration = 60;

const MAX_INSTRUCTION = 1500;
const MAX_BANK = 500;
const MAX_LINES = 100;

// Best-effort throttle (per server instance) so a stray loop cannot burn the AI budget.
const hits = new Map<string, number[]>();
function throttled(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 30;
}

const fail = (error: string, status: number) => NextResponse.json({ ok: false, error }, { status });

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const numOrNull = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (throttled(ip)) return fail('Too many requests. Please wait a minute and try again.', 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail('That request could not be read.', 400);
  }
  if (!isObj(body)) return fail('That request could not be read.', 400);

  const instruction = typeof body.instruction === 'string' ? body.instruction.trim() : '';
  if (!instruction) return fail('Please type what you want to change.', 400);
  if (instruction.length > MAX_INSTRUCTION) return fail('That message is too long. Please shorten it.', 400);

  const quote = body.quote as QuotationTemplate | undefined;
  if (!isObj(quote) || !Array.isArray(quote.lineItems) || !Array.isArray(quote.notes) || quote.lineItems.length > MAX_LINES) {
    return fail('The quote data was not valid.', 400);
  }

  const bank = (Array.isArray(body.dataBank) ? body.dataBank : [])
    .filter((d): d is DataBankItem => isObj(d) && typeof d.id === 'string' && typeof d.machineName === 'string' && typeof d.pricePKR === 'number')
    .slice(0, MAX_BANK);

  const r = isObj(body.rules) ? body.rules : {};
  const rules: TemplateRules = {
    defaultMarginPct: numOrNull(r.defaultMarginPct),
    minMarginPct: numOrNull(r.minMarginPct),
    defaultValidityDays: numOrNull(r.defaultValidityDays),
    maxValidityDays: numOrNull(r.maxValidityDays),
    maxCreditDays: numOrNull(r.maxCreditDays),
  };

  const history = (Array.isArray(body.history) ? body.history : [])
    .filter((h): h is { role: 'user' | 'assistant'; content: string } => isObj(h) && (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string')
    .slice(-8);

  try {
    const provider = providerFromEnv();
    const out = await runAgent({ provider, quote, instruction, history, dataBank: bank, rules });
    return NextResponse.json({
      ok: true,
      quote: out.quote,
      reply: out.reply,
      changes: out.changes,
      questions: out.questions,
      rejected: out.rejected,
    });
  } catch (e) {
    if (e instanceof LlmError) {
      return fail(e.message, e.kind === 'not_configured' ? 503 : e.kind === 'rate_limited' ? 429 : 502);
    }
    console.error('[qri-agent] unexpected error', e);
    return fail('Something went wrong on our side. Nothing was changed.', 500);
  }
}
