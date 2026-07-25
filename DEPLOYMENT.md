# Deployment guide

Deployment runbook for the Coaching Institute LMS/ERP
(Next.js 16 · Prisma 6 · NextAuth v5 · PostgreSQL). Covers the
recommended path (Vercel + Supabase) and a self-hosted alternative.

---

## 1. Architecture at a glance

| Layer | Technology | Notes |
|------|-----------|-------|
| App | Next.js 16 (App Router, Turbopack, Server Actions) | one deployable — SSR + API in one process |
| ORM | Prisma 6 | schema in `prisma/schema.prisma`, migrations in `prisma/migrations` |
| DB | PostgreSQL 15+ (Supabase) | Row-Level Security enabled on all tables |
| Auth | NextAuth v5 (JWT sessions) | `AUTH_SECRET` signs the session |
| File storage | S3 / Cloudflare R2 *(optional)* | resource uploads; signed URLs |
| Email / SMS / WhatsApp / Razorpay | Resend / Twilio / Meta / Razorpay *(optional)* | keys can live in env **or** be set in-app via Control Center |
| Async jobs | Upstash QStash *(optional)* | large bulk imports, notification fan-out |

**Prerequisites:** Node.js 20 LTS, a PostgreSQL database, and a GitHub
repo. Everything else is optional and can be added after go-live.

---

## 2. Environment variables

Copy `.env.example` → `.env` for local dev, and set the same keys in your
host's dashboard for production.

### Required

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Runtime connection. Supabase **transaction pooler**, port `6543`, `?pgbouncer=true`. |
| `DIRECT_URL` | Migrations only. Supabase **session pooler**, port `5432` (no pgbouncer). |
| `AUTH_SECRET` | Signs NextAuth JWTs. Generate: `npx auth secret` or `openssl rand -base64 32`. |

### Required in production

| Variable | Purpose |
|----------|---------|
| `AUTH_URL` | The deployed origin, e.g. `https://lms.yourdomain.com`. Needed for correct auth callbacks. |
| `APP_URL` / `NEXT_PUBLIC_APP_URL` | Public base URL used in emails (reset links) and QStash callbacks. Set to the deployed origin. |

### Optional (enable a feature by setting its group)

| Group | Variables |
|------|-----------|
| File uploads | `S3_REGION` `S3_BUCKET` `S3_ACCESS_KEY_ID` `S3_SECRET_ACCESS_KEY` `S3_ENDPOINT` (R2 only) |
| Email | `RESEND_API_KEY` `EMAIL_FROM` |
| SMS | `TWILIO_ACCOUNT_SID` `TWILIO_AUTH_TOKEN` `TWILIO_FROM_NUMBER` |
| Async queue | `QSTASH_TOKEN` `QSTASH_CURRENT_SIGNING_KEY` `QSTASH_NEXT_SIGNING_KEY` |
| Session | `SESSION_IDLE_MINUTES` (idle timeout; sensible default if unset) |

> **Razorpay, WhatsApp, and branding** don't need env vars — the Super
> Admin sets them in **Control Center** and they're stored (encrypted at
> rest) in the database. Env values act only as a fallback.

The build succeeds even before env vars are set (all DB-backed pages are
dynamic), but the app only **functions** once the required keys exist.

---

## 3. Provision the database (Supabase)

1. Create a project at supabase.com. Choose a region close to your users
   (e.g. Mumbai `ap-south-1` for India).
2. **Dashboard → Connect → ORMs / Prisma** and copy both strings into
   your env: the pooled one → `DATABASE_URL` (port 6543), the direct one
   → `DIRECT_URL` (port 5432).
3. Keep the DB password safe — it's embedded in both URLs.

(Neon or any managed Postgres 15+ works too; supply both URLs. For a
single non-pooled server, point both variables at the same connection.)

---

## 4. Apply migrations + optional seed

Run these **once from your machine** (or a CI step) against the new DB —
they use `DIRECT_URL`:

```bash
npm ci
npx prisma migrate deploy      # creates every table + enables RLS
```

Optional demo data (users, a batch, sample content) for a staging box:

```bash
npm run db:seed
```

> The seed creates **demo** accounts (`admin@lms.test`, `teacher@lms.test`,
> `student@lms.test`). **Do not seed production** — instead create your own
> Super Admin (see §6) and skip the demo users.

