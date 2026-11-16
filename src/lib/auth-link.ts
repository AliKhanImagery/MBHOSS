// Supabase invite and password-reset emails open the app with "#...&type=invite" or "&type=recovery"
// in the address. Read that before the Supabase client clears it from the URL.
export function parseAuthLinkType(hash: string | null | undefined): 'invite' | 'recovery' | null {
  if (!hash) return null;
  const type = new URLSearchParams(hash.replace(/^#/, '')).get('type');
  return type === 'invite' || type === 'recovery' ? type : null;
}
