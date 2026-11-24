-- Case Tracker: one row per project/enquiry. "data" holds the whole case (details + timeline).
-- Safe to run more than once. Nothing is ever deleted by the app: cases are closed, not removed.
create table if not exists public.project_cases (
  id text primary key,
  owner_email text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Owner and admins only. This part switches on only after supabase/auth_setup.sql has been run
-- (it creates is_team_member / is_admin). Until then the table is open like the others, and the app
-- itself still shows each person only their own cases.
-- The Claude connection uses SUPABASE_SERVICE_ROLE_KEY (server only), which is not affected by these rules.
do $$
begin
  if to_regprocedure('public.is_team_member()') is not null and to_regprocedure('public.is_admin()') is not null then
    alter table public.project_cases enable row level security;
    drop policy if exists owner_or_admin on public.project_cases;
    create policy owner_or_admin on public.project_cases for all to authenticated
      using (public.is_team_member() and (lower(owner_email) = lower(auth.jwt() ->> 'email') or public.is_admin()))
      with check (public.is_team_member() and (lower(owner_email) = lower(auth.jwt() ->> 'email') or public.is_admin()));
  end if;
end $$;
