// One place for the database address and public key, used by the browser AND the server.
// The key is the public "anon" key (safe to ship; row-level security does the protecting).
// Before this file, only the browser had these built-in values, so on a deployment without the
// environment variables the server-side sign-in check failed with "database settings are missing".
export const DEFAULT_SUPABASE_URL = 'https://viglioqszxqiolhxfcka.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpZ2xpb3FzenhxaW9saHhmY2thIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ3NTE2NzksImV4cCI6MjExMDMyNzY3OX0.vU7hSRRbG0zt2FPIs_fNIdObz0Bx_4pN2Do8kyAdw9I';

export function supabaseConfig(env: Record<string, string | undefined> = process.env) {
  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY,
  };
}
