-- Sourcing options (suppliers we could buy or fabricate from), kept in the Data Bank.
-- Safe to run more than once. Each row is one supplier; "data" holds the full record.
create table if not exists public.sourcing_options (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Same rule as the other everyday tables: any signed-in team member can read and write.
-- (If you have not run supabase/auth_setup.sql yet, the table is open like the others.)
do $$
begin
  if to_regprocedure('public.is_team_member()') is not null then
    alter table public.sourcing_options enable row level security;
    drop policy if exists team_all on public.sourcing_options;
    create policy team_all on public.sourcing_options for all to authenticated
      using (public.is_team_member()) with check (public.is_team_member());
  end if;
end $$;
