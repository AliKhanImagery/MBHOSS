import test from 'node:test';
import assert from 'node:assert/strict';
import { isAdminRole } from '../src/lib/roles';

test('admin spellings are admins', () => {
  for (const r of ['Super Admin', 'SuperAdmin', 'super_admin', 'Admin', ' admin ']) {
    assert.equal(isAdminRole(r.trim()), true, r);
  }
});
test('other roles and empty values are not admins', () => {
  for (const r of ['Procurement Engineer', 'Viewer', '', null, undefined]) {
    assert.equal(isAdminRole(r as any), false, String(r));
  }
});
