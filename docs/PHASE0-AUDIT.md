# Phase 0 Audit — Gap Report vs Coaching Institute LMS PRD (capability model, v1.0)

**Date:** 2026-07-23
**PRD:** `coaching-institute-lms-prd.md` + `lms-agent-implementation-prompt.md` (delegation / capability model)
**Scope:** Read-only audit. No feature code written. Supersedes `docs/AUDIT.md` / `docs/GAP-ANALYSIS.md`
(which were produced against the earlier, different PRD).

> ⚠️ This codebase was previously aligned to a **different PRD** (role-based, no capability
> delegation, student self-attendance, teacher-created batches, Q&A/assignments/reports built).
> Several things that were *correct* under the old PRD are now **Conflicting** under this one.
> They are flagged loudest in §0.6.

---

## 0.1 Stack inventory

| Layer | Technology | Evidence |
|---|---|---|
| Language | TypeScript (strict) | `tsconfig.json` |
| Framework | Next.js 16.2.10, App Router, Turbopack, Server Components + Server Actions | `package.json`, `next.config.ts` |
| UI | React 19.2.4, Tailwind v4, shadcn/ui (radix-nova preset, consolidated `radix-ui`), lucide, sonner, recharts, SWR | `package.json`, `src/components/ui/*` |
| Forms/validation | react-hook-form + Zod | `src/lib/validations/*` |
| ORM | Prisma 6.19.3 (pinned to v6) | `prisma/schema.prisma` |
| Database | PostgreSQL 17 on Supabase (project `emlqykknkzxvjclowtbj`, ap-south-1), RLS enabled on all tables, app connects as owner via pooler | `.env` DATABASE_URL/DIRECT_URL |
| Auth | NextAuth v5 beta.31, Credentials provider, **JWT sessions** (role embedded in token), bcryptjs 12 rounds, edge middleware split config | `src/auth.ts`, `src/auth.config.ts:12`, `src/proxy.ts` |
| File storage | S3/R2 presigned URLs (GET ≤3600s, presigned PUT); URL-or-key dual mode; **not configured in prod** (degrades gracefully) | `src/lib/storage.ts:41,61` |
| Email / SMS | Resend / Twilio wrappers reading DB-backed config (Control Center), fire-and-forget; QStash optional queue | `src/lib/notifications/*`, `src/lib/settings.ts:28` |
| Test framework | **None.** No unit/integration/e2e tests exist. | — |
| Build/deploy | `next build` only (no `migrate deploy` in build); GitHub `teamneonnx-rgb/coaching-lms` → Vercel auto-deploy; live at coaching-lms-eight.vercel.app | `package.json` scripts |
| Migrations | `prisma/migrations/0..8` applied to live DB and baselined in `_prisma_migrations` | `prisma/migrations/` |

## 0.2 Current data model (as it exists right now)

All models in `prisma/schema.prisma` (line refs):

