// ==============================================================================
// LLM provider adapter. One tiny interface so the agent loop does not care
// which model answers. Claude is used when ANTHROPIC_API_KEY is set, otherwise
// Gemini when GEMINI_API_KEY / GOOGLE_API_KEY is set. Model ids come from env so
// a retired model never takes the app down again.
// ==============================================================================

export interface LlmMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type LlmProvider = (system: string, messages: LlmMessage[]) => Promise<string>;

export class LlmError extends Error {
  constructor(
    message: string,
    public readonly kind: 'not_configured' | 'failed' | 'rate_limited',
    public readonly status?: number
  ) {
    super(message);
  }
}

const TIMEOUT_MS = 45_000;

async function postJson(url: string, headers: Record<string, string>, body: unknown): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      if (res.status === 429) {
        const daily = /per\s*day|PerDay/i.test(text);
        throw new LlmError(
          daily
            ? 'The free AI allowance for today has been used up. It resets tomorrow. Until then you can still edit the quotation by hand.'
            : 'The AI is busy (free usage limit). Please wait a minute and try again.',
          'rate_limited',
          429
        );
      }
      throw new LlmError(`Model request failed (${res.status}). ${text.slice(0, 200)}`, 'failed', res.status);
    }
    return await res.json();
  } catch (e) {
    if (e instanceof LlmError) throw e;
    const aborted = e instanceof Error && e.name === 'AbortError';
    throw new LlmError(aborted ? 'The AI took too long to answer.' : 'Could not reach the AI service.', 'failed');
  } finally {
    clearTimeout(timer);
  }
}

export function anthropicProvider(apiKey: string, model: string): LlmProvider {
  return async (system, messages) => {
    const data = (await postJson(
      `${process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com'}/v1/messages`,
      { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      { model, max_tokens: 2048, temperature: 0, system, messages }
    )) as { content?: { type: string; text?: string }[] };
    const text = (data.content ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join('');
    if (!text) throw new LlmError('The AI returned an empty answer.', 'failed');
    return text;
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Gemini over REST. `models` is tried in order: each model has its own free quota, so falling
 * through to the next one on a rate limit (429), an overload (503) or a retired model (404)
 * stretches the free allowance and keeps the assistant working.
 */
export function geminiProvider(apiKey: string, models: string[]): LlmProvider {
  return async (system, messages) => {
    let last: LlmError | null = null;
    for (const model of models) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const data = (await postJson(
            `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
            { 'x-goog-api-key': apiKey },
            {
              systemInstruction: { parts: [{ text: system }] },
              contents: messages.map((m) => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }],
              })),
              generationConfig: {
                temperature: 0,
                responseMimeType: 'application/json',
                maxOutputTokens: 1024,
                // Short structured edits do not need long "thinking"; this keeps replies fast and light on quota.
                ...(/^gemini-2\.5-flash/.test(model) ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
              },
            }
          )) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
          const text = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('');
          if (!text) throw new LlmError('The AI returned an empty answer.', 'failed');
          return text;
        } catch (e) {
          if (!(e instanceof LlmError)) throw e;
          last = e;
          if (e.status === 503 && attempt === 0) {
            await sleep(1500); // brief overload: one quick retry on the same model
            continue;
          }
          break; // 429 / 404 / other: go to the next model
        }
      }
    }
    throw last ?? new LlmError('The AI could not answer.', 'failed');
  };
}

/**
 * Picks a provider from environment variables. Gemini (free tier) is preferred; set
 * AI_PROVIDER=anthropic to prefer Claude when both keys exist.
 */
export function providerFromEnv(env: Record<string, string | undefined> = process.env): LlmProvider {
  const gKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY;
  const models = (env.GEMINI_MODELS || env.GEMINI_MODEL || 'gemini-2.5-flash,gemini-2.5-flash-lite')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
  const preferClaude = env.AI_PROVIDER === 'anthropic';

  if (preferClaude && env.ANTHROPIC_API_KEY) return anthropicProvider(env.ANTHROPIC_API_KEY, env.ANTHROPIC_MODEL || 'claude-sonnet-5-5');
  if (gKey) return geminiProvider(gKey, models);
  if (env.ANTHROPIC_API_KEY) return anthropicProvider(env.ANTHROPIC_API_KEY, env.ANTHROPIC_MODEL || 'claude-sonnet-5-5');
  throw new LlmError(
    'The quote assistant is not switched on yet. An admin needs to add a free Gemini key (GEMINI_API_KEY) in Vercel.',
    'not_configured'
  );
}