Whenever `schema.prisma` changes later, generate a migration in dev
(`npm run db:migrate`), commit it, then run `npx prisma migrate deploy`
against production before/at deploy time.

---

## 5. Deploy to Vercel (recommended)

1. Push the repo to GitHub (`git push -u origin main`).
2. **Import** the repo at vercel.com → New Project.
3. Framework preset **Next.js** is auto-detected. Leave the build command
   as the default `next build` (`postinstall` runs `prisma generate`).
   - **Do not** put `prisma migrate deploy` in the Vercel build command —
     migrations run against `DIRECT_URL` as a separate step (§4), so the
     build stays fast and can't half-apply schema.
4. **Settings → Environment Variables:** add everything from §2 for the
   **Production** (and Preview) environments.
5. Set Node version **20.x** in Project Settings → General.
6. **Deploy.** Every push to `main` redeploys automatically (§8).

---

## 6. First run — create the Super Admin

The portal enforces a single `SUPER_ADMIN` (the owner). On a fresh
production DB, create it once. Two options:

- **SQL (quickest):** insert an `Institute` row with `id = 'inst-default'`
  if absent, then a `User` with `role = 'SUPER_ADMIN'`, a bcrypt-hashed
  password, and `instituteId = 'inst-default'`.
- **Promote:** create a normal admin, then
  `UPDATE "User" SET role = 'SUPER_ADMIN' WHERE email = '…'` (the partial
  unique index allows exactly one).

Then sign in and, from **Users**, create your real Admins, Teachers, and
Students (or use **Bulk import**).

---

## 7. Configure in-app (no redeploy needed)

Sign in as the Super Admin → **Control Center**:

1. **Branding (white-label):** set the institute **name**, **tagline**,
   **logo URL**, and **primary colour**. Reflects across every screen, the
   browser title, and outgoing emails. Leave a field blank to restore its
   default.
2. **Payments (Razorpay):** enter Key ID + Secret and enable — "Pay
   online" then appears on student fee pages.
3. **Email / WhatsApp / SMS:** enter provider credentials to turn on
   notifications.

---

## 8. Custom domain

1. Vercel → Project → **Settings → Domains** → add `lms.yourdomain.com`.
2. Create the CNAME/A record it shows at your DNS provider; TLS is issued
   automatically.
3. Update `AUTH_URL` and `APP_URL`/`NEXT_PUBLIC_APP_URL` to the new origin
   and redeploy so auth callbacks and email links use it.

---

## 9. Continuous deployment

- Push to `main` → Vercel builds and promotes to production.
- Pull requests get their own **Preview** deployment with the Preview env
  vars — use a separate Supabase project for previews so they never touch
  production data.
- If a release includes a schema change, run `npx prisma migrate deploy`
  against production **before** (or as part of) the release.

---

## 10. Self-hosting alternative (VPS / Docker)

The app is a standard Node server — no serverless lock-in.

```bash
npm ci
npx prisma migrate deploy
npm run build
npm run start           # serves on :3000 — put Nginx/Caddy in front for TLS
```

Keep it alive with PM2 (`pm2 start "npm run start" --name lms`) or a
`systemd` unit, or containerise on `node:20-slim` (run the three commands
above, expose `3000`). Set all §2 env vars in the environment. For file
uploads on a self-host, point `S3_*` at Cloudflare R2 or MinIO.

---

## 11. Rollback & troubleshooting

- **Roll back a release:** Vercel → Deployments → previous good build →
  **Promote to Production** (instant; code only — DB unchanged).
- **Roll back a migration:** restore from a Supabase backup or apply a
  compensating migration. Never hand-edit a shipped migration file.
- **Auth loops / "untrusted host":** `AUTH_URL` doesn't match the real
  origin, or `AUTH_SECRET` is missing/rotated. Fix and redeploy.
- **`prisma migrate` can't connect / P1001:** you used the pooled URL
  (6543) — migrations need `DIRECT_URL` (5432).
- **DB connection exhaustion under load:** ensure the **runtime**
  `DATABASE_URL` is the pooled URL with `?pgbouncer=true`.
- **Emails/reset links point at localhost:** set `APP_URL` /
  `NEXT_PUBLIC_APP_URL` to the deployed origin.