| Model (line) | Columns / notes | PRD counterpart |
|---|---|---|
| `Role` enum (14) | SUPER_ADMIN, ADMIN, IT, TEACHER, STUDENT, PARENT | ✓ six roles exist |
| `User` (65) | name, email, password, role, status(ACTIVE/SUSPENDED), parentName/Phone/Email, instituteId, deletedAt/deletedById | User — no `phone`, `created_by`, `last_login_at`, no first-login-change flag |
| `Institute` (108) | multi-tenant scaffold; all rows on `inst-default` | Open item 7 |
| `ParentLink` (122) | parentId↔studentId | ParentStudentLink (no `relation` field; no Parent profile entity) |
| `Setting` (137) | per-institute key/value: integration creds + `policy.*` access toggles | (no PRD counterpart — institute-wide toggles, **not** per-admin capabilities) |
| `AuditEntry` (149) | actorId, actorRole, action, entity, entityId, detail | AuditLog — **no before/after values, no ip** |
| `Batch` (164) | name **unique** ✓, description, start/end, isActive, instituteId, soft-delete cols | Batch — **no teacherId** (teacher hangs off Course), no schedule_days/time/capacity, no archive status |
| `Enrollment` (186) | studentId, batchId, isActive | Enrolment — boolean instead of active/dropped/completed |
| `Course` (199) | title, description, **batchId (1 course = 1 batch)**, teacherId, soft-delete | Course — no subject/status; created by **Admin** |
| `Chapter` (221) → `Resource` (234) | Resource: type VIDEO/PDF, fileKey, order, **approvalStatus PENDING/APPROVED/REJECTED ✓, reviewedById, reviewedAt** | CourseDocument — no `rejection_reason`, no DOC type, nested under Chapter |
| `ResourceProgress` (258) | per-student completion | — |
| `Attendance` (270) | **one table for students AND teachers**: userId, date, status(PRESENT/ABSENT/LATE/ON_LEAVE), batchId?, validatedById, validatedAt | StudentAttendance + TeacherAttendance — approval field exists but **teacher is the approver**, no `amended`, teacher rows are **self-marked** |
| `Notification` (289) | title, message, type(3 values), isRead, userId | Notification — no `channel`, coarse types |
| `Assessment` (306) / `Question` (329) / `QuestionOption` (342) / `Submission` (354) / `Answer` (376) | OBJECTIVE (MCQ auto-graded, negative marking) or SUBJECTIVE (file upload, manual grade); isPublished; Submission: score/maxScore/status(SUBMITTED/GRADED)/gradedBy | Test/Question/TestAttempt/AnswerResponse — **type is per-assessment, not per-question**; no true_false/single_word/long_answer; no mixed split; no `partial_awaiting_evaluation`; no `overridden_by`; Answer has no marks_awarded/evaluator_remark |
| `Assignment` (396) / `AssignmentSubmission` (418) | full teacher assign→student submit→grade flow | **Not in PRD** (open item 1) |
| `Doubt` (444) / `DoubtReply` (463) / `Comment` (479) | course Q&A + resource comments | **Not in PRD** (open item 3) |
| `Feedback` (493) | **student→course only**: rating 1-5 + comment, unique per student+course | Feedback — no parent submitters, no teacher target, no period/monthly rule |
| **Missing entirely** | — | Teacher profile, Student profile, Payment, Enquiry, ClassSessionSummary, ErrorLog, AdminCapability, BulkImportJob, Result, TeacherAttendance (as its own approved-by-admin flow) |

## 0.3 Current routes and who can reach them

Middleware (`src/proxy.ts:13`, `src/auth.config.ts:34` `authorized` callback) gates by URL prefix →
role via `ROLE_PREFIX` (`src/lib/roles.ts:16`). Pages re-check via `requireRole`/`requireAdminArea`
(`src/lib/session.ts:8-25`); server actions re-check individually.

| Route | Reachable by |
|---|---|
| `/admin`, `/admin/users`, `/admin/batches(+/[id])`, `/admin/courses(+/[id])`, `/admin/reports`, `/admin/approvals`, `/admin/import`, `/admin/control-center`, `/admin/access-control`, `/admin/recycle-bin` | SUPER_ADMIN, ADMIN, IT (`ADMIN_AREA_ROLES`, roles.ts:26) — IT blocked only from delete + approve + policy-save |
| `/teacher`, `/teacher/batches`, `/teacher/content(+/[id])`, `/teacher/attendance`, `/teacher/assessments`, `/teacher/assignments(+/[id])`, `/teacher/doubts(+/[id])`, `/teacher/reports` | TEACHER |
| `/student`, `/student/courses(+/[id])`, `/student/resources/[id]`, `/student/assessments(+/[id])`, `/student/assignments(+/[id])`, `/student/doubts(+/[id])`, `/student/attendance`, `/student/report` | STUDENT |
| `/parent` | PARENT (read-only ward summary) |
| `/api/notifications`, `/api/admin/notifications` | session-scoped |
| `/api/auth/[...nextauth]`, `/login`, `/register` (STUDENT-only self-signup) | public |
| `/api/jobs/attendance-alert` | QStash-signed |

