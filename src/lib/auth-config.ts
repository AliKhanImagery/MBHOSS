// Sign-in switch. Off (default): the old developer mode, so nothing breaks while accounts are being set up.
// On: real Supabase sign-in is required everywhere, including the AI routes.
// Set NEXT_PUBLIC_AUTH_ENABLED=true in Vercel only after following docs/AUTH_ROLLOUT.md.
export const AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true';
