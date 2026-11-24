// Claude connection for the Case Tracker (MCP over HTTP). Claude (claude.ai chat, desktop or phone) calls this
// from Anthropic's cloud with a fixed secret in the Authorization header, set once when the connector is added.
//
// Vercel environment variables (all server-only, none start with NEXT_PUBLIC):
//   MCP_TOKEN                 a long random secret (24+ characters). Without it this endpoint stays off.
//   MCP_OWNER_EMAIL           the app user Claude acts as. Cases it creates belong to this person.
//   SUPABASE_SERVICE_ROLE_KEY needed only after the database is locked (supabase/auth_setup.sql).
import { NextRequest, NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '@/lib/supabase-config';
import { isAdminRole } from '@/lib/roles';
import { handleRpc, type McpContext } from '@/lib/mcp-cases';
import type { ProjectCase } from '@/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const sha = (s: string) => createHash('sha256').update(s).digest();
const tokenOk = (given: string, expected: string) => timingSafeEqual(sha(given), sha(expected));
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

function db() {
  const { url, anonKey } = supabaseConfig();
  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY || anonKey, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
  const expected = process.env.MCP_TOKEN ?? '';
  const owner = (process.env.MCP_OWNER_EMAIL ?? '').trim();
  if (expected.length < 24 || !owner) return json({ error: 'The Claude connection is not set up yet.' }, 503);

  const given = req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1] ?? '';
  if (!given || !tokenOk(given, expected)) return json({ error: 'Not allowed.' }, 401);

  let body: unknown;
  try { body = await req.json(); } catch { return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Invalid JSON' } }, 400); }

  const client = db();
  const { data: member } = await client.from('team_members').select('role').ilike('email', owner).maybeSingle();
  const ctx: McpContext = {
    ownerEmail: owner,
    isAdmin: isAdminRole((member as { role?: string } | null)?.role),
    now: () => new Date(),
    store: {
      async list() {
        const { data, error } = await client.from('project_cases').select('id, owner_email, data');
        if (error) throw new Error(`The tracker could not be read (${error.message}). Has supabase/project_cases.sql been run?`);
        return (data ?? []).map((r: { id: string; owner_email: string; data: ProjectCase }) => ({ ...r.data, id: r.id, ownerEmail: r.owner_email }));
      },
      async save(c) {
        const { error } = await client.from('project_cases').upsert({ id: c.id, owner_email: c.ownerEmail, data: c, updated_at: c.updatedAt });
        if (error) throw new Error(`The tracker could not be saved (${error.message}).`);
      },
    },
  };

  const messages = Array.isArray(body) ? body : [body];
  const replies = (await Promise.all(messages.map((m) => handleRpc(m as never, ctx)))).filter((r) => r !== null);
  if (replies.length === 0) return new NextResponse(null, { status: 202 });
  return json(Array.isArray(body) ? replies : replies[0]);
}

// This server does not stream, so GET (the optional stream) and DELETE are declined.
export async function GET() { return json({ error: 'Use POST.' }, 405); }
export async function DELETE() { return json({ error: 'Use POST.' }, 405); }
