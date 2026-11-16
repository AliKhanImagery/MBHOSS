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
