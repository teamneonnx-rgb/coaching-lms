# AUDIT.md — Coaching Institute LMS (read-only codebase audit)

_Generated 21 Jul 2026. Honest assessment, not a sales pitch. Paths are repo-relative._

---

## 1. STACK

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Framework | Next.js (App Router, **Turbopack**) | 16.2.10 | `next.config.ts` is empty defaults |
| UI runtime | React | 19.2.4 | Server Components + Server Actions |
| Language | TypeScript (strict) | ^5 | `tsconfig.json` `"strict": true` |
| ORM | Prisma | 6.19.3 | **Pinned to v6** — v7 removed `url` in datasource + `prisma-client-js` generator |
| Database | PostgreSQL on **Supabase** | PG 15, ap-south-1 | Transaction pooler `:6543` (runtime) + session pooler `:5432` (`DIRECT_URL`, migrations) |
| Auth | NextAuth.js (Auth.js) v5 | 5.0.0-**beta.31** | JWT sessions, `trustHost:true`; split edge/node config |
| Password hashing | bcryptjs | 3.0.3 | 12 rounds |
| Styling | Tailwind CSS v4 + shadcn/ui | tw v4, shadcn CLI 4.x (`radix-nova`) | components import from consolidated `radix-ui` pkg |
| Charts | recharts | 3.9.2 | admin dashboard + student progress donut |
| Forms | react-hook-form + @hookform/resolvers + zod | 7.x / 5.x / 4.x | `useFieldArray` in the quiz builder |
| Toast | sonner | 2.0.7 | mounted globally in `src/app/layout.tsx` |
| Client polling | swr | 2.x | notification bell |
| File storage | AWS S3 / Cloudflare R2 via `@aws-sdk/client-s3` + `s3-request-presigner` | 3.x | **NOT configured** — signed-URL code degrades to null |
| Queue/worker | Upstash QStash `@upstash/qstash` | 2.x | **NOT configured** — falls back to fire-and-forget |
| Email | Resend (raw `fetch`) | — | **NOT configured** — logs to console instead |
| SMS | Twilio (raw `fetch`) | — | **NOT configured** — logs to console instead |
| Hosting | **Vercel** (auto-deploy from GitHub `teamneonnx-rgb/coaching-lms`) | — | live at `coaching-lms-eight.vercel.app` |
| Tests | **NONE** | — | no test runner, no tests, no CI |

**Deployment reality:** every push to `main` auto-builds on Vercel. Env vars set in Vercel: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET` (no `AUTH_URL` — inferred via `trustHost`). RLS is enabled on all 14 tables in Supabase; the app connects as the DB owner role which bypasses RLS.

---

## 2. ARCHITECTURE

**Organisation** — everything under `src/`, App Router with route groups:

```
Browser
  │
  ▼
src/proxy.ts  (Edge middleware = NextAuth authorized() callback from src/auth.config.ts)
  │  inspects JWT → allows / redirects by role prefix (/admin /teacher /student)
  ▼