There is **no route for IT diagnostics, payments, enquiries, results entry, session summaries,
teacher profiles/drill-down, search (any role), capability matrix, or impersonation**.

## 0.4 Current auth & permission implementation

- **Role-based, hardcoded — not capability-based.** Checks are `requireRole(X)` /
  `requireAdminArea()` / `assertAdmin()` (`src/lib/actions/admin/guard.ts:6`) /
  `assertCanDelete()` (guard.ts:15, full admins only) / per-action ownership checks
  (e.g. `assertCanManageCourse`, `src/lib/actions/content.ts:17`).
- SUPER_ADMIN, ADMIN, IT are one bucket (`ADMIN_AREA_ROLES`) with two carve-outs: IT cannot
  delete (guard.ts:15) and cannot approve content / edit policies (`assertCanDelete` reused).
  **SUPER_ADMIN ≡ ADMIN everywhere — no singleton, no extra powers, no impersonation.**
- 3 institute-wide policy toggles exist (`src/lib/access-policy.ts`: contentApproval,
  publicDoubts, studentComments) — these are **global feature switches, not per-admin grants**.
- **JWT sessions embed the role** (`src/auth.config.ts:17-31`). A role/permission change does NOT
  take effect until re-login — directly relevant to FR-SA-04 (revocation on next request).
- Server-side enforcement is genuinely present on every existing action (good foundation for
  FR-PM-02), but the *catalogue* of checks is roles, not capabilities.

---

## 0.5 Requirement-by-requirement gap matrix

Legend: **C** = Compliant · **P** = Partial · **M** = Missing · **X** = Conflicting

### Super Admin & permission model

| ID | Status | Evidence | Work needed |
|---|---|---|---|
| FR-SA-00 | **X** | `src/lib/validations/auth.ts:12` roleEnum incl. SUPER_ADMIN used by admin user-create (`validations/admin.ts:12`) | Any full admin can mint more SUPER_ADMINs; no DB singleton constraint. Needs partial unique index + transfer flow |
| FR-SA-01 | P | `src/lib/roles.ts:26-41` | SA passes every *existing* check, but no capability layer exists to short-circuit |
| FR-SA-02 | P | `src/lib/actions/admin/users.ts` (create/suspend/delete any role) | Works, but exposed to ALL full admins, not reserved to SA |
| FR-SA-03 | **M** | — | No AdminCapability model; nothing per-admin |
| FR-SA-04 | **M** | `src/auth.config.ts:12` JWT role cached until re-login | Needs per-request DB capability lookup (or revocation check) |
| FR-SA-05 | P | `src/lib/audit.ts:6` logAudit exists | No grant/revoke events (no grants exist); no before/after |
| FR-SA-06 | **M** | — | No impersonation |
| FR-PM-01 | **M** | — | No capabilities → no 403-per-capability; nav is role-gated only |
| FR-PM-02 | P | every action file calls a server guard | Server-side enforcement pattern exists — but enforces *roles*, must be re-pointed at capabilities |

### Admin — 5.1

