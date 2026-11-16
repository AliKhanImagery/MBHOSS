import test from 'node:test';
import assert from 'node:assert/strict';

const req = (headers: Record<string, string> = {}) => ({ headers: new Headers(headers) }) as never;

test('sign-in on: no token -> 401, malformed header -> 401', async () => {
  process.env.NEXT_PUBLIC_AUTH_ENABLED = 'true';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:9'; // unreachable on purpose
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'x';
  const { requireSession } = await import('../src/lib/auth-server');
  const a = await requireSession(req());
  assert.deepEqual(a, { ok: false, status: 401, error: 'Please sign in again.' });
  const b = await requireSession(req({ authorization: 'Basic abc' }));
  assert.equal(b.ok, false);
});

test('sign-in on: a token the server cannot verify is rejected, never allowed', async () => {
  const { requireSession } = await import('../src/lib/auth-server');
  const r = await requireSession(req({ authorization: 'Bearer not-a-real-token' }));
  assert.equal(r.ok, false);
});
