# GAP-ANALYSIS.md — PRD v1.0 vs. current codebase

_Generated 21 Jul 2026. Status ∈ {DONE, PARTIAL, MISSING, CONFLICT}. Effort: S(<1d) M(1-3d) L(3-10d) XL(>10d). See `docs/AUDIT.md` for the "today" details._

**Headline:** the app implements a working **3-role** slice (admin/teacher/student) of a **5-role** PRD. Roughly **~18% DONE, ~12% PARTIAL, ~68% MISSING, 4 CONFLICTs**. The big untouched pillars are Payments, WhatsApp/notification-engine, Blog, Q&A/Comments/Feedback, Assignments, Reports, Audit/soft-delete, Approval, Control Center/Access Control, and the Parent + IT + Super-Admin roles.

## Per-FR status

| FR-ID | Requirement (short) | Status | Where today | Work needed | Effort | Blocks |
|---|---|---|---|---|---|---|
| FR-ROLE-1 | Super Admin full control | PARTIAL | `ADMIN` role ≈ super admin | add `SUPER_ADMIN`; hard-delete/restore/impersonate/config gates | L | roles |
| FR-ROLE-2 | IT role (see/assign/update) | MISSING | — | add `IT` role + capability limits | L | roles |
| FR-ROLE-3 | Teacher create/manage own | DONE | teacher area, `assertCanManageCourse` | approval + co-teacher gaps | — | — |
| FR-ROLE-4 | Student consume | DONE | student area | assignments/QA/feedback/blog missing | — | — |
| FR-ROLE-5 | Parent linked, read-only | MISSING | flat parent fields only | Parent role + `ParentLink` + portal | L | roles |
| FR-RBAC-1 | Server-side checks everywhere | DONE | all actions guard server-side | keep for new endpoints | — | — |
| FR-RBAC-2 | role ∩ ownership ∩ batch | PARTIAL | ad-hoc per action | centralise a `can()` helper | M | — |
| FR-RBAC-3 | Custom roles by clone+toggle | MISSING | — | capability table + Access Control UI | XL | roles |
| FR-DATA-1 | Audit cols on every entity | MISSING | none | add created/updated/deleted_by+at | L | — |
| FR-DATA-2 | Soft delete default | CONFLICT | hard `db.delete` used | add `deletedAt`, global filter, restore | L | FR-DATA-1 |
| FR-DATA-3 | Multi-batch enrolment | DONE | `Enrollment @@unique` | — | — | — |
| FR-DATA-4 | 1 primary course + co-teachers | PARTIAL | course→1 batch, 1 teacher | co-teacher join table | M | — |
| FR-AUTH-1 | Student signup + OTP verify | PARTIAL | signup works, **no OTP/mobile** | add mobile + email/OTP verify | M | — |
| FR-AUTH-2 | Only student self-signup | DONE | register forces STUDENT | — | — | — |
| FR-AUTH-3 | Email+pw / mobile+OTP login | PARTIAL | email+pw only | mobile OTP login | M | OTP infra |
| FR-AUTH-4 | Password reset (all paths) | MISSING | none | forgot-pw email link + admin reset + temp pw | M | email |
| FR-AUTH-5 | Password policy + bcrypt | PARTIAL | bcrypt 12 ✓, weak policy | enforce complexity + common-pw block | S | — |
| FR-AUTH-6 | JWT 7d + revoke on change | PARTIAL | JWT ✓, no forced revoke | session versioning | M | — |
| FR-AUTH-7 | Lockout after 8 fails | MISSING | — | attempt counter + lock | S | — |
| FR-AUTH-8 | 2FA for SA/IT | MISSING | — | TOTP | M | roles |
| FR-AUTH-9 | Account states | MISSING | — | `status` enum + gating | M | — |
| FR-AUTH-10 | Impersonate (SA) | MISSING | — | impersonation + banner + audit | M | roles, audit |
| FR-CRS-1 | Course fields | PARTIAL | title/desc/batch/teacher | subject/thumbnail/grade/lang/tags/visibility | M | — |
| FR-CRS-2 | Module→Lesson→Block + DnD | CONFLICT | flat Chapter→Resource | new hierarchy + drag-drop | XL | schema |
| FR-CRS-3 | Autosave draft 20s | MISSING | — | autosave in builder | M | — |
| FR-CRS-4 | Course states draft→published | PARTIAL | assessments have isPublished; courses none | add course lifecycle | M | approval |
| FR-CRS-5 | Clone course | MISSING | — | deep-copy action | M | — |
| FR-CRS-6 | Version history + rollback | MISSING | — | `CourseVersion` | L | — |
| FR-CRS-7 | Drip / prerequisite lock | MISSING | — | lesson gating rules | L | FR-CRS-2 |
| FR-CNT-1 | Video (upload/embed, ABR, progress) | PARTIAL | VIDEO type + URL/S3 + %-none | transcoding, captions, resume, %-watched | XL | storage |
| FR-CNT-2 | PDF viewer + progress | PARTIAL | PDF type via iframe | pages-read tracking, view-only toggle | M | — |
| FR-CNT-3 | Image block | MISSING | — | image type + lightbox + compression | M | FR-CRS-2 |
| FR-CNT-4 | Text + LaTeX | MISSING | — | rich text + MathJax | M | FR-CRS-2 |
| FR-CNT-5 | Website/link block | MISSING | — | link + preview card | S | FR-CRS-2 |
| FR-CNT-6 | HTML (sandboxed, gated) | MISSING | — | sandbox iframe + capability gate | M | FR-CRS-2, roles |
| FR-CNT-7 | Code block | MISSING | — | syntax highlight block | S | FR-CRS-2 |
| FR-CNT-8 | Inline test block | MISSING | — | embed assessment in lesson | M | assessments |
| FR-CNT-9 | Per-lesson Q&A | MISSING | — | Q&A module | L | FR-CRS-2 |
| FR-CNT-10 | Per-lesson comments | MISSING | — | comments module | L | FR-CRS-2 |
| FR-CNT-11 | Virus scan uploads | MISSING | — | scan on upload | M | storage |
| FR-CNT-12 | Private storage + signed URLs | PARTIAL | signed-URL code, **unconfigured** | configure S3/R2 keys | S | — |
| FR-CNT-13 | Storage quota | MISSING | — | per-institute quota meter | M | tenancy |
| FR-RES-1 | Course Resources library | PARTIAL | resources are lesson-level only | separate course-level library | M | — |
| FR-RES-2 | Resource fields + visibility | PARTIAL | title/type/fileKey | category + visibility scoping | M | — |
| FR-RES-3 | Bulk resource upload (50, ZIP) | MISSING | — | multi-file uploader + mapping | L | storage |
| FR-RES-4 | Resource search/filter | MISSING | — | search index + filters | M | — |
| FR-RES-5 | Resource versioning | MISSING | — | keep prior versions | M | — |
| FR-APPR-1..5 | Approval workflow | MISSING | teacher publishes directly | pending_approval + queue + actions + toggle | L | roles |
| FR-BAT-1 | Batch fields (code/capacity/mode…) | PARTIAL | name/dates/isActive | code/capacity/mode/room/status/co-teachers | M | — |
| FR-BAT-2 | Weekly schedule → ClassSessions | MISSING | — | schedule + session generation | L | schema |
| FR-BAT-3 | Holiday calendar | MISSING | — | holiday model + skip logic | M | FR-BAT-2 |
| FR-BAT-4 | Batch assignment (indiv/multi/CSV) | DONE | enrollment mgr + bulk import | teacher assign/unassign UI | — | — |
| FR-BAT-5 | Transfer student, keep history | PARTIAL | can enrol elsewhere; soft-unenrol keeps rows | explicit transfer action | S | — |
| FR-BAT-6 | Capacity enforcement | MISSING | — | capacity check + override | S | FR-BAT-1 |
| FR-BAT-7 | Batch roster + export | PARTIAL | roster on attendance page | full roster view + CSV export | M | reports |
| FR-BAT-8 | Teacher batch dashboard | PARTIAL | teacher dashboard basic | next-session/alerts/grading count | M | FR-BAT-2 |
| FR-BAT-9 | Clone batch | MISSING | — | clone action | S | — |
| FR-BAT-10 | Batch announcements | MISSING | — | announcement model + fan-out | M | notif engine |
| FR-ATT-1 | Per-session statuses (5) | CONFLICT | per-**day**, 4 statuses | ClassSession + add `excused/not_marked` | L | FR-BAT-2 |
| FR-ATT-2 | Teacher marks roster fast | DONE | roster form | one-request submit ✓ (NFR-P5) | — | — |
| FR-ATT-3 | Teacher self-attendance | PARTIAL | self-mark → admin notify | check-in/out timestamps + hours report | S | — |
| FR-ATT-4 | Student self-attendance + validate | DONE | pending→validate flow | per-session code (optional) | — | — |
| FR-ATT-5 | Edit window + audit amendments | MISSING | edits always allowed | N-day window + audit | S | audit |
| FR-ATT-6 | Parent absence notify (WA+email) | PARTIAL | SMS+email code, **unconfigured**, on validate | WhatsApp channel + daily-digest option | M | notif engine |
| FR-ATT-7 | Low-attendance alert (<75%) | MISSING | — | rolling calc + alert | M | notif engine |
| FR-ATT-8 | Attendance views + export | PARTIAL | recent list only | session/student/batch/calendar + export | M | reports |
| FR-ATT-9 | Bulk attendance import | MISSING | — | CSV import | S | — |
| FR-TST-1 | 8 question types | PARTIAL | single-correct MCQ + subjective | multi/TF/numeric/short/long/match/fill | L | — |
| FR-TST-2 | Question fields (LaTeX/img/neg/topic) | PARTIAL | text/options/points/neg | LaTeX, image, explanation, difficulty, topic | M | — |
| FR-TST-3 | Institute question bank | MISSING | — | bank + pick/random build | L | — |
| FR-TST-4 | Test settings (window/attempts/shuffle) | PARTIAL | title/neg/timeLimit | availability window, attempts, shuffle, passing | M | — |
| FR-TST-5 | Attempt UX (timer/palette/15s autosave) | MISSING | single-shot submit | timer, palette, server autosave, auto-submit | L | — |
| FR-TST-6 | Auto-grade + manual queue | DONE | grading.ts + subjective grade | extend to new types | — | — |
| FR-TST-7 | Result view | PARTIAL | score + correct/wrong/skip | rank, explanations, time taken | S | — |
| FR-TST-8 | Teacher test analytics | MISSING | — | histogram, per-Q accuracy | M | — |
| FR-TST-9 | Integrity (fullscreen/tab-switch) | MISSING | — | proctor-lite | M | FR-TST-5 |
| FR-TST-10 | Offline marks entry grid + CSV | MISSING | — | marks-only assessment + grid/CSV | M | — |
| FR-ASG-1..6 | Assignments module | MISSING | — | Assignment+Submission+grading+reminders | L | storage, notif |
| FR-QA-1..6 | Q&A module | MISSING | — | question/answer/accept/upvote/notify | L | notif |
| FR-CMT-1..5 | Comments module | MISSING | — | threaded + moderation + profanity | L | — |
| FR-FBK-1..6 | Feedback (course+teacher) | MISSING | — | anon feedback + aggregate dashboard | L | — |
| FR-STU-1 | Student dashboard | PARTIAL | donut/courses/calendar | today's classes/pending/continue | M | sessions |
| FR-STU-2 | Course player + auto-complete | PARTIAL | course→chapters→resource viewer | syllabus tree + auto-complete rules | M | FR-CRS-2 |
| FR-STU-3 | See material | DONE | batch-isolated content | — | — | — |
| FR-STU-4 | Resources browse/search | PARTIAL | via course | dedicated searchable library | M | FR-RES-4 |
| FR-STU-5 | Blog read | MISSING | — | blog module | L | — |
| FR-STU-6 | Tests list + results | DONE | assessments list + results | — | — | — |
| FR-STU-7 | Assignments | MISSING | — | assignments module | L | FR-ASG |
| FR-STU-8 | Feedback submit | MISSING | — | feedback | L | FR-FBK |
| FR-STU-9 | Q&A | MISSING | — | Q&A | L | FR-QA |
| FR-STU-10 | Notification centre + prefs | PARTIAL | bell + mark-read | grouped types + per-channel prefs | M | notif engine |
| FR-STU-11 | Basic signup | DONE | register | — | — | — |
| FR-STU-12 | Student profile | PARTIAL | parent fields on user | photo/DOB/school/docs/change-pw | M | — |
| FR-STU-13 | My Progress page | PARTIAL | donut on dashboard | attendance%/score-trend/remarks page | M | reports |
| FR-STU-14 | Mobile-responsive 360px | PARTIAL | mostly responsive | audit 360px + assessment builder mobile | S | — |
| FR-BLG-1..6 | Blog module | MISSING | — | authoring + public feed + SEO | L | approval |
| FR-CC-1..2 | Control Center cockpit | MISSING | — | 8-section admin cockpit | XL | most modules |
| FR-AC-1..5 | Access Control screen | MISSING | — | permission-matrix editor + sessions | L | roles |
| FR-ADM-1 | SA edit any field | PARTIAL | admin CRUD | edit locked fields (marks/attendance) | M | roles |
| FR-ADM-2 | Delete w/ cascade warning | PARTIAL | confirm dialogs exist | named cascade impact + soft delete | M | FR-DATA-2 |
| FR-ADM-3 | Recycle bin + Restore All | MISSING | — | recycle bin + restore + reactivate | L | FR-DATA-2 |
| FR-ADM-4 | Reset actions (attempt/progress/pw…) | MISSING | — | per-entity reset w/ typed confirm | M | — |
| FR-ADM-5 | Full-institute reset + backup | MISSING | — | guarded reset + export | M | tenancy |
| FR-ADM-6 | Audit log (immutable) | MISSING | — | audit writer + viewer | L | FR-DATA-1 |
| FR-BLK-1 | Bulk import students (map/preview) | PARTIAL | CSV import + skip report | column-mapping + validation preview UI | S | — |
| FR-BLK-2 | Import options (create/enrol/credentials) | PARTIAL | create + optional enrol | send-credentials option | S | email/WA |
| FR-BLK-3 | Duplicate detection choice | PARTIAL | skips dupes | skip/update/create choice | S | — |
| FR-BLK-4 | Async 2,000-row import | MISSING | sync loop ≤500 | queue + progress | M | queue |
| FR-BLK-5 | Reversible import (24h) | MISSING | — | import batch id + rollback | M | — |
| FR-BLK-6 | Bulk import teachers/parents/Q/marks | MISSING | students only | more importers | M | — |
| FR-BLK-7 | Bulk resource upload | MISSING | — | see FR-RES-3 | L | storage |
| FR-BLK-8 | Bulk export any list | MISSING | — | CSV export util | S | — |
| FR-BLK-9 | Bulk user actions | MISSING | — | multi-select actions | M | — |
| FR-PRF-1 | Teacher profile | MISSING | — | profile model + page | M | — |
| FR-PRF-2 | Student profile | PARTIAL | basic fields | full profile + docs + staff notes | M | — |
| FR-PRF-3/4 | Profile edit perms + history | MISSING | — | field-level perms + change log | M | audit |
| FR-PAR-1..6 | Parent accounts/portal/notify/digest | MISSING | flat parent fields | Parent role + link + portal + prefs | L | roles |
| FR-NOT-1 | Event-driven engine + fan-out | PARTIAL | ad-hoc notify helpers | `NotificationEvent`/`Delivery` engine | L | — |
| FR-NOT-2 | Channels in-app/email/WA | PARTIAL | in-app ✓, email code, no WA | add WhatsApp + reliable email | L | — |
| FR-NOT-3 | Configurable notification matrix | MISSING | hard-coded events | matrix config per event×role×channel | L | FR-NOT-1 |
| FR-NOT-4 | Retry + failed-deliveries view | MISSING | fire-and-forget | queue + retry + admin view | M | queue |
| FR-NOT-5 | Quiet hours | MISSING | — | schedule window | S | queue |
| FR-NOT-6 | Manual send (segment/preview) | MISSING | — | composer | M | FR-NOT-1 |
| FR-NOT-7 | Delivery log | MISSING | — | per-delivery rows | M | FR-NOT-1 |
| FR-SMTP-1..6 | SMTP config + templates + queue | PARTIAL | Resend via fetch, **unconfigured** | config UI, templates, test, fallback, bounce | L | — |
| FR-WA-1..9 | WhatsApp Cloud API integration | MISSING | — | full WA BSP integration | XL | FR-NOT-1 |
| FR-PAY-1..11 | Payments (Razorpay, fees, invoices…) | MISSING | — | gateway + fee plans + invoices + collections | XL | — |
| FR-RPT-1 | Progress report (student) | PARTIAL | donut only | full report + PDF + schedule | L | — |
| FR-RPT-2 | Class report | MISSING | — | per-session report | M | FR-BAT-2 |
| FR-RPT-3 | Batch report | MISSING | — | batch analytics | L | — |
| FR-RPT-4 | Teacher report | MISSING | — | teaching hours/compliance | M | FR-ATT-3 |
| FR-RPT-5 | Institute report | PARTIAL | admin dashboard counts | revenue/churn/utilisation | M | payments |
| FR-RPT-6 | Report filters + export | MISSING | — | filter + PDF/Excel/CSV | M | — |
| FR-RPT-7 | Scheduled report delivery | MISSING | — | cron + email | M | queue |
| FR-RPT-8 | At-risk detection | MISSING | — | flag rules + dashboard | M | reports |
| NFR-P1..5 | Performance targets | PARTIAL | dynamic SSR, single-req attendance | load test, ABR video, 3G budget | M | — |
| NFR-A1..4 | Availability/backups/queue/RPO | PARTIAL | Supabase backups; no durable queue | QStash config + dead-letter | M | queue |
| NFR-S1..8 | Security (HSTS/CSP/scan/encrypt PII) | PARTIAL | HTTPS, bcrypt, RLS on | CSP, virus scan, PII-at-rest, no-tracker | L | — |
| NFR-C1..4 | DPDP/WA-policy/GST/export | MISSING | — | consent, opt-in, GST fields, data export | L | — |
| NFR-U1..6 | Responsive/WCAG/i18n/errors/undo | PARTIAL | responsive-ish, clear errors | WCAG AA, i18n, list search/filter, undo | L | — |
| NFR-M1..5 | Envs/logging/tests/migrations/seed | PARTIAL | reversible migrations, seed ✓ | staging env, tests, error tracking | L | — |

