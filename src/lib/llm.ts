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
  constructor(message: string, public readonly kind: 'not_configured' | 'failed') {
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
      throw new LlmError(`Model request failed (${res.status}). ${text.slice(0, 200)}`, 'failed');
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

export function geminiProvider(apiKey: string, model: string): LlmProvider {
  return async (system, messages) => {
    const data = (await postJson(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      { 'x-goog-api-key': apiKey },
      {
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        generationConfig: { temperature: 0, responseMimeType: 'application/json', maxOutputTokens: 2048 },
      }
    )) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('');
    if (!text) throw new LlmError('The AI returned an empty answer.', 'failed');
    return text;
  };
}

/** Picks a provider from environment variables, or throws a not_configured error. */
export function providerFromEnv(env: Record<string, string | undefined> = process.env): LlmProvider {
  if (env.ANTHROPIC_API_KEY) {
    return anthropicProvider(env.ANTHROPIC_API_KEY, env.ANTHROPIC_MODEL || 'claude-sonnet-5-5');
  }
  const gKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY;
  if (gKey) return geminiProvider(gKey, env.GEMINI_MODEL || 'gemini-2.5-flash');
  throw new LlmError(
    'The quote assistant is not switched on yet. An admin needs to add an AI key (ANTHROPIC_API_KEY or GEMINI_API_KEY) in Vercel.',
    'not_configured'
  );
}
