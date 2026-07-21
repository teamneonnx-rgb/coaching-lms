# Deploying to Vercel

This app is a standard Next.js 16 project and deploys cleanly on Vercel via Git.
The build succeeds even before env vars are set (all DB-backed pages are dynamic),
but the app only **functions** once the environment variables below are configured.

## 1. Push to GitHub

The repo is already committed locally. Create an empty GitHub repo, then:

```bash
git remote add origin https://github.com/<you>/coaching-lms.git
git branch -M main
git push -u origin main
```

## 2. Import into Vercel

- Vercel Dashboard → **Add New… → Project** → import the GitHub repo.
- Framework preset: **Next.js** (auto-detected). Leave build/output settings default.
- Before the first deploy, add the environment variables in **Settings → Environment
  Variables** (see below), then Deploy.

## 3. Environment variables (Settings → Environment Variables)

Copy the secret values from your local `.env` (do **not** commit `.env`).

| Variable | Value | Needed for |
|---|---|---|
| `DATABASE_URL` | (from `.env` — Supabase transaction pooler, `:6543`, `pgbouncer=true`) | Runtime DB |
| `DIRECT_URL` | (from `.env` — Supabase session pooler, `:5432`) | Migrations |
| `AUTH_SECRET` | (from `.env`) | Auth (required) |
| `AUTH_URL` | `https://<your-project>.vercel.app` (your deployed origin) | Auth callbacks |

Optional integrations — the app degrades gracefully until these are set:

| Variable(s) | Enables |
|---|---|
| `RESEND_API_KEY`, `EMAIL_FROM` | Real parent/teacher **emails** |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` | Real parent **SMS** |
| `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, (`S3_ENDPOINT` for R2) | Real **video/PDF/scan** media |
| `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`, `APP_URL` | Production alert **queue** |

## 4. Database

The schema is already live on Supabase and all three migrations are baselined in
`_prisma_migrations`, so `prisma migrate deploy` (run automatically if you add it to
the build, or manually) is a no-op. Nothing to do unless you change the schema.

`postinstall` runs `prisma generate` on Vercel automatically.

## 5. After deploy

- Set `AUTH_URL` to the final production domain and redeploy if it changed.
- Demo logins: `admin@lms.test` / `teacher@lms.test` / `student@lms.test`.
