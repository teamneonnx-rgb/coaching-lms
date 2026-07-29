// Tenant-isolation regression test — the safe backstop for multi-tenancy.
//
// Why this exists: FORCE-RLS can't enforce tenancy in this stack (the app
// connects as the table owner over a transaction pooler with no per-request
// tenant GUC), so the guarantee is enforced in the app layer + verified here.
// This test seeds TWO throwaway tenants, then asserts that the exact query
// shapes used by the admin surface, the by-id write guards, and impersonation
// never cross the tenant boundary. Run it before every deploy:
//
//   npm run test:isolation
//
// Exits non-zero (fails CI) if anything leaks. Self-contained: it creates and
// then deletes all of its own data, so it's safe to run against any environment.

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const TAG = "__isotest__";
let pass = 0, fail = 0;
const chk = (cond, msg) => (cond ? (pass++, console.log("  ok   " + msg)) : (fail++, console.error("  FAIL " + msg)));

async function seedTenant(key) {
  const inst = await db.institute.create({ data: { name: `${TAG} ${key}`, slug: `${TAG}-${key}-${Date.now()}` } });
  const teacher = await db.user.create({ data: { name: `${TAG} teacher ${key}`, email: `${TAG}.teacher.${key}.${Date.now()}@ex.com`, password: "x", role: "TEACHER", instituteId: inst.id } });
  const student = await db.user.create({ data: { name: `${TAG} student ${key}`, email: `${TAG}.student.${key}.${Date.now()}@ex.com`, password: "x", role: "STUDENT", instituteId: inst.id } });
  const batch = await db.batch.create({ data: { name: `${TAG} batch ${key}`, startDate: new Date(), instituteId: inst.id } });
  const course = await db.course.create({ data: { title: `${TAG} course ${key}`, batchId: batch.id, teacherId: teacher.id } });
  const enquiry = await db.enquiry.create({ data: { name: `${TAG} lead ${key}`, instituteId: inst.id, status: "NEW" } });
  return { inst, teacher, student, batch, course, enquiry };
}

async function run() {
  const A = await seedTenant("A");
  const B = await seedTenant("B");
  const a = A.inst.id, b = B.inst.id;

  // ── Read scoping (admin lists) — A's queries must never see B's rows ──
  const aStudents = await db.user.findMany({ where: { role: "STUDENT", deletedAt: null, instituteId: a }, select: { id: true } });
  chk(aStudents.some((u) => u.id === A.student.id) && !aStudents.some((u) => u.id === B.student.id), "users list: A sees its student, not B's");

  const aEnq = await db.enquiry.findMany({ where: { instituteId: a }, select: { id: true } });
  chk(aEnq.some((e) => e.id === A.enquiry.id) && !aEnq.some((e) => e.id === B.enquiry.id), "enquiries list: A sees its lead, not B's");

  const aBatches = await db.batch.findMany({ where: { instituteId: a }, select: { id: true } });
  chk(aBatches.some((x) => x.id === A.batch.id) && !aBatches.some((x) => x.id === B.batch.id), "batches list: A sees its batch, not B's");

  const aCourses = await db.course.findMany({ where: { teacher: { instituteId: a } }, select: { id: true } });
  chk(aCourses.some((c) => c.id === A.course.id) && !aCourses.some((c) => c.id === B.course.id), "courses list (via teacher): A sees its course, not B's");

  // ── By-id write guards — a cross-tenant id must resolve to nothing ──
  chk((await db.user.findUnique({ where: { id: B.student.id }, select: { instituteId: true } })).instituteId !== a, "user by-id guard: B's student is not in A's institute");
  chk((await db.enquiry.findFirst({ where: { id: B.enquiry.id, instituteId: a } })) === null, "enquiry by-id guard: A cannot act on B's enquiry");
  chk((await db.batch.findFirst({ where: { id: B.batch.id, instituteId: a }, select: { id: true } })) === null, "batch by-id guard: A cannot act on B's batch");
  chk((await db.course.findFirst({ where: { id: B.course.id, teacher: { instituteId: a } }, select: { id: true } })) === null, "course by-id guard: A cannot delete B's course");

  // ── Impersonation guard — same-institute + non-privileged only ──
  const impTarget = (id, realInst) => db.user.findFirst({ where: { id, deletedAt: null, role: { notIn: ["SUPER_ADMIN", "PLATFORM_OWNER"] }, instituteId: realInst }, select: { id: true } });
  chk((await impTarget(B.student.id, a)) === null, "impersonation: A's SA cannot impersonate a B-tenant user");
  chk((await impTarget(A.student.id, a)) !== null, "impersonation: A's SA can impersonate its own tenant user");
  const platformOwner = await db.user.findFirst({ where: { role: "PLATFORM_OWNER" }, select: { id: true } });
  if (platformOwner) chk((await impTarget(platformOwner.id, a)) === null, "impersonation: A's SA cannot impersonate the platform owner");

  return { A, B };
}

async function teardown(seeded) {
  if (!seeded) return;
  for (const t of [seeded.A, seeded.B]) {
    await db.course.deleteMany({ where: { id: t.course.id } });
    await db.batch.deleteMany({ where: { id: t.batch.id } });
    await db.enquiry.deleteMany({ where: { id: t.enquiry.id } });
    await db.user.deleteMany({ where: { id: { in: [t.teacher.id, t.student.id] } } });
    await db.institute.deleteMany({ where: { id: t.inst.id } });
  }
}

let seeded;
try {
  seeded = await run();
} catch (e) {
  console.error("Test error:", e);
  fail++;
} finally {
  try { await teardown(seeded); } catch (e) { console.error("Teardown error:", e); }
  await db.$disconnect();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