| ID | Status | Evidence | Work needed |
|---|---|---|---|
| FR-AD-01 | **X** | `src/lib/actions/attendance.ts:23,61` teachers **self-mark** | Admin-marks-teacher flow absent; PRD forbids self-marking |
| FR-AD-02 | M | — | No edit of past teacher attendance, no before/after audit |
| FR-AD-03 | M | — | No teacher-attendance view/filters/monthly summary |
| FR-AD-04 | **X** | attendance.ts:61-97 + teacher dashboard SelfAttendanceCard | Teacher self-marking must be removed |
| FR-AD-05 | M | `/admin/users` is a flat all-role table | No teacher list (photo/subject/batch count) |
| FR-AD-06 | M | — | No teacher profile page |
| FR-AD-07 | P | `src/app/admin/batches/[batchId]/page.tsx` (roster + enroll) | Has students; lacks schedule/capacity/filled-seats, not reached via teacher drill-down |
| FR-AD-08 | M | — | No admin student-profile page (attendance% + results + progress) |
| FR-AD-09 | M | — | No breadcrumbs, no drill-down spine |
| FR-AD-10 | P/X | schema:164 name unique ✓; `actions/admin/batches.ts:14-16` **TEACHER may create** | No teacher-on-batch, no schedule/capacity; teacher create path violates PRD |
| FR-AD-11 | P | course teacher editable (`actions/admin/courses.ts:46`) | Teacher lives on Course not Batch; no history-attribution handling |
| FR-AD-12 | C | batch detail enroll/unenroll + bulk (`actions/admin/enrollment.ts:16,46`) | — |
| FR-AD-13 | **X** | `actions/admin/batches.ts:77-83` hard-delete cascades attendance/results | Must block delete when records exist; add archive |
| FR-AD-14 | M | — | No search anywhere |
| FR-AD-15 | M | — | No grouped entity search |
| FR-AD-16 | M | — | No type-ahead search |
| FR-AD-17 | M | — | No Payment model/screens |
| FR-AD-18 | M | — | No payment recording/receipts |
| FR-AD-19 | M | — | No overdue flagging (job or read-time) |
| FR-AD-20 | M | — | No fee reminders |
| FR-AD-21 | M | — | No payments dashboard |
| FR-AD-22 | M | — | No admin feedback inbox (Feedback exists but only teacher-side aggregate) |
| FR-AD-23 | M | — | No feedback filters |
| FR-AD-24 | P | `src/lib/discussion.ts` getCourseFeedbackSummary + teacher content page avg chip | Aggregate exists per **course**, not on a teacher profile (which doesn't exist) |
| FR-AD-25 | M | — | No Enquiry model/tab |
| FR-AD-26 | M | — | No enquiry status flow |
| FR-AD-27 | M | — | No enquiry→student conversion |
| FR-AD-28 | M | — | No CSV export |
| FR-AD-29 | P | `actions/admin/enrollment.ts:100` CSV textarea import | CSV only; no PDF/DOC |
| FR-AD-30 | M | enrollment.ts:100-150 writes immediately | No parse→preview→commit pipeline |
| FR-AD-31 | P | CSV mapped ✓ | No PDF/DOC extraction |
| FR-AD-32 | M | — | No preview/inline correction |
| FR-AD-33 | **X** | import commits on submit with no preview stage | Violates "nothing written until confirm" |
| FR-AD-34 | P | per-row skip on duplicate/invalid, results listed in UI | No downloadable error file |
| FR-AD-35 | P | `components/admin/bulk-import-form.tsx:66` "Insert sample" | Inline sample, not a downloadable template |
| FR-AD-36 | C | `actions/content.ts:97-135` admin uploads auto-approve | — |
| FR-AD-37 | C | same — teacher uploads → PENDING (`policy.contentApproval` default on) | — |
| FR-AD-38 | P | `actions/admin/approvals.ts` approve/reject | **No rejection reason** (not in schema or UI) |
| FR-AD-39 | C | `src/lib/student.ts:61` & chapter includes filter `approvalStatus=APPROVED` in the query layer | — |
| FR-AD-40 | M | approvals act only on PENDING rows | No revoke-approval on an APPROVED doc |
| FR-AD-41 | M | — | No ClassSessionSummary |
| FR-AD-42 | M | — | — |
| FR-AD-43 | M | — | — |
| FR-AD-44 | **X** | `attendance.ts:184` **teacher** validates; roster marks auto-validate (`attendance.ts:99-171`) | Admin is not the approval authority for anything |
| FR-AD-45 | **X** | student **self-marks** (attendance.ts:23); pending rows shown to the student (`app/student/attendance/page.tsx:31-43` no validation filter) | Recording author is wrong (student, not teacher) and pending is visible |
| FR-AD-46 | M | — | No teacher-attendance approval routing |
| FR-AD-47 | **X** | `src/lib/reports.ts` + `parent.ts` count ALL rows (no validatedById filter) | Attendance % includes unapproved records |
| FR-AD-48 | M | — | No correct-before-approve / amend-after with audit |
| FR-AD-49 | P | teacher-side pending card (`src/lib/teacher.ts:61` getPendingValidations) | Queue exists but for the wrong role; no batch-day bulk approve; no teacher/student split |
| FR-AD-50 | **X** | absent alert fires at marking time (`src/lib/notifications/attendance-alert.ts`) | Must fire on approval, not submission |
| FR-AD-51 | M | — | No overdue-approval escalation |
| FR-AD-52 | M | — | No Result entity or admin results entry |
| FR-AD-53 | M | — | No marks-sheet upload |
| FR-AD-54 | M | — | No publish flow (assessment `isPublished` gates the *test*, not results) |
| FR-AD-55 | M | — | No published-result editing/re-notify |
| FR-AD-56 | P | `src/lib/grading.ts` + `actions/submissions.ts` objective auto-score, instant to student | MCQ only; no true/false / single-word |
| FR-AD-57 | P | SUBJECTIVE assessments route to teacher grading (`actions/assessments.ts` gradeSubmission) | Whole-test manual only — **a single test cannot mix** objective + long-answer |
| FR-AD-58 | M | Submission.status has no partial state (schema:51 SUBMITTED/GRADED) | No `partial_awaiting_evaluation` |
| FR-AD-59 | M | — | No admin override / `overridden_by` |

### Teacher — 5.2

| ID | Status | Evidence | Work needed |
|---|---|---|---|
| FR-TE-01 | **X** | `actions/admin/courses.ts:22` course create is `assertAdmin()` — teachers cannot | PRD makes Teacher the course author; also course↔batch is 1:1 (open item 8) |
| FR-TE-02 | C | teacher content manager + `createResource` PDF | — |
| FR-TE-03 | C | same, VIDEO (URL or S3 upload) | — |
| FR-TE-04 | C | `actions/content.ts:102-135` PENDING + hidden from students | — |
| FR-TE-05 | P | Pending/Rejected badges (`components/content/course-content-manager.tsx:110`) | No rejection **reason**; "re-upload" = delete + re-add |
| FR-TE-06 | P | `src/lib/teacher.ts:7` getTeacherBatches filters by their courses | Scoping ✓, but derived via Course-teacher, not Batch-teacher; teacher can also *create* batches (X, see FR-TE-15) |
| FR-TE-07 | P | roster w/ names in attendance page; `reports.ts` getTeacherClassReport | No student profile view (photo, enrolment no.) |
| FR-TE-08 | P | teacher sees only avg+count (`teacher/(main)/content/[courseId]/page.tsx`) | No feedback list for teacher; helper `getCourseFeedbackSummary` returns student names — must anonymize before any list UI |
| FR-TE-09 | P | `/teacher/reports` per-student averages | Close; formal "report card" per student absent |
| FR-TE-10 | M | — | No teacher search |
| FR-TE-11 | **X** | `attendance.ts:99` roster marks **auto-validate**; submission-to-admin absent | Must become submit→admin-approve, invisible until approved |
| FR-TE-12 | M | — | No approval-status view of submitted attendance |
| FR-TE-13 | P | subjective grading + per-submission feedback (`components/teacher/submissions-panel.tsx`) | Whole-attempt, not per-question; no per-question remarks |
| FR-TE-14 | P | submissions listed per assessment | No cross-test oldest-first evaluation queue |
| FR-TE-15 | **X** | `actions/admin/batches.ts:16` + `/teacher/batches` renders BatchFormDialog; `attendance.ts:61` self-marking | Both forbidden paths exist and must be removed |

### Student — 5.3

| ID | Status | Evidence | Work needed |
|---|---|---|---|
| FR-ST-01 | C | `/student/courses`, batch-scoped (`src/lib/student.ts:17`) | — |
| FR-ST-02 | C | `student.ts:57-73` approved-only + signed URLs | — |
| FR-ST-03 | P/X | `/student/attendance` day-wise ✓ | Includes **pending** records; % (in `/student/report`) counts unapproved |
| FR-ST-04 | P | assessment results view | No admin-published Result entity |
| FR-ST-04a | C | `actions/submissions.ts` submitObjective auto-grades, result shown instantly | — |
| FR-ST-04b | M | — | No mixed tests → no partial state/label |
| FR-ST-04c | M | — | No admin results publish flow |
| FR-ST-05 | P | notifications: material approved, graded, absent, welcome | Missing: results-published, announcements; absent fires pre-approval (X) |
| FR-ST-06 | M | — | No student search |
| FR-ST-07 | P | course feedback ✓ (`components/discussion/course-feedback.tsx`) | No **teacher** feedback target |
| FR-ST-08 | C | every student query filters own id + active batch (`student.ts` throughout) | — |

### Parent — 5.4

| ID | Status | Evidence | Work needed |
|---|---|---|---|
| FR-PA-01 | M | Feedback model is student-only (schema:493) | Monthly parent feedback + once-per-month rule |
| FR-PA-02 | P | `/parent` shows per-child marks (`src/lib/parent.ts`) | No exam-wise/grade structure (depends on Results module) |
| FR-PA-03 | M | — | No fee data at all |
| FR-PA-04 | M | — | — |
| FR-PA-05 | M | — | No session summaries |
| FR-PA-06 | P | `/parent` lists all linked children sequentially | No ward **switcher** scoping all screens |
| FR-PA-07 | M | — | No parent search |

### IT — 5.5

| ID | Status | Evidence | Work needed |
|---|---|---|---|
| FR-IT-01..05 | M | — | No ErrorLog, no diagnostics dashboard, no resolution flow |
| FR-IT-06 | **X** | `guard.ts:6` assertAdmin admits IT → IT can create/edit users, batches, courses, settings | PRD makes IT read-only on business data |
| FR-IT-07 | M | — | No payload logging at all (so nothing redacted — must be built into the handler) |
| FR-IT-08 | M | — | No severity alerts |

### Cross-cutting — 6.x

| ID | Status | Evidence | Work needed |
|---|---|---|---|
| FR-SR-01 | M | — | No search tab in any shell |
| FR-SR-02 | M | — | — |
| FR-SR-03 | M | — | — |
| FR-NT-01 | P | in-app ✓ (awaited rows) + email ✓ (Resend) + SMS (extra); WhatsApp = Control-Center config only, no send path (`settings.ts:40`) | WhatsApp channel send; `channel` column |
| FR-NT-02 | P | triggers exist: approved material, doc approved/rejected, graded, absent(at-mark), account created (`notifications/events.ts`) | Missing: result published, fee due/overdue, session summary; absent trigger mistimed |
| FR-NT-03 | C | in-app rows created before best-effort email (`events.ts`) | — |
| FR-NT-04 | M | fire-and-forget `.catch(() => {})` | No retry, no IT surfacing |
| FR-AU-01 | P | email+password (`actions/auth.ts:16`) | No phone login |
| FR-AU-02 | M | admin-created users get a working password immediately | Forced first-login change |
| FR-AU-03 | M | — | No self-service reset / OTP; no admin reset UI |
| FR-AU-04 | P | NextAuth JWT default 30-day maxAge, not configurable idle timeout | Configurable idle expiry |
| FR-AU-05 | M | — | No lockout/unlock |
| FR-AT-01 | P | `src/lib/audit.ts` on user/batch/course create+delete, approvals, settings, policy | Coverage gaps (updates, grades, enrolments); **no before/after values, no ip** |
| FR-AT-02 | P | no app update/delete path on AuditEntry ✓ | Not DB-immutable; visible to all admin-area roles, not SA-only |

### Non-functional — 8

| ID | Status | Evidence | Work needed |
|---|---|---|---|
| NFR-01 | P | all server actions guard ✓ (role-based) | Re-point at capability layer |
| NFR-02 | C | `storage.ts:41` signed GET ≤3600s, `<video>` streaming, controlsList nodownload | — |
| NFR-03 | M | presign restricts contentType only | No virus scan, no server-side size/type validation |
| NFR-04 | **X** | `enrollment.ts:100` synchronous per-row bcrypt loop in one action | Would time out at 2,000 rows; needs async job |
| NFR-05 | M | admin users/batches/courses `findMany` unbounded | Pagination everywhere |
| NFR-06 | C | Prisma stores UTC; `@db.Date` UTC-midnight (`src/lib/date.ts`); display local | — |
| NFR-07 | C | responsive shells (Sheet drawers, responsive grids) across roles | — |
| NFR-08 | M | — | Centralised exception handler → ErrorLog (prerequisite for the whole IT module) |
| NFR-09 | P | Supabase managed daily backups (platform-level) | Restore path never tested; outside repo |

### Tally (132 IDs)

| Status | Count |
|---|---|
| Compliant | 14 |
| Partial | 38 |
| Missing | 66 |
| **Conflicting** | **14** (FR-SA-00, FR-AD-01, 04, 10*, 13, 33, 44, 45, 47, 50, FR-TE-01, 11, 15, FR-IT-06, FR-ST-03*, NFR-04) |

\* dual-status rows counted once under their dominant flag.

---

## 0.6 Conflict list — code that actively contradicts this PRD

1. **Teachers create batches.** `actions/admin/batches.ts:16` allows TEACHER; `/teacher/batches`
   renders the create dialog. PRD §4.2/FR-TE-15: Admin-only.
2. **Teachers mark their own attendance.** `actions/attendance.ts:61-97` + teacher dashboard
   card. PRD FR-AD-04: this authority is Admin's.
3. **Admin is not the attendance approver — the teacher is.** `validateAttendance`
   (attendance.ts:184) is `requireRole("TEACHER")`; roster marks **auto-approve**
   (attendance.ts:99-171). PRD FR-AD-44/45/46 route all approval through Admin.
4. **Students self-mark attendance.** attendance.ts:23. PRD: the batch teacher records it.
5. **Pending attendance is visible & counted.** Student attendance page and all attendance-%
   computations (`reports.ts`, `parent.ts`) ignore `validatedById`. PRD FR-AD-45/47 +
   acceptance tests 8-9.
6. **Absent notifications fire at marking, not approval.** `attendance-alert.ts` dispatches
   inside the mark action. PRD FR-AD-50 / acceptance test 10.
7. **Batch hard-delete cascades attendance/results.** batches.ts:77-83. PRD FR-AD-13:
   archive-only once records exist.
8. **Any full admin can create a SUPER_ADMIN.** roleEnum in the admin user form includes it
   (validations/auth.ts:12). PRD FR-SA-00: singleton, transfer-only, DB-enforced.
9. **IT holds broad business write access.** `assertAdmin` admits IT to user/batch/course/
   settings writes (guard.ts:6). PRD FR-IT-06: read-only diagnostics.
10. **Admin power is inherent, not delegated.** ADMIN passes every admin check by role alone.
    PRD principle 1: every Admin capability is a switch.
11. **Course authorship is inverted.** Admin-only create (courses.ts:22); PRD FR-TE-01 makes
    Teacher the author. (Interacts with open items 2 & 8.)
12. **Bulk import commits without preview.** enrollment.ts:100+. PRD FR-AD-30/33.
13. **Batch has no owning teacher.** Teacher is a Course field; PRD's spine
    (Teacher→Batch→Student) and FR-AD-10/11 hang the teacher on the Batch.
14. **Test model can't mix question types.** Per-assessment OBJECTIVE|SUBJECTIVE vs PRD's
    per-question types with split scoring (FR-AD-56..58).

## 0.7 Risk list — what breaks when we align

| Risk | Impact |
|---|---|
| **Capability retrofit locks out existing admins** | The seeded ADMIN (and any IT) loses every screen until SA grants capabilities. Migration must seed a sensible default grant set for existing admins or the institute goes dark. |
| **JWT role caching vs FR-SA-04** | Capabilities must be DB-resolved per request (not tokenized) or revocation is broken. Adds one query per request. |
| **Attendance rework is a data migration** | Existing `Attendance` rows (self-marked, teacher-validated, mixed student/teacher in one table) must map onto StudentAttendance/TeacherAttendance with `approval_status`; historical rows should be back-filled as `approved` or attendance % collapses for current users. |
| **Hiding pending attendance changes live numbers** | Once % excludes unapproved rows, students/parents will see different figures than today. |
| **Removing teacher batch-creation/self-attendance** | Live teacher workflows disappear; needs comms, not just code. |
| **Batch↔Teacher restructure** | Moving teacher from Course to Batch (plus schedule/capacity) touches every teacher-scoped query (`teacher.ts`, `assignments.ts`, `discussion.ts`, `reports.ts`, content authz). High blast radius; must be staged. |
| **Question-type expansion on live data** | Existing OBJECTIVE/SUBJECTIVE assessments + graded submissions must migrate into the per-question model without altering historical scores. |
| **Existing beyond-PRD modules** (Assignments, Doubts/Q&A, Comments, course Feedback, reports pages, access-policy toggles, Razorpay/WhatsApp config UI) | PRD says "no invented scope" — but these are **live features**. Removing them is user-visible regression; keeping them is unconfirmed scope. Decision needed (open items 1, 3, 4). |
| **No test framework exists** | The 29 acceptance tests require introducing one (Vitest + Playwright suggested) — a new dependency, which rule 3 says to avoid "unless required". It is required. |
| **Auth tightening (forced password change, lockout, idle expiry)** | Will interrupt existing sessions/users on rollout. |

---

## Assumptions made in this audit

1. Existing `Attendance`/`Resource`/`Assessment`/`Submission`/`Answer` are treated as the
   in-place ancestors of PRD `StudentAttendance`+`TeacherAttendance` / `CourseDocument` /
   `Test` / `TestAttempt` / `AnswerResponse` (extend, don't recreate — per rule 2).
2. "Documents" in the PRD maps to our `Resource` under Course→Chapter; the Chapter layer is
   treated as an acceptable superset, not a conflict.
3. The live single institute (`inst-default`) means capability and policy scoping can stay
   institute-scoped pending open item 7.
4. Supabase's managed daily backup is provisionally accepted for NFR-09; restore is untested.
5. Current SMS (Twilio) channel is retained as an extra channel even though the PRD lists only
   in-app/email/WhatsApp.

## Open questions — blocking, per the prompt ("ask, do not assume")

1. **Assignments** — already built and live. Keep for V1, or remove/hide?
2. **Test authoring** — Teacher or Admin? (Currently teachers author assessments; admin authors courses.)
3. **Q&A / comments / blog** — Doubts + comments are already built and live. Keep, or remove/hide? (Blog was never built.)
4. **Payment gateway** — offline recording only, or Razorpay online collection? (Razorpay config UI already exists in Control Center.)
5. **WhatsApp + SMTP providers** — Meta WhatsApp Cloud API + Resend are what the Control Center is wired for. Confirm.
6. **Enquiry source** — public form or manual admin entry?
7. **Multi-institute** — schema already carries `instituteId` (single live institute). One deployment/institute or many?
8. **Course-to-batch mapping** — currently strictly 1 course : 1 batch. PRD implies course reusable across batches. Which?

---

**STOP.** Per the implementation prompt, Phase 1 (capability system, SA singleton, auth rules,
audit) begins only after this report is approved and the open questions above are answered.