---

## A. CONFLICTS (you decide, not me)

**C1 — Attendance is per-day, PRD is per-ClassSession (FR-ATT-1, FR-BAT-2).**
- Today: `Attendance @@unique([userId,date,batchId])`; no sessions/scheduling.
- PRD: attendance hangs off `ClassSession` (date+time+topic+teacher); statuses include `excused`,`not_marked`.
- Options: **(a)** add `ClassSession`, make `Attendance.sessionId` nullable, backfill one synthetic session per (batch,date), then migrate — _recommended_; **(b)** keep per-day and treat "session" as a view (cheaper, diverges from PRD reporting); **(c)** greenfield attendance v2 alongside. → **Recommend (a).**

**C2 — Content is flat Chapter→Resource(2 types), PRD is Module→Lesson→ContentBlock(10 types) (FR-CRS-2, FR-CNT-*).**
- Options: **(a)** introduce Module/Lesson/ContentBlock and map existing Chapter→Module, Resource→ContentBlock (VIDEO/PDF) — _recommended, preserves data_; **(b)** extend `Resource.type` enum in place (less rework, no Lesson layer, misses drip/ordering depth). → **Recommend (a), phased.**

**C3 — Hard delete vs soft delete (FR-DATA-2).**
- Today: actions call `db.delete()` (cascades). PRD: soft delete + recycle bin everywhere.
- Options: **(a)** add `deletedAt/deletedBy` + a Prisma extension that rewrites reads to `deletedAt:null` and deletes to updates — _recommended_; **(b)** per-model manual handling (error-prone). → **Recommend (a).**

