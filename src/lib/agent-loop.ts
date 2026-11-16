// ==============================================================================
// Agent loop. The model only PROPOSES operations; the quote engine decides what
// is allowed. If the engine rejects something, the rejection is fed back to the
// model (up to MAX_STEPS) so it can correct itself. The reply shown to the user
// is built from the engine's own facts, so no number in it can come from the
// model.
// ==============================================================================

import type { DataBankItem, QuotationTemplate, TemplateRules } from '../types';
import { applyOps, formatPKR, summarizeQuote, type OpResult, type QuoteOp } from './quote-engine';
import type { LlmMessage, LlmProvider } from './llm';

export const MAX_STEPS = 4;
const MAX_BANK_IN_PROMPT = 120;

export interface AgentHistoryTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentInput {
  provider: LlmProvider;
  quote: QuotationTemplate;
  instruction: string;
  history: AgentHistoryTurn[];
  dataBank: DataBankItem[];
  rules: TemplateRules;
  newId?: () => string;
}

export interface AgentOutput {
  quote: QuotationTemplate;
  reply: string;
  changes: string[];
  questions: string[];
  rejected: string[];
  steps: number;
}

const SYSTEM = `You are the quote assistant for an industrial company. You edit ONE quotation by proposing operations. A separate engine validates and applies them and does all the arithmetic.

Reply with a single JSON object and nothing else:
{"ops":[...], "question": string|null}

Operations (use only these):
- {"op":"set_client","clientName":string,"clientContact":string}
- {"op":"set_terms","deliveryTerms":string,"paymentTerms":string,"validityDays":number}
- {"op":"add_line","dataBankId":string,"qty":number,"marginPct":number,"uom":string}   // item from the DATA BANK list
- {"op":"add_line","description":string,"qty":number,"marginPct":number,"unitCost":number,"uom":string,"brand":string,"partNumber":string}   // item NOT in the data bank
- {"op":"update_line","lineId":string,"qty":number,"marginPct":number,"unitCost":number,"description":string,"uom":string}
- {"op":"set_all_margins","marginPct":number}
- {"op":"remove_line","lineId":string}
- {"op":"add_extra_term","text":string}
- {"op":"remove_extra_term","index":number}
Include only the fields you need.

HARD RULES
1. Never invent a price, quantity, margin, brand, part number, client or term. Use only what the user wrote, what is in the DATA BANK, or what is already on the quote. You are not shown any prices on purpose: the engine looks up costs and does all the maths, so never write a price yourself unless the user typed it.
2. Items come from the DATA BANK by id. Use a manual add_line only if the user clearly named something that is not in the data bank AND typed its cost price themselves.
3. If a needed value is missing or the request is ambiguous (which item? how many? what margin?), put ONE short, plain-language question in "question" and do not guess. Do not use jargon.
4. Reference existing lines by their id exactly as listed. Do not repeat changes that are already on the quote.
5. Do not change the company's letterhead, signatory or standard terms; they are fixed by the admin. You can only add extra terms for this one quote.
6. Quotes are always exclusive of GST and taxes. Do not add tax lines.
7. If the user is only chatting or asking something you cannot do, return {"ops":[],"question":null}.`;

function tokens(s: string): string[] {
  return s.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2);
}

/** Keeps the prompt small for big data banks by sending the items most related to the request. */
export function pickBankItems(bank: DataBankItem[], text: string, limit = MAX_BANK_IN_PROMPT): DataBankItem[] {
  if (bank.length <= limit) return bank;
  const want = new Set(tokens(text));
  return bank
    .map((d) => ({ d, score: tokens(`${d.machineName} ${d.company} ${d.category ?? ''}`).filter((t) => want.has(t)).length }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.d);
}

// Prices are deliberately NOT sent: the model only picks items, the engine looks up the cost.
function bankBlock(items: DataBankItem[]): string {
  if (items.length === 0) return '  (the Data Bank is empty)';
  return items.map((d) => `  ${d.id} | ${d.machineName}${d.category ? ` | ${d.category}` : ''}`).join('\n');
}

/** Old assistant replies contain totals and prices; strip them before they go back to the provider. */
export const redactMoney = (s: string): string => s.replace(/Rs\.?\s?[\d,]+(?:\.\d+)?/gi, 'Rs. [amount]');

// Only what the model needs to behave. Actual limits stay private; the engine enforces them.
function rulesBlock(r: TemplateRules): string {
  return r.defaultMarginPct !== null
    ? 'a company default margin exists: leave marginPct out when the user gave none'
    : 'no default margin: if the user gave none, ask for it';
}

export function parseModelJson(raw: string): { ops: QuoteOp[]; question: string | null } | null {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const obj = JSON.parse(raw.slice(start, end + 1)) as { ops?: unknown; question?: unknown };
    const ops = Array.isArray(obj.ops) ? (obj.ops.filter((o) => o && typeof o === 'object') as QuoteOp[]) : [];
    const question = typeof obj.question === 'string' && obj.question.trim() ? obj.question.trim().slice(0, 300) : null;
    return { ops: ops.slice(0, 20), question };
  } catch {
    return null;
  }
}