┌───────────────────────────── App Router (src/app) ─────────────────────────────┐
│ (auth)/login,register     admin/*        teacher/(main)/*  + teacher/assessments│
│ student/*                 dashboard      api/*                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
  │                                             │
  │ READ (Server Component)                     │ WRITE (Server Action, "use server")
  ▼                                             ▼
src/lib/{student,teacher,assessments,content}.ts     src/lib/actions/**  (guard → zod → mutate → revalidatePath)
  │                                             │
  ▼                                             ▼
src/lib/db.ts  (PrismaClient singleton)  ───────────────►  PostgreSQL (Supabase)
                                                │
                        side-effects: src/lib/notifications/** , src/lib/queue.ts , src/lib/storage.ts
```

- **Reads** live in Server Components calling data helpers (`src/lib/*.ts`) that call Prisma directly.
- **Writes** are Server Actions in `src/lib/actions/**`, each: authorize (server-side) → validate (zod) → Prisma → `revalidatePath`.
- **Auth split:** `src/auth.config.ts` (edge-safe: pages, jwt/session/authorized callbacks, `providers:[]`) is consumed by `src/proxy.ts`; `src/auth.ts` (Node: Credentials provider using Prisma + bcrypt) exports `handlers/auth/signIn/signOut`. Route handler at `src/app/api/auth/[...nextauth]/route.ts`.
- **Session guards:** `src/lib/session.ts` → `requireUser()`, `requireRole(role)`. Per-action guards: `assertAdmin()` (`src/lib/actions/admin/guard.ts`), `assertCanManageCourse()` (`src/lib/actions/content.ts`), `teacherOwnsBatch()` (`src/lib/teacher.ts`).
- **Cross-cutting libs:** `grading.ts` (objective auto-grade + negative marking), `date.ts` (UTC-midnight for `@db.Date`), `roles.ts` (role→home route), `storage.ts` (signed GET/PUT), `queue.ts` (QStash or fire-and-forget), `notifications/{email,sms,events,attendance-alert,admin-notify}.ts`.

---

## 3. DATA MODEL (`prisma/schema.prisma`)

**Enums:** `Role{ADMIN,TEACHER,STUDENT}` · `ResourceType{VIDEO,PDF}` · `AttendanceStatus{PRESENT,ABSENT,LATE,ON_LEAVE}` · `NotificationType{TEACHER_ATTENDANCE,STUDENT_ENROLLMENT,SYSTEM_ALERT}` · `AssessmentType{OBJECTIVE,SUBJECTIVE}` · `SubmissionStatus{SUBMITTED,GRADED}`

| Model | Key columns | Relations | Notes |
|---|---|---|---|
| **User** | id, name, email _(unique)_, password, role, parentName?, parentPhone?, parentEmail? | attendances, notifications, courses(teacher), enrollments(student), progress, assessments(teacher), submissions(student), gradedSubmissions(teacher) | Parent contact is **flat fields**, not linked Parent accounts |
| **Batch** | id, name _(unique)_, description?, startDate, endDate?, isActive | courses, enrollments, attendances | No batch_code, capacity, mode, schedule, co-teachers |
| **Enrollment** | id, studentId, batchId, isActive, enrolledAt | student, batch · `@@unique([studentId,batchId])` | supports multi-batch; `isActive:false` = soft unenroll |
| **Course** | id, title, description?, batchId, teacherId | batch, teacher, chapters, assessments | 1 course belongs to exactly 1 batch (PRD wants batch↔course many, co-teachers) |
| **Chapter** | id, title, order, courseId | resources | **flat** — no Module/Lesson hierarchy |
| **Resource** | id, title, type(VIDEO/PDF), fileKey, fileSize?, **duration?**, order, chapterId | progress | `fileKey` may hold an http URL or S3 key; `fileSize` **never written** (orphaned) |
| **Attendance** | id, date `@db.Date`, status, userId, batchId?, markedAt, **validatedById?, validatedAt?** | user, batch · `@@unique([userId,date,batchId])` | **per-day**, not per-ClassSession; `validatedById` is a plain string (**no FK**) |
| **Notification** | id, title, message, type, isRead, userId, createdAt | user | no channel/delivery tracking |
| **ResourceProgress** | id, studentId, resourceId, completedAt · `@@unique` | student, resource | binary done/not-done; no %-watched |
| **Assessment** | id, title, description?, type, courseId, teacherId, negativeMarking, timeLimit?, isPublished | questions, submissions | no availability window, attempts, shuffle, passing marks |
| **Question** | id, assessmentId, text, points, order | options, answers | single type (MCQ); no LaTeX/image/difficulty/topic |
| **QuestionOption** | id, questionId, text, isCorrect, order | answers | — |
| **Submission** | id, assessmentId, studentId, status, score?, maxScore?, feedback?, fileKey?, gradedById?, gradedAt?, submittedAt · `@@unique([assessmentId,studentId])` | answers | one attempt; `fileKey` for subjective scan |
| **Answer** | id, submissionId, questionId, selectedOptionId?, isCorrect? | — | — |
| **_prisma_migrations** | (Prisma internal) | — | 4 migrations baselined manually via Supabase connector |

**Orphaned / unused:** `Resource.fileSize` is in the schema but never set by any action. **No** `ClassSession`, `Module`, `Lesson`, `ContentBlock`, `Assignment`, `FeePlan`, `Invoice`, `Transaction`, `AuditEntry`, `ParentLink`, `NotificationEvent/Delivery` models. **No** `created_by/updated_by/deleted_at/deleted_by` audit columns on any model.

---

## 4. EXISTING FEATURES (honest)

### Complete (works, verified in browser)
- **Auth** — student self-signup (STUDENT-only), email+password login, logout, JWT sessions, bcrypt (12), `/dashboard` role router. `src/app/(auth)/**`, `src/lib/actions/auth.ts`, `src/auth*.ts`.
- **Edge RBAC** — route-prefix enforcement per role. `src/proxy.ts`, `src/auth.config.ts`.
- **Admin** — dashboard (metrics + recharts + activity), **Users CRUD**, **Batches CRUD**, **Courses CRUD**, **enrollment management** (`admin/batches/[batchId]`), **bulk student CSV import** (`admin/import`), **content authoring** (`admin/courses/[courseId]`).
- **Teacher** — dashboard, **batch create** (`teacher/batches`), **content authoring** (`teacher/content`), **attendance** (self + roster + validate pending self-marks), **assessment builder** (3-tier UI, `useFieldArray`), grading.
- **Student** — dashboard (donut/calendar/schedule), course browse, **resource viewer** (video/PDF, plays pasted URL or signed S3), **self-attendance**, **assessments** (take objective → auto-grade w/ negative marking; subjective upload; results).
- **Attendance workflow** — student self-mark → pending → teacher validate → parent alert (SMS+email) + admin notify; teacher roster auto-validates; teacher self → admin notify. `@@unique` blocks dup per day.
- **Assessments engine** — objective auto-grade + negative marking (`src/lib/grading.ts`, verified 3/12 exact); subjective manual grade.
- **Notifications (in-app)** — bell w/ SWR polling for **all roles**, `/api/notifications`, stage notifications (welcome, new material, test published, graded).

### Partially built
- **Email / SMS** — Resend + Twilio code exists (`src/lib/notifications/{email,sms}.ts`) but **unconfigured** → logs only. Dispatch is **fire-and-forget** (`void ...`) → unreliable on Vercel serverless. No engine/matrix/delivery-log/retry/quiet-hours.
- **Storage** — S3/R2 signed GET+PUT code (`src/lib/storage.ts`) but **unconfigured**. Content works via **pasted URLs**. No virus scan, no quota, no transcoding, no bulk resource upload.
- **Queue** — QStash publish + signature-verify worker (`src/app/api/jobs/attendance-alert/route.ts`) but **unconfigured** → fire-and-forget fallback.
- **Content model** — only **VIDEO/PDF** resource types; flat **Chapter→Resource** (PRD wants Module→Lesson→10 ContentBlock types + LaTeX/HTML/code/image/link/comments/QA).
- **Assessments** — only single-correct **MCQ** + **subjective upload** (PRD wants 8 question types, question bank, timer/palette/15s-autosave, analytics, availability windows).

### Stubbed / dead / missing (not built at all)
Payments (Razorpay, fee plans, invoices, collections), WhatsApp integration, notification engine + matrix, blog, Q&A, comments, feedback, question bank, offline marks entry grid, assignments module, audit log, soft-delete + recycle bin, approval workflow, Control Center, Access Control / permission matrix / custom roles, reports (progress/class/batch/teacher/institute), **Parent role + portal + ParentLink**, **IT role**, **Super Admin role**, 2FA, OTP verification, forgot-password, impersonation, teacher/student rich profiles, announcements, ClassSession scheduling + holiday calendar, low-attendance alerts, at-risk detection, multi-tenancy, i18n, data export.

---

## 5. AUTH & PERMISSIONS

- **Roles today:** `ADMIN`, `TEACHER`, `STUDENT` — **3 of the PRD's 5**. No `SUPER_ADMIN`, `IT`, `PARENT`.
- **How checks work (all server-side — good):**
  - Edge: `src/proxy.ts` runs the `authorized()` callback (`src/auth.config.ts`) — blocks unauthenticated on protected prefixes, redirects wrong-role to their home.
  - Page: `requireRole("ADMIN"|"TEACHER"|"STUDENT")` in `src/lib/session.ts` (redirects on mismatch).
  - Action: `assertAdmin()`, `requireRole()`, `requireUser()`, `assertCanManageCourse()` (admin any / teacher own via `teacherId`), `teacherOwnsBatch()`.
  - Student data isolation enforced by `WHERE batchId = activeBatch` in `src/lib/{student,assessments}.ts` (e.g. `getStudentAssessments`, `getResourceForStudent`) — student options never leak `isCorrect`.
- **Gaps / risks:**
  - No capability/permission matrix, no per-user overrides, no custom roles (FR-AC-1/3, FR-RBAC-3).
  - IT/Parent role rows in the PRD matrix are unenforceable (roles don't exist).
  - Ownership/batch composite checks are ad-hoc, not centralised (FR-RBAC-2).
  - No audit logging of privileged/destructive actions (FR-ADM-6, NFR-S6).
  - No account states (suspended/deleted), no lockout, no 2FA (FR-AUTH-7/8/9).
  - **No UI-only-permission holes found** in mutations — every Server Action re-checks server-side. (Nav visibility is cosmetic only.)

---

## 6. RISKS (things that make the PRD harder)

1. **No soft-delete / audit columns anywhere** (`created_by/updated_by/deleted_at`). FR-DATA-1/2, FR-ADM-2/3/6 require them on **every** entity → invasive retro-fit + a global query-filter for `deleted_at IS NULL`.
2. **3-value `Role` enum** vs 5 roles + custom roles + overrides → enum migration + RBAC engine rework; touches middleware, guards, every action.
3. **Attendance is per-day** (`@@unique([userId,date,batchId])`); PRD is **per-ClassSession** with scheduling + holiday calendar. This is a **CONFLICT** — needs a `ClassSession` model and a data reshape.
4. **Content model is flat** (Chapter→Resource, 2 types). PRD wants Module→Lesson→ContentBlock with **10 types** (LaTeX text, HTML-sandboxed, code, image, link, embedded test/QA/comments). **CONFLICT / major rebuild.**
5. **Notifications are fire-and-forget** (`void sendEmail()`), which on Vercel serverless **may never run** after the response returns; providers unconfigured; no delivery log/retry/quiet-hours. Reliability requires the QStash worker path for all channels.
6. **No multi-tenancy** (`institute_id`). Q1 default is multi-tenant-ready schema → if chosen later, adding `institute_id` to every table + every query is large.
7. **Zero automated tests** (NFR-M3 wants ≥70% unit + 12 E2E). No CI. No staging env (NFR-M1) — the live app points at the same Supabase project used for demos.
8. **`validatedById` has no FK** to User → referential-integrity gap (orphan possible if a teacher is deleted).
9. **`sendEmail`/`sendSms` log the full message body** to console when unconfigured — minor PII exposure in logs (NFR-S7/S8 sensitivity for minors' data).
10. **Turbopack production streaming caveat** — `loading.tsx` Suspense boundaries never revealed content in prod (fixed by removing them, commit `ae26c64`). **Do not reintroduce `loading.tsx`** until this is root-caused (or switch the build off Turbopack).
11. **Pre-release deps** — `next-auth@5.0.0-beta.*` and shadcn `radix-nova` preview. Acceptable but watch for breaking changes.
12. **Bulk import is synchronous** (per-row loop in one request). Fine ≤500 rows; PRD FR-BLK-4 wants async for 2,000 rows → needs a job/queue + progress + rollback (FR-BLK-5).

**Secrets:** clean — `.env` is git-ignored, `.env.example` holds placeholders only, no keys in source. **Indexes:** reasonable coverage (`@@index` on FKs + `userId,isRead` etc.); no obvious N+1 in list pages (they use `include`/`_count`).
