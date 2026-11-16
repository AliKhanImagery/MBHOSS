# Turning on real sign-in (MBHOSS)

Until this is done the app runs in developer mode: anyone with the link can enter as an admin, and the AI routes are open. The code is ready; these steps switch it on without locking anyone out. **Do them in this order.**

0. **Create the tables (once).** Supabase → SQL Editor → paste `supabase/base_schema.sql` → Run. It only creates what is missing and never deletes or changes existing data, so it is safe to re-run. `team_members` starts empty on purpose.
1. **Create accounts.** Supabase → Authentication → Users → *Add user* (email + password, tick auto-confirm) for every employee, including yourself.
   Then Authentication → Sign In / Providers → turn **off** "Allow new users to sign up", so strangers cannot register themselves.
2. **List the team.** Table Editor → `team_members`: one row per person with the same email, a name, and `role` = `Super Admin` (or `Admin`) for admins (anything else for employees). Optional `features` JSON:
   `{"directPdfExport":true,"dataBankWrite":true,"marginOverride":false,"whatsappBot":false}`
   (`marginOverride` = can see cost and margin; give it only to people who should.)
3. **Switch sign-in on.** Vercel → Project → Settings → Environment Variables → add `NEXT_PUBLIC_AUTH_ENABLED` = `true` → redeploy. Open the site, sign in as an admin, check Quote Template and Make a Quotation work.
4. **Lock the database.** Supabase → SQL Editor → paste `supabase/auth_setup.sql` → Run.
5. **Check it worked.**
   - A private/incognito window shows the sign-in form, not the app.
   - `curl -X POST https://<your-site>/api/qri-agent -d '{}'` returns 401.
   - An employee account cannot publish the template (the Quote Template page is read-only for them).

**Adding or removing people later:** add/remove the Supabase user *and* the `team_members` row. An account without a `team_members` row cannot get in. To reset a password: Supabase → Authentication → Users.

**If something goes wrong:** remove `NEXT_PUBLIC_AUTH_ENABLED` and redeploy (developer mode returns), and run the ROLLBACK lines at the bottom of `supabase/auth_setup.sql`.

Note: staging/preview deployments share the same database, so this applies to them too.
