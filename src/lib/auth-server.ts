// Server-side check used by the API routes. With sign-in switched off it lets everything through
// (developer mode). With it on, the request must carry a valid Supabase session of a known team member.
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AUTH_ENABLED } from './auth-config';

export type AuthResult = { ok: true; email: string | null } | { ok: false; status: number; error: string };

export async function requireSession(req: NextRequest): Promise<AuthResult> {
  if (!AUTH_ENABLED) return { ok: true, email: null };

  const token = req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return { ok: false, status: 401, error: 'Please sign in again.' };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return { ok: false, status: 500, error: 'Sign-in is switched on but the database settings are missing.' };

  const client = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user?.email) return { ok: false, status: 401, error: 'Please sign in again.' };

  // Must also be a listed team member (an account alone is not enough).
  const { data: member } = await client.from('team_members').select('id').ilike('email', data.user.email).maybeSingle();
  if (!member) return { ok: false, status: 403, error: 'Your account is not set up for this app. Please ask an admin.' };

  return { ok: true, email: data.user.email };
}
