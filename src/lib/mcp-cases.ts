// The Case Tracker's Claude connection (MCP, JSON-RPC over HTTP). Pure logic: storage and auth are passed in,
// so it is testable without a network. Claude calls these tools; they use the same rules as the app screens.
import { addUpdate, canSee, dueState, daysSince, findCase, newCase, patchCase, sortCases, STATUS_LABEL, type Via } from '@/lib/project-cases';
import type { CaseStatus, ProjectCase } from '@/types';

export interface CaseStore {
  list(): Promise<ProjectCase[]>;
  save(c: ProjectCase): Promise<void>;
}
export interface McpContext {
  store: CaseStore;
  /** The app user Claude acts as. Cases it creates belong to this person. */
  ownerEmail: string;
  isAdmin: boolean;
  now: () => Date;
}

const SERVER = { name: 'mbhoss-case-tracker', version: '1.0.0' };
const SUPPORTED = ['2025-06-18', '2025-03-26', '2024-11-05'];
const WHO = (ctx: McpContext) => ({ by: `${ctx.ownerEmail} via Claude`, via: 'claude' as Via });

const RULES =
  'Record only what the person actually said or what is visible in what they sent. Never guess or fill a gap: ' +
  'if a detail was not given, leave that field out. Put the person\'s own words in the text. ' +
  'If it is unclear which case is meant, ask the person instead of choosing.';

const str = (d: string) => ({ type: 'string', description: d });

export const TOOLS = [
  {
    name: 'create_case',
    description: `Start a new tracker for a project or enquiry. ${RULES} Only "title" is required. Check list_cases first so the same case is not created twice.`,
    inputSchema: {
      type: 'object',
      properties: {
        title: str('Short name for the project/enquiry, as the person called it.'),
        client: str('Client or company, only if stated.'),
        summary: str('What it is, in the person\'s words, only if stated.'),
        origin: str('Where it came from as told, e.g. "boss", "phone call", "client email". Only if stated.'),
        quote_ref: str('Quotation number, only if one exists.'),
        next_action: str('The next step, only if stated.'),
        next_action_due: str('Due date for the next step, YYYY-MM-DD, only if stated.'),
        note: str('Details from the call/voice note/photo, in the person\'s words. Becomes the first entry in the timeline.'),
        note_kind: { type: 'string', enum: ['note', 'call', 'voice', 'photo', 'quote'], description: 'What the note came from.' },
      },
      required: ['title'],
    },
  },
  {
    name: 'add_update',
    description: `Add an entry to a case's timeline (a call, a voice note, a photo, a note). ${RULES}`,
    inputSchema: {
      type: 'object',
      properties: {
        case: str('Case id, or part of its title/client name.'),
        text: str('What happened or was said, in the person\'s words. For a photo, what it shows (only what is readable).'),
        kind: { type: 'string', enum: ['note', 'call', 'voice', 'photo', 'quote'], description: 'What it came from.' },
      },
      required: ['case', 'text'],
    },
  },
  {
    name: 'update_case',
    description: `Change a case: status (open, quoted, closed), next action and its due date, title, client, summary, origin or quote number. Only send the fields that changed. An empty string clears a field. ${RULES}`,
    inputSchema: {
      type: 'object',
      properties: {
        case: str('Case id, or part of its title/client name.'),
        status: { type: 'string', enum: ['open', 'quoted', 'closed'] },
        next_action: str('The next step. Empty string clears it.'),
        next_action_due: str('YYYY-MM-DD. Empty string clears it.'),
        title: str('New title.'), client: str('Client.'), summary: str('Summary.'), origin: str('Origin.'), quote_ref: str('Quotation number.'),
      },
      required: ['case'],
    },
  },
  {
    name: 'list_cases',
    description: 'List cases the person can see. Default is every case that is not closed, least recently updated first. Use this before creating a case and to answer "what is going on / what am I forgetting".',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['active', 'open', 'quoted', 'closed', 'all'], description: 'Default "active" (open + quoted).' },
        search: str('Optional words to look for in titles, clients and updates.'),
      },
    },
  },
  {
    name: 'get_case',
    description: 'Get one case with its full timeline.',
    inputSchema: { type: 'object', properties: { case: str('Case id, or part of its title/client name.') }, required: ['case'] },
  },
];

const ok = (data: unknown) => ({ content: [{ type: 'text', text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }] });
const fail = (msg: string) => ({ content: [{ type: 'text', text: msg }], isError: true });

