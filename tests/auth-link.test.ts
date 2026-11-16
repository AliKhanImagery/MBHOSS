import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAuthLinkType } from '../src/lib/auth-link';

test('detects invite and recovery links', () => {
  assert.equal(parseAuthLinkType('#access_token=abc&refresh_token=def&type=invite'), 'invite');
  assert.equal(parseAuthLinkType('#access_token=abc&type=recovery'), 'recovery');
});
test('ignores everything else', () => {
  assert.equal(parseAuthLinkType('#access_token=abc&type=signup'), null);
  assert.equal(parseAuthLinkType(''), null);
  assert.equal(parseAuthLinkType(null), null);
  assert.equal(parseAuthLinkType('#section-2'), null);
});
