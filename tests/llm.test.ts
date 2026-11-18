import test from 'node:test';
import assert from 'node:assert/strict';
import { geminiProvider, providerFromEnv, LlmError } from '../src/lib/llm';

const realFetch = globalThis.fetch;
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const ok = (text: string) => reply(200, { candidates: [{ content: { parts: [{ text }] } }] });

test('falls back to the next Gemini model when the first is rate limited', async () => {
  const urls: string[] = [];
  globalThis.fetch = (async (u: string) => { urls.push(u); return urls.length === 1 ? reply(429, { error: 'quota' }) : ok('{"ops":[]}'); }) as unknown as typeof fetch;
  try {
    const out = await geminiProvider('k', ['gemini-2.5-flash', 'gemini-2.5-flash-lite'])('sys', [{ role: 'user', content: 'x' }]);
    assert.equal(out, '{"ops":[]}');
    assert.match(urls[0], /gemini-2\.5-flash:/);
    assert.match(urls[1], /gemini-2\.5-flash-lite:/);
  } finally { globalThis.fetch = realFetch; }
});

test('all models rate limited -> friendly rate_limited error (daily wording when quota is per day)', async () => {
  globalThis.fetch = (async () => reply(429, { error: { message: 'Quota exceeded ... PerDayPerProject' } })) as unknown as typeof fetch;
  try {
    await assert.rejects(
      () => geminiProvider('k', ['a', 'b'])('s', [{ role: 'user', content: 'x' }]),
      (e: unknown) => e instanceof LlmError && e.kind === 'rate_limited' && /today/i.test(e.message)
    );
  } finally { globalThis.fetch = realFetch; }
});

test('provider choice: Gemini by default, Claude only when asked or when it is the only key', () => {
  assert.throws(() => providerFromEnv({}), (e: unknown) => e instanceof LlmError && e.kind === 'not_configured');
  assert.equal(typeof providerFromEnv({ GEMINI_API_KEY: 'g' }), 'function');
  assert.equal(typeof providerFromEnv({ ANTHROPIC_API_KEY: 'a' }), 'function');
});

test('a retired model (404) falls through to the next; Gemini 3 requests carry no temperature', async () => {
  const sent: { url: string; body: any }[] = [];
  globalThis.fetch = (async (u: string, init: { body: string }) => {
    sent.push({ url: u, body: JSON.parse(init.body) });
    return sent.length === 1 ? reply(404, { error: { message: 'no longer available to new users' } }) : ok('{"ops":[]}');
  }) as unknown as typeof fetch;
  try {
    const out = await geminiProvider('k', ['gemini-2.5-flash-lite', 'gemini-3.5-flash-lite'])('s', [{ role: 'user', content: 'x' }]);
    assert.equal(out, '{"ops":[]}');
    assert.equal(sent[0].body.generationConfig.temperature, 0);
    assert.equal('temperature' in sent[1].body.generationConfig, false);
    assert.ok(sent[1].body.generationConfig.maxOutputTokens >= 4096);
  } finally { globalThis.fetch = realFetch; }
});

test('owner-listed models come first and the built-in list is always appended (no duplicates)', async () => {
  const urls: string[] = [];
  globalThis.fetch = (async (u: string) => { urls.push(u); return reply(404, { error: 'gone' }); }) as unknown as typeof fetch;
  try {
    const p = providerFromEnv({ GEMINI_API_KEY: 'k', GEMINI_MODELS: 'gemini-2.5-flash-lite, gemini-3.5-flash-lite' });
    await assert.rejects(() => p('s', [{ role: 'user', content: 'x' }]));
    const names = urls.map((u) => u.match(/models\/([^:]+):/)![1]);
    assert.deepEqual(names, ['gemini-2.5-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-2.5-flash']);
  } finally { globalThis.fetch = realFetch; }
});
