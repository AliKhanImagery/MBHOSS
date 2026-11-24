# Case Tracker: one-time setup

The tracker works on its own as soon as it is deployed (cases are kept on the device). These steps share it across devices and let Claude add cases from chat.

## 1. Create the table (once)
Supabase → SQL Editor → paste the **text** of `supabase/project_cases.sql` → Run. Safe to run again.
If you also want the Sourcing options shared, run `supabase/sourcing_options.sql` the same way.

## 2. Turn on the Claude connection (once)
In Vercel → project `mbhoss` → Settings → Environment Variables, add (Production):

| Name | Value |
| --- | --- |
| `MCP_TOKEN` | A long random secret, at least 24 characters. Make one with a password manager. Do not paste it in chat. |
| `MCP_OWNER_EMAIL` | The app login Claude acts as, e.g. your own email. Cases Claude adds belong to this person. |
| `SUPABASE_SERVICE_ROLE_KEY` | Only needed after `supabase/auth_setup.sql` has locked the database. From Supabase → Project Settings → API. Server only. Never put it in a `NEXT_PUBLIC_` variable. |

Redeploy after saving the variables.

## 3. Add the connector in Claude
Claude → Settings → Connectors → Add custom connector.
- URL: `https://mbhoss.vercel.app/api/mcp`
- Request headers: `Authorization` = `Bearer <your MCP_TOKEN>` (the word Bearer, a space, then the token)

Then, in a chat, try: "List my open cases", or "Add a case: syrup tank enquiry, boss asked for a quote by Friday".

## Rules the connection follows
- Claude may only record what you said or what is readable in what you sent. Gaps stay empty.
- If two cases could match, Claude must ask which one. It never picks for you.
- Every entry shows who recorded it and "via Claude".
- Claude sees only your cases (all cases if your app role is admin).
- A photo you send in chat is read by Claude and its text goes in the timeline. The picture itself is not stored.
