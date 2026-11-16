import test from 'node:test';
import assert from 'node:assert/strict';

test('sign-in off (developer mode): requests pass through unchanged', async () => {
  delete process.env.NEXT_PUBLIC_AUTH_ENABLED;
  const { requireSession } = await import('../src/lib/auth-server');
  const r = await requireSession({ headers: new Headers() } as never);
  assert.deepEqual(r, { ok: true, email: null });
});
