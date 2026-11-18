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

-- Step 1: if a row for this email already exists, make it Super Admin (keeps name and any quote range).
update public.team_members
   set role = 'Super Admin',
       features = coalesce(features, '{}'::jsonb)
                  || '{"directPdfExport": true, "dataBankWrite": true, "marginOverride": true, "whatsappBot": true}'::jsonb
 where lower(email) = 'alikhanimagery@gmail.com';

-- Step 2: if there was no row, create it. (Does nothing when step 1 found one.)
insert into public.team_members (name, email, role, avatar, features)
select 'Ali Khan', 'alikhanimagery@gmail.com', 'Super Admin', 'AK',
       '{"directPdfExport": true, "dataBankWrite": true, "marginOverride": true, "whatsappBot": true}'::jsonb
 where not exists (select 1 from public.team_members where lower(email) = 'alikhanimagery@gmail.com');

-- Check: should show one row with role 'Super Admin'.
select id, name, email, role, features from public.team_members where lower(email) = 'alikhanimagery@gmail.com';