const summary = (c: ProjectCase, now: Date) => ({
  id: c.id, title: c.title, client: c.client ?? null, status: STATUS_LABEL[c.status], quote_ref: c.quoteRef ?? null,
  next_action: c.nextAction ?? null, next_action_due: c.nextActionDue ?? null,
  due: dueState(c, now.toISOString().slice(0, 10)), days_since_last_update: daysSince(c.updatedAt, now),
});

const detail = (c: ProjectCase, now: Date) => ({
  ...summary(c, now), summary: c.summary ?? null, origin: c.origin ?? null, created: c.createdAt,
  timeline: c.updates.map((u) => ({ at: u.at, by: u.by, kind: u.kind, text: u.text })),
});

const pick = (a: Record<string, unknown>, map: Record<string, string>) => {
  const out: Record<string, unknown> = {};
  for (const [from, to] of Object.entries(map)) if (from in a) out[to] = a[from];
  return out;
};

async function visible(ctx: McpContext): Promise<ProjectCase[]> {
  const all = await ctx.store.list();
  return all.filter((c) => canSee(c, { email: ctx.ownerEmail, isAdmin: ctx.isAdmin }));
}

export async function callTool(name: string, args: Record<string, unknown>, ctx: McpContext) {
  const now = ctx.now();
  try {
    if (name === 'create_case') {
      const created = newCase({ ...pick(args, { title: 'title', client: 'client', summary: 'summary', origin: 'origin', quote_ref: 'quoteRef', next_action: 'nextAction', next_action_due: 'nextActionDue', note: 'note', note_kind: 'noteKind' }) }, ctx.ownerEmail, WHO(ctx), now);
      await ctx.store.save(created);
      return ok({ created: summary(created, now) });
    }
    if (name === 'add_update') {
      const c = findCase(await visible(ctx), args.case);
      const next = addUpdate(c, { text: args.text, kind: args.kind }, WHO(ctx), now);
      await ctx.store.save(next);
      return ok({ added_to: summary(next, now) });
    }
    if (name === 'update_case') {
      const c = findCase(await visible(ctx), args.case);
      const patch = pick(args, { status: 'status', next_action: 'nextAction', next_action_due: 'nextActionDue', title: 'title', client: 'client', summary: 'summary', origin: 'origin', quote_ref: 'quoteRef' });
      const next = patchCase(c, patch, WHO(ctx), now);
      if (next !== c) await ctx.store.save(next);
      return ok({ case: summary(next, now), changed: next !== c });
    }
    if (name === 'list_cases') {
      const status = (args.status as string | undefined) ?? 'active';
      let rows = await visible(ctx);
      rows = rows.filter((c) => (status === 'all' ? true : status === 'active' ? c.status !== 'closed' : c.status === (status as CaseStatus)));
      const s = typeof args.search === 'string' ? args.search.trim().toLowerCase() : '';
      if (s) rows = rows.filter((c) => [c.title, c.client, c.summary, ...c.updates.map((u) => u.text)].filter(Boolean).some((v) => (v as string).toLowerCase().includes(s)));
      return ok({ count: rows.length, cases: sortCases(rows, status === 'closed').map((c) => summary(c, now)) });
    }
    if (name === 'get_case') {
      return ok(detail(findCase(await visible(ctx), args.case), now));
    }
    return fail(`Unknown tool: ${name}`);
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Something went wrong.');
  }
}

type Rpc = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };

/** One JSON-RPC message in, one reply out (null for notifications, which get no reply). */
export async function handleRpc(msg: Rpc, ctx: McpContext): Promise<object | null> {
  const id = msg.id ?? null;
  const reply = (result: unknown) => ({ jsonrpc: '2.0', id, result });
  const error = (code: number, message: string) => ({ jsonrpc: '2.0', id, error: { code, message } });
  if (msg.id === undefined) return null; // notification
  switch (msg.method) {
    case 'initialize': {
      const want = (msg.params?.protocolVersion as string | undefined) ?? '';
      return reply({ protocolVersion: SUPPORTED.includes(want) ? want : SUPPORTED[0], capabilities: { tools: {} }, serverInfo: SERVER });
    }
    case 'ping': return reply({});
    case 'tools/list': return reply({ tools: TOOLS });
    case 'tools/call': {
      const name = msg.params?.name;
      if (typeof name !== 'string') return error(-32602, 'Missing tool name');
      return reply(await callTool(name, (msg.params?.arguments as Record<string, unknown>) ?? {}, ctx));
    }
    default: return error(-32601, `Method not found: ${msg.method}`);
  }
}