**C4 — 3 roles vs 5 roles + custom (FR-ROLE-2/5, FR-RBAC-3).**
- Options: **(a)** extend `Role` enum with `SUPER_ADMIN,IT,PARENT`, map `ADMIN`→ treat as `SUPER_ADMIN`, add a capability table for IT limits + Parent portal — _recommended_; **(b)** replace enum with a `roleId` FK to a roles table now (more upfront, enables custom roles sooner). → **Recommend (a) now, (b) when FR-RBAC-3 is scheduled.**

## B. SCHEMA CHANGES REQUIRED (all additive-first, reversible)

- **Global (every model):** `createdBy`, `updatedBy`, `deletedAt?`, `deletedBy?` (FR-DATA-1/2). Risk: none if nullable; reads need a soft-delete filter.
- **Role/users:** `Role += SUPER_ADMIN, IT, PARENT`; `User.status` enum; `User.mobile`; `ParentLink(parentId,studentId)`; optional `Capability`/`UserCapability` tables (FR-AC-3).
- **Scheduling:** `ClassSession(batchId,date,time,topic,teacherId)`; `Attendance.sessionId?`; `AttendanceStatus += EXCUSED, NOT_MARKED`; `Holiday(date)`.
- **Content:** `Module`, `Lesson`, `ContentBlock(type enum ×10, payload)`; migrate Chapter→Module/Lesson, Resource→ContentBlock. `Course` fields (subject, grade, visibility, status). `CourseVersion`.
- **Assessments:** `Question.type` enum, `explanation`, `difficulty`, `topic`, `imageKey`; `QuestionBank`; `Attempt` autosave fields; test settings (window/attempts/shuffle/passing).
- **New modules:** `Assignment`+`AssignmentSubmission`; `QAThread`+`QAAnswer`; `Comment`; `Feedback`; `Blog`; `Announcement`; `FeePlan`+`Invoice`+`Transaction`; `NotificationEvent`+`NotificationDelivery`; `AuditEntry`; `TeacherProfile`/`StudentProfile` (or extend User).
- **At-risk:** none new (derived).
- **Data at risk:** only C1–C3 migrations touch existing rows; all can be additive-then-backfill-then-switch (PROMPT 6 procedure).