export async function runAgent(input: AgentInput): Promise<AgentOutput> {
  const history = input.history.slice(-8);
  // Prices the user typed in earlier turns still count as user-stated.
  const userWords = [...history.filter((h) => h.role === 'user').map((h) => h.content), input.instruction].join('\n');
  const bank = pickBankItems(input.dataBank, userWords);

  let quote = input.quote;
  const changes: string[] = [];
  const questions: string[] = [];
  const opLog: OpResult[] = [];

  const messages: LlmMessage[] = [
    ...history.map((h) => ({ role: h.role, content: (h.role === 'assistant' ? redactMoney(h.content) : h.content).slice(0, 1500) })),
    {
      role: 'user',
      content: `CURRENT QUOTE\n${summarizeQuote(quote, true)}\n\nDATA BANK (use these ids)\n${bankBlock(bank)}\n\nCOMPANY RULES: ${rulesBlock(input.rules)}\n\nUSER REQUEST: ${input.instruction}`,
    },
  ];

  let steps = 0;
  let modelQuestion: string | null = null;

  while (steps < MAX_STEPS) {
    steps++;
    const raw = await input.provider(SYSTEM, messages);
    const parsed = parseModelJson(raw);
    if (!parsed) {
      messages.push({ role: 'assistant', content: raw.slice(0, 1500) });
      messages.push({ role: 'user', content: 'That was not valid JSON. Reply again with only the JSON object.' });
      continue;
    }
    messages.push({ role: 'assistant', content: JSON.stringify(parsed) });
    if (parsed.question) modelQuestion = parsed.question;

    const out = applyOps(quote, parsed.ops, {
      dataBank: input.dataBank,
      rules: input.rules,
      instruction: userWords,
      newId: input.newId,
    });
    quote = out.quote;
    changes.push(...out.changes);
    questions.push(...out.questions);
    opLog.push(...out.results);

    const hardRejects: OpResult[] = out.results.filter((r) => r.status === 'rejected');
    if (hardRejects.length === 0 || out.questions.length > 0 || parsed.question) break;

    // Give the engine's objections back to the model so it can correct itself.
    messages.push({
      role: 'user',
      content: `The engine rejected some actions:\n${hardRejects.map((r) => `- ${r.op}: ${r.message}`).join('\n')}\n\nUPDATED QUOTE\n${summarizeQuote(quote, true)}\n\nFix these if you can using only allowed data. If you cannot, ask the user one plain question, or return {"ops":[],"question":null} to stop.`,
    });
  }

  // A rejection counts as resolved only if the model later got an action of the same kind through.
  // Anything left over is reported to the user, so a dropped request is never silent.
  const pending = new Map<string, string[]>();
  for (const r of opLog) {
    const queue = pending.get(r.op) ?? [];
    if (r.status === 'rejected') queue.push(r.message);
    else if (r.status === 'applied') queue.shift();
    pending.set(r.op, queue);
  }
  const rejected = [...pending.values()].flat();

  const allQuestions = [...new Set([...questions, ...(modelQuestion ? [modelQuestion] : [])])];
  return {
    quote,
    changes,
    questions: allQuestions,
    rejected,
    steps,
    reply: buildReply(changes, rejected, allQuestions, quote),
  };
}

export function buildReply(changes: string[], rejected: string[], questions: string[], q: QuotationTemplate): string {
  const parts: string[] = [];
  if (changes.length) {
    parts.push(`Done:\n${changes.map((c) => `• ${c}`).join('\n')}`);
    parts.push(`Quote total is now Rs. ${formatPKR(q.grandTotal)} (excluding GST and taxes).`);
  }
  if (rejected.length) parts.push(`I could not do this:\n${rejected.map((r) => `• ${r}`).join('\n')}`);
  if (questions.length) parts.push(questions.length === 1 ? questions[0] : `I need a few details:\n${questions.map((x) => `• ${x}`).join('\n')}`);
  if (parts.length === 0) {
    parts.push('I was not sure what to change. Try something like: "Add 2 of the gear pump at 15% margin" or "Client is Acme Foods, payment 30 days".');
  }
  return parts.join('\n\n');
}
