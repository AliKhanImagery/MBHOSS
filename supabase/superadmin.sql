-- ============================================================================
-- MBHOSS — make alikhanimagery@gmail.com the Super Admin.
-- Run in Supabase -> SQL Editor. Safe to run more than once.
--
-- Two things must both be true for sign-in to work:
--   1. a sign-in account exists:  Supabase -> Authentication -> Users -> the
--      email below (set a password, or use "Forgot password" on the login page);
--   2. a team_members row exists with an admin role  <- this file does that.
-- It changes only this one person's row. It never deletes or touches anyone else.
-- ============================================================================

insert into public.team_members (name, email, role, avatar, features)
values (
  'Ali Khan',
  'alikhanimagery@gmail.com',
  'Super Admin',
  'AK',
  '{"directPdfExport": true, "dataBankWrite": true, "marginOverride": true, "whatsappBot": true}'::jsonb
)
on conflict (lower(email)) do update
  set role = 'Super Admin',
      name = coalesce(public.team_members.name, excluded.name),
      avatar = coalesce(public.team_members.avatar, excluded.avatar),
      -- keep any quote number range already assigned; only switch the permissions on
      features = coalesce(public.team_members.features, '{}'::jsonb) || excluded.features;

-- Check: should show one row with role 'Super Admin'.
select id, name, email, role, features from public.team_members where lower(email) = 'alikhanimagery@gmail.com';