## C. CRITICAL PATH (ordered, mapped to PRD §16 phases)

1. **Foundation (P1):** 5-role enum + `status` + `ParentLink` (C4) → audit cols + soft-delete extension (C3, FR-DATA-1/2) → password reset + policy + account states → **configure Resend/S3/QStash** (unblocks email/media/queue for everything downstream). _These gate most later work._
2. **Teaching core (P2):** content hierarchy (C2) + remaining content types → course lifecycle + approval workflow → batch fields/capacity/co-teachers → resource library + bulk resource upload.
3. **Operations (P3):** ClassSession scheduling + holiday calendar (C1) → **notification engine + matrix + delivery log** (FR-NOT-1..7) → **WhatsApp** integration → parent portal + parent notifications → announcements → async bulk import (2k rows).
4. **Assessment (P4):** 8 question types + question bank → attempt UX (timer/palette/autosave) → assignments module → Q&A → comments → feedback → offline marks grid → test analytics.
5. **Money & insight (P5):** Razorpay + fee plans + invoices + collections → reports (progress/class/batch/teacher/institute) + at-risk → Control Center + Access Control + recycle bin/restore.
6. **Hardening (P6):** blog → CSP/virus-scan/PII-at-rest → WCAG + i18n → tests (unit + 12 E2E) → staging env → load test → pilot.

