-- ============================================================================
-- MBHOSS — lock the database to signed-in team members.
-- Run this in Supabase → SQL Editor ONLY AFTER following docs/AUTH_ROLLOUT.md
-- steps 1-3 (accounts created, team_members rows added, sign-in switched on).
-- If you run it earlier, the live app loses access to its data.
--
-- Assumes team_members has columns: email, role ('Super Admin', 'SuperAdmin' or 'Admin' = admin).
-- Tables that do not exist are skipped.
-- To undo: see the ROLLBACK block at the bottom.
-- ============================================================================

create or replace function public.is_team_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.team_members where lower(email) = lower(auth.jwt() ->> 'email'));
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.team_members
                 where lower(email) = lower(auth.jwt() ->> 'email')
                   and lower(regexp_replace(role, '[\s_-]', '', 'g')) in ('superadmin', 'admin'));
$$;

do $$
declare t text; r record;
begin
  -- Remove every existing policy on these tables first (for example the wide-open
  -- "Allow public ..." ones). Policies add up (any one that allows, allows), so an
  -- old open policy would otherwise keep the data open to everyone.
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('databank_items', 'quotation_cases', 'quotations', 'template_settings', 'team_members', 'sourcing_options', 'project_cases')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;

  -- Everyday data: any signed-in team member can read and write.
  foreach t in array array['databank_items', 'quotation_cases', 'quotations', 'sourcing_options'] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('drop policy if exists team_all on public.%I', t);
      execute format('create policy team_all on public.%I for all to authenticated using (public.is_team_member()) with check (public.is_team_member())', t);
    end if;
  end loop;

  -- Saved quotations: the team can read, create and edit them, but only an admin can delete one for good.
  -- (Everyone else uses "Archive" in the app, which is just an edit.)
  if to_regclass('public.quotation_cases') is not null then
    drop policy if exists team_all on public.quotation_cases;
    drop policy if exists team_read on public.quotation_cases;
    drop policy if exists team_insert on public.quotation_cases;
    drop policy if exists team_update on public.quotation_cases;
    drop policy if exists admin_delete on public.quotation_cases;
    create policy team_read on public.quotation_cases for select to authenticated using (public.is_team_member());
    create policy team_insert on public.quotation_cases for insert to authenticated with check (public.is_team_member());
    create policy team_update on public.quotation_cases for update to authenticated using (public.is_team_member()) with check (public.is_team_member());
    create policy admin_delete on public.quotation_cases for delete to authenticated using (public.is_admin());
  end if;

  -- Template settings: team can read, only admins can change.
  if to_regclass('public.template_settings') is not null then
    alter table public.template_settings enable row level security;
    drop policy if exists team_read on public.template_settings;
    drop policy if exists admin_write on public.template_settings;
    create policy team_read on public.template_settings for select to authenticated using (public.is_team_member());
    create policy admin_write on public.template_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
  end if;

  -- Case Tracker: owner and admins only.
  if to_regclass('public.project_cases') is not null then
    alter table public.project_cases enable row level security;
    drop policy if exists owner_or_admin on public.project_cases;
    create policy owner_or_admin on public.project_cases for all to authenticated
      using (public.is_team_member() and (lower(owner_email) = lower(auth.jwt() ->> 'email') or public.is_admin()))
      with check (public.is_team_member() and (lower(owner_email) = lower(auth.jwt() ->> 'email') or public.is_admin()));
  end if;

  -- Team list: everyone can read their own row (needed at sign-in) and the team list; only admins change it.
  if to_regclass('public.team_members') is not null then
    alter table public.team_members enable row level security;
    drop policy if exists self_or_team_read on public.team_members;
    drop policy if exists admin_write on public.team_members;
    create policy self_or_team_read on public.team_members for select to authenticated
      using (lower(email) = lower(auth.jwt() ->> 'email') or public.is_team_member());
    create policy admin_write on public.team_members for all to authenticated using (public.is_admin()) with check (public.is_admin());
  end if;
end $$;

-- ROLLBACK (only if something goes wrong). With RLS off the tables are open again, as before:
-- alter table public.databank_items disable row level security;
-- alter table public.sourcing_options disable row level security;
-- alter table public.project_cases disable row level security;
-- alter table public.quotation_cases disable row level security;
-- alter table public.quotations disable row level security;
-- alter table public.template_settings disable row level security;
-- alter table public.team_members disable row level security;
