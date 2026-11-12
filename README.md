# CAOIM Admin

The church office system for Christ the Alpha & Omega International Ministries.
One sign-in for two jobs:

- **Website (caoim.org)**: page text, events, weekly programme, ministries,
  leaders, photos and posters. Changes go live on the website within about a minute.
- **Church records**: members and families, ministers' personal and ordination
  details, baptisms, weddings, child dedications and funerals (with printable
  certificates), giving, expenses and finance reports.

Built with Next.js 16 and Supabase (Postgres database, sign-in, photo storage).
Hosted on its own admin domain, separate from the public website.

---

## Who can do what

Every staff account has one role. The database enforces it (row-level
security), not just the menus. Someone who opens a page they shouldn't sees
nothing, and the database refuses the change.

| Role | Can |
|---|---|
| Website editor | Edit caoim.org |
| Church secretary | Members, families, ministers, baptisms/weddings/dedications/funerals, and the website |
| Treasurer | Giving, expenses, funds, reports. Sees members' **names only** (to credit a gift), not their details |
| Administrator | Everything, plus user accounts and the activity log |

New accounts start with no access. Every change to records, money and the
website is written to the activity log with who made it, and that log can't be
edited.

---

## One-time setup

### 1. Create the database

1. Create a free project at [supabase.com](https://supabase.com). Pick the
   region closest to Uganda. Save the database password somewhere safe.
2. Open **SQL Editor**, paste all of `supabase/migrations/0001_init.sql`, and
   run it.
3. **Authentication → Sign In / Providers → Email**: turn **off** “Allow new
   users to sign up”. Staff accounts are created from inside the admin.

### 2. Connect this app

```bash
cp .env.example .env.local
```

Fill in the three values from **Project Settings → API Keys**:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
SUPABASE_SECRET_KEY=sb_secret_…
```

The secret key can do anything in the database. Keep it in `.env.local` and the
hosting dashboard only. Never commit it or put it in the website.

### 3. Create the first administrator

```bash
npm install
npm run create-admin -- you@example.com "Your Name"
```

It prints a temporary password once. Sign in, then change it under **My account**.
Everyone else is added from **Users & roles**.

### 4. Copy the current website in

```bash
npm run import-website -- ~/Downloads/caoim-website
```

This copies all of caoim.org's current text and photos into the admin, so you
start from the real site rather than empty forms. Running it again leaves
existing events, leaders etc. alone. Add `--replace` to overwrite them.

### 5. Run it

```bash
npm run dev        # http://localhost:3000
```

---

## Hosting on the admin domain

Vercel is the simplest choice (Netlify also works):

1. New project from this repository. The framework is detected as Next.js.
2. Add the three environment variables from `.env.local`.
3. **Domains** → add `admin.caoim.org` and create the DNS record it shows you.
4. In Supabase, **Authentication → URL Configuration**: set the Site URL to
   `https://admin.caoim.org`.

Then connect the public website. In its hosting dashboard, set
`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (the same URL and
publishable key, **not** the secret key) and redeploy. See the website's README.

---

## Notes for the church

- **Free plan limits.** Supabase pauses a free project after a week with no
  activity. Website visitors count as activity, so this normally won't happen.
  The free plan has no automatic backups. For member and finance records,
  upgrade to the Pro plan for daily backups, or export regularly from
  **Database → Backups**.
- **Member numbers** (`M-00001`) and **certificate numbers** (`BAP-2026-001`,
  `WED-…`, `DED-…`, `FUN-…`) are assigned automatically. Fill in the certificate
  number yourself when copying an old paper record. Member numbers can skip if a
  save fails partway; that's normal.
- **Wedding certificates** printed here are the church's own. The legal marriage
  certificate is still the registrar's form.
- **Photos** are shrunk in the browser before upload (2000px max), so phone
  photos don't slow the website down. iPhone HEIC photos may not preview in some
  browsers; export them as JPEG first.
- **Deleting a member** keeps their giving and ceremony records; those just lose
  the link to the person. Setting their status to Inactive or Transferred is
  usually better.

---

## Development

```bash
npm run dev          # local server
npm run typecheck
npm run lint
npm run test:db      # runs the migration in an in-memory Postgres and checks every role's access
```

```
supabase/migrations/0001_init.sql   tables, roles, row-level security, triggers, site_content()
supabase/tests/access.test.mjs      53 checks of who can read and change what
scripts/create-admin.mjs            first administrator
scripts/import-website.mjs          copies caoim.org's content and photos in
src/proxy.ts                        sends signed-out visitors to /login
src/lib/roles.ts                    role → area map (mirrors public.can() in SQL)
src/app/(app)/website/              caoim.org content
src/app/(app)/members, households, ministers, milestones/
src/app/(app)/finance/              giving, expenses, funds, reports
src/app/certificate/[id]/           printable certificate (A4 landscape)
```

The public website calls one database function, `site_content()`, which
returns published content in the same shape as the website's `site.js`.
