import test from 'node:test';
import assert from 'node:assert/strict';
import { runAgent, parseModelJson, pickBankItems } from '../src/lib/agent-loop';
import { blankQuote } from '../src/lib/quote-engine';
import type { DataBankItem, TemplateRules } from '../src/types';
import type { LlmProvider } from '../src/lib/llm';

const rules: TemplateRules = { defaultMarginPct: null, minMarginPct: null, defaultValidityDays: null, maxValidityDays: null, maxCreditDays: null };
const bank: DataBankItem[] = [{ id: 'db1', company: 'Acme', machineName: 'Gear Pump (GP-100)', pricePKR: 10000, lastCheckedDate: '2026-01-01' }];
const scripted = (...answers: string[]): LlmProvider & { calls: number } => {
  let i = 0;
  const f = (async () => answers[Math.min(i++, answers.length - 1)]) as unknown as LlmProvider & { calls: number };
  Object.defineProperty(f, 'calls', { get: () => i });
  return f;
};
const base = (provider: LlmProvider, instruction: string) => ({ provider, quote: blankQuote(rules), instruction, history: [], dataBank: bank, rules, newId: () => 'L1' });

test('parseModelJson tolerates code fences and junk', () => {
  assert.deepEqual(parseModelJson('```json\n{"ops":[],"question":"x?"}\n```')?.question, 'x?');
  assert.equal(parseModelJson('no json'), null);
});

test('applies ops and builds a reply from engine facts', async () => {
  const p = scripted('{"ops":[{"op":"add_line","dataBankId":"db1","qty":2,"marginPct":10}],"question":null}');
  const out = await runAgent(base(p, 'add 2 gear pumps at 10% margin'));
  assert.equal(out.quote.grandTotal, 22000);
  assert.match(out.reply, /Rs\. 22,000/);
  assert.equal(p.calls, 1);
});

test('missing margin -> asks the user, adds nothing', async () => {
  const p = scripted('{"ops":[{"op":"add_line","dataBankId":"db1","qty":2}],"question":null}');
  const out = await runAgent(base(p, 'add 2 gear pumps'));
  assert.equal(out.quote.lineItems.length, 0);
  assert.match(out.reply, /margin/i);
});

test('self-corrects after an engine rejection', async () => {
  const p = scripted(
    '{"ops":[{"op":"add_line","dataBankId":"WRONG","qty":1,"marginPct":10}],"question":null}',
    '{"ops":[{"op":"add_line","dataBankId":"db1","qty":1,"marginPct":10}],"question":null}'
  );
  const out = await runAgent(base(p, 'add a gear pump at 10%'));
  assert.equal(p.calls, 2);
  assert.equal(out.quote.lineItems.length, 1);
  assert.equal(out.rejected.length, 0);
});

test('model-invented price never lands on the quote and is reported', async () => {
  const p = scripted('{"ops":[{"op":"add_line","description":"Valve","qty":1,"marginPct":10,"unitCost":9999}],"question":null}');
  const out = await runAgent(base(p, 'add a valve at 10% margin'));
  assert.equal(out.quote.lineItems.length, 0);
  assert.ok(out.rejected.length > 0);
  assert.match(out.reply, /could not do this/i);
  assert.ok(p.calls <= 4);
});

test('invalid JSON is retried then given up gracefully', async () => {
  const p = scripted('nonsense');
  const out = await runAgent(base(p, 'hello'));
  assert.equal(out.quote.lineItems.length, 0);
  assert.equal(p.calls, 4);
  assert.ok(out.reply.length > 0);
});

test('pickBankItems trims large banks toward relevant items', () => {
  const big: DataBankItem[] = Array.from({ length: 300 }, (_, i) => ({ id: `i${i}`, company: 'X', machineName: i === 250 ? 'Special Widget' : `Thing ${i}`, pricePKR: 1, lastCheckedDate: '' }));
  const picked = pickBankItems(big, 'need widget', 10);
  assert.equal(picked.length, 10);
  assert.ok(picked.some((d) => d.id === 'i250'));
});

test('a rejection the model gives up on is still reported (stops after the model returns nothing)', async () => {
  const p = scripted(
    '{"ops":[{"op":"add_line","description":"Valve","qty":1,"marginPct":10,"unitCost":9999}],"question":null}',
    '{"ops":[],"question":null}'
  );
  const out = await runAgent(base(p, 'add a valve at 10% margin'));
  assert.equal(p.calls, 2);
  assert.equal(out.rejected.length, 1);
  assert.match(out.reply, /typed yourself|Data Bank/);
});

test('no prices, costs or totals are sent to the AI provider', async () => {
  const seen: string[] = [];
  const spy: LlmProvider = async (system, messages) => {
    seen.push(system, ...messages.map((m) => m.content));
    return '{"ops":[{"op":"add_line","dataBankId":"db1","qty":2,"marginPct":10}],"question":null}';
  };
  const first = await runAgent({ ...base(spy, 'add 2 pumps at 10%'), history: [{ role: 'assistant', content: 'Quote total is now Rs. 22,000 (excluding GST and taxes).' }] });
  assert.equal(first.quote.grandTotal, 22000);
  const sent = seen.join('\n');
  assert.ok(!sent.includes('10000'), 'data bank cost leaked');
  assert.ok(!sent.includes('22,000') && !sent.includes('22000'), 'total leaked');
  assert.match(sent, /Rs\. \[amount\]/);
});