**Skip/reorder wins:** attendance-mark, assessment auto-grade, enrolment, bulk-import, student player, batch-create are already DONE → P2/P3/P4 can reuse them and start from the schema/engine work rather than the UI.

## D. QUICK WINS (MISSING/PARTIAL, effort S, independent — ship first)

- **Configure the 3 integrations** (Resend, S3/R2, QStash env vars) → activates email, media, reliable queue with zero code (FR-CNT-12, FR-SMTP, FR-NOT-4). _Biggest ROI._
- FR-AUTH-5 password policy (complexity + common-pw block).
- FR-AUTH-7 login lockout counter.
- FR-BLK-8 generic "export list to CSV" util (reused by many list views).
- FR-BAT-9 clone batch; FR-BAT-5 explicit transfer action.
- FR-TST-7 result view: add rank + time-taken + explanations.
- FR-BLK-1/2/3 finish the import UX (column mapping preview, send-credentials, dup choice) — engine already exists.
- FR-ATT-9 bulk attendance CSV import (mirrors student import).

## E. QUESTIONS FOR ME (need answers before P1 planning)

1. **Q1 tenancy** — single-institute or multi-tenant? (adds `instituteId` everywhere if multi). Current build is single-tenant.
2. **Q3 gateway** — Razorpay confirmed? Needs your Razorpay account + test keys.
3. **Q6 SMS** — the current code has **Twilio SMS** wired for parent alerts, but the PRD says WhatsApp+email only (no SMS). Keep SMS, drop it, or keep as fallback?
4. **Q7 self-attendance** — already built (student self-mark → teacher validate). Keep on, or make it an institute toggle (default off per PRD)?
5. **Roles** — OK to treat the existing `ADMIN` as `SUPER_ADMIN` and add `IT`/`PARENT`, or do you want a clean 5-value enum + data migration of existing admins?
6. **Provider keys** — do you have (or will you get) Resend, S3/R2, QStash, Razorpay, and Meta WhatsApp Business API credentials? Everything in P3/P5 needs them to go _live_ (code can be built + demoed degraded first).
7. **Staging** — can we stand up a second Supabase project + Vercel preview as staging, so we stop testing against the demo DB (NFR-M1)?
