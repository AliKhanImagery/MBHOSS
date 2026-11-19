import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PUNJAB_TANK_SEED, filterOptions, hasUsableEmail, toSourcingSuppliers } from '../src/lib/sourcing-options';

test('seed holds the nine suppliers Ali supplied, with unique ids', () => {
  assert.equal(PUNJAB_TANK_SEED.length, 9);
  assert.equal(new Set(PUNJAB_TANK_SEED.map((o) => o.id)).size, 9);
  assert.equal(PUNJAB_TANK_SEED.filter((o) => o.tier === 'confirmed').length, 5);
  assert.equal(PUNJAB_TANK_SEED.filter((o) => o.tier === 'to_confirm').length, 4);
});

test('MCCS has no email and nothing is invented for it', () => {
  const m = PUNJAB_TANK_SEED.find((o) => o.companyName.includes('MECH-CIV'))!;
  assert.equal(m.email, undefined);
  assert.equal(hasUsableEmail(m), false);
  assert.ok(m.flag);
});

test('Grand Star keeps the email as given and is flagged for the domain mismatch', () => {
  const g = PUNJAB_TANK_SEED.find((o) => o.companyName === 'Grand Star Engineering')!;
  assert.equal(g.email, 'info@gstareng.com');
  assert.equal(g.website, 'gstarengineering.com');
  assert.match(g.flag ?? '', /differs/);
});

test('suppliers to confirm carry the 316L / sanitary finish check', () => {
  for (const o of PUNJAB_TANK_SEED.filter((x) => x.tier === 'to_confirm')) {
    assert.match(o.confirmOnRfq ?? '', /316L/);
    assert.deepEqual(o.grades, []);
  }
});

test('toSourcingSuppliers skips suppliers without an email', () => {
  const { suppliers, skipped } = toSourcingSuppliers(PUNJAB_TANK_SEED);
  assert.equal(suppliers.length, 8);
  assert.deepEqual(skipped.map((o) => o.companyName), ['MECH-CIV Construction Services (MCCS)']);
  assert.ok(suppliers.every((s) => /@/.test(s.email)));
});

test('filters and search', () => {
  assert.equal(filterOptions(PUNJAB_TANK_SEED, 'no_email', '').length, 1);
  assert.equal(filterOptions(PUNJAB_TANK_SEED, 'confirmed', '').length, 5);
  assert.equal(filterOptions(PUNJAB_TANK_SEED, 'all', 'okara').length, 1);
  assert.equal(filterOptions(PUNJAB_TANK_SEED, 'all', 'khanewal')[0].companyName, 'ZU Engineering');
});
