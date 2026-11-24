import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleRpc, TOOLS, type McpContext } from '../src/lib/mcp-cases';
import type { ProjectCase } from '../src/types';

function ctx(rows: ProjectCase[] = [], admin = false, owner = 'ali@x.com'): McpContext & { rows: ProjectCase[] } {
  return {
    rows, ownerEmail: owner, isAdmin: admin, now: () => new Date('2026-11-24T09:00:00Z'),
    store: { list: async () => rows, save: async (c) => { const i = rows.findIndex((r) => r.id === c.id); if (i >= 0) rows[i] = c; else rows.push(c); } },
  };
}
const call = async (c: McpContext, name: string, args: object) => {
  const r = (await handleRpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }, c)) as any;
  const res = r.result;
  return { isError: !!res.isError, text: res.content[0].text as string, json: res.isError ? null : JSON.parse(res.content[0].text) };
};

test('handshake, tool list, notifications get no reply', async () => {
  const c = ctx();
  const init = (await handleRpc({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } }, c)) as any;
  assert.equal(init.result.protocolVersion, '2025-06-18');
  assert.ok(init.result.capabilities.tools);
  const list = (await handleRpc({ jsonrpc: '2.0', id: 2, method: 'tools/list' }, c)) as any;
  assert.deepEqual(list.result.tools.map((t: any) => t.name), ['create_case', 'add_update', 'update_case', 'list_cases', 'get_case']);
  assert.equal(await handleRpc({ jsonrpc: '2.0', method: 'notifications/initialized' }, c), null);
  const bad = (await handleRpc({ jsonrpc: '2.0', id: 3, method: 'nope' }, c)) as any;
  assert.equal(bad.error.code, -32601);
});

test('every tool tells Claude not to guess', () => {
  for (const t of TOOLS.filter((x) => x.name !== 'list_cases' && x.name !== 'get_case')) assert.match(t.description, /Never guess/);
});

test('create → update → list → get through the connection, owner and via recorded', async () => {
  const c = ctx();
  const made = await call(c, 'create_case', { title: 'Gazebo job', note: 'Boss asked for a quote by Friday', note_kind: 'call', next_action: 'Draft quote', next_action_due: '2026-11-27' });
  assert.ok(!made.isError);
  assert.equal(c.rows.length, 1);
  assert.equal(c.rows[0].ownerEmail, 'ali@x.com');
  assert.equal(c.rows[0].updates[0].via, 'claude');
  assert.equal(c.rows[0].client, undefined, 'client was not given, so it stays empty');

  const upd = await call(c, 'add_update', { case: 'gazebo', text: 'Client wants powder coating', kind: 'voice' });
  assert.ok(!upd.isError);
  assert.equal(c.rows[0].updates.length, 2);

  const st = await call(c, 'update_case', { case: 'gazebo', status: 'quoted', quote_ref: 'Q-77' });
  assert.equal(st.json.case.status, 'Quoted');
  assert.equal(c.rows[0].quoteRef, 'Q-77');

  const list = await call(c, 'list_cases', {});
  assert.equal(list.json.count, 1);
  assert.equal(list.json.cases[0].due, 'upcoming');
  const closed = await call(c, 'list_cases', { status: 'closed' });
  assert.equal(closed.json.count, 0);

  const one = await call(c, 'get_case', { case: c.rows[0].id });
  assert.ok(one.json.timeline.length >= 3);
});

test('errors come back as tool errors, not crashes; ambiguity is never guessed', async () => {
  const c = ctx();
  assert.ok((await call(c, 'create_case', { title: '' })).isError);
  await call(c, 'create_case', { title: 'Syrup tank' });
  await call(c, 'create_case', { title: 'Syrup pump' });
  const amb = await call(c, 'add_update', { case: 'syrup', text: 'x' });
  assert.ok(amb.isError);
  assert.match(amb.text, /matches 2 cases/);
  assert.ok((await call(c, 'update_case', { case: 'pump', next_action_due: 'tomorrow' })).isError);
  assert.ok((await call(c, 'whatever', {})).isError);
});

test('Claude cannot see or touch other people\'s cases unless its user is an admin', async () => {
  const theirs = { id: 'pc-1', title: 'Secret job', status: 'open', ownerEmail: 'sara@x.com', createdAt: 'x', updatedAt: 'x', updates: [] } as ProjectCase;
  const notAdmin = ctx([theirs]);
  assert.equal((await call(notAdmin, 'list_cases', {})).json.count, 0);
  assert.ok((await call(notAdmin, 'get_case', { case: 'pc-1' })).isError);
  const admin = ctx([theirs], true);
  assert.equal((await call(admin, 'list_cases', {})).json.count, 1);
});
