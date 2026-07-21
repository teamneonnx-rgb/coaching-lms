import { PrismaClient, type Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const BCRYPT_ROUNDS = 12; // FR-AUTH-03

type SeedUser = {
  name: string;
  email: string;
  password: string;
  role: Role;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
};

const users: SeedUser[] = [
  { name: "Institute Admin", email: "admin@lms.test", password: "Admin@123", role: "ADMIN" },
  { name: "Priya Teacher", email: "teacher@lms.test", password: "Teacher@123", role: "TEACHER" },
  {
    name: "Rahul Student",
    email: "student@lms.test",
    password: "Student@123",
    role: "STUDENT",
    parentName: "Sunita Sharma",
    parentPhone: "+919000000000",
    parentEmail: "parent@lms.test",
  },
];

async function main() {
  // ── Users ──
  const byEmail: Record<string, string> = {};
  for (const u of users) {
    const password = await bcrypt.hash(u.password, BCRYPT_ROUNDS);
    const created = await db.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name,
        email: u.email,
        password,
        role: u.role,
        parentName: u.parentName ?? null,
        parentPhone: u.parentPhone ?? null,
        parentEmail: u.parentEmail ?? null,
      },
    });
    byEmail[u.email] = created.id;
    console.log(`✔ user   ${u.role.padEnd(8)} ${u.email}`);
  }

  const teacherId = byEmail["teacher@lms.test"];
  const studentId = byEmail["student@lms.test"];

  // ── Batch ──
  const batch = await db.batch.upsert({
    where: { name: "NEET 2026 Morning" },
    update: {},
    create: {
      name: "NEET 2026 Morning",
      description: "Full-time NEET preparation batch, morning slot.",
      startDate: new Date("2026-04-01"),
      isActive: true,
    },
  });
  console.log(`✔ batch  ${batch.name}`);

  // ── Enrollment (student → active batch) ──
  await db.enrollment.upsert({
    where: { studentId_batchId: { studentId, batchId: batch.id } },
    update: { isActive: true },
    create: { studentId, batchId: batch.id, isActive: true },
  });
  console.log(`✔ enroll student → ${batch.name}`);

  // ── Content (only if this batch has no courses yet) ──
  const existingCourses = await db.course.count({ where: { batchId: batch.id } });
  if (existingCourses === 0) {
    const course = await db.course.create({
      data: {
        title: "Organic Chemistry",
        description: "Core organic chemistry for NEET — reactions, mechanisms, and problems.",
        batchId: batch.id,
        teacherId,
      },
    });

    const chapters = [
      {
        title: "Basic Concepts",
        resources: [
          { title: "Introduction to Organic Chemistry", type: "VIDEO" as const, duration: 720 },
          { title: "Nomenclature Notes", type: "PDF" as const },
        ],
      },
      {
        title: "Hydrocarbons",
        resources: [
          { title: "Alkanes & Alkenes Lecture", type: "VIDEO" as const, duration: 1500 },
          { title: "Reaction Mechanisms", type: "VIDEO" as const, duration: 1320 },
          { title: "Practice Problem Set", type: "PDF" as const },
        ],
      },
    ];

    for (const [ci, ch] of chapters.entries()) {
      const chapter = await db.chapter.create({
        data: { title: ch.title, order: ci, courseId: course.id },
      });
      for (const [ri, r] of ch.resources.entries()) {
        await db.resource.create({
          data: {
            title: r.title,
            type: r.type,
            // Placeholder object keys — swap for real S3/R2 keys after upload.
            fileKey: `demo/${course.id}/${chapter.id}/${ri}-${r.type.toLowerCase()}`,
            duration: r.type === "VIDEO" ? r.duration : null,
            order: ri,
            chapterId: chapter.id,
          },
        });
      }
    }
    console.log(`✔ content ${course.title} (2 chapters, 5 resources)`);

    // Sample published objective assessment (auto-graded, 0.25 negative marking).
    await db.assessment.create({
      data: {
        title: "Organic Chemistry — Quiz 1",
        description: "Auto-graded objective quiz with 0.25 negative marking.",
        type: "OBJECTIVE",
        courseId: course.id,
        teacherId,
        negativeMarking: 0.25,
        isPublished: true,
        questions: {
          create: [
            {
              text: "What is the hybridization of carbon in methane (CH4)?",
              points: 4,
              order: 0,
              options: {
                create: [
                  { text: "sp3", isCorrect: true, order: 0 },
                  { text: "sp2", isCorrect: false, order: 1 },
                ],
              },
            },
            {
              text: "Which functional group defines an alcohol?",
              points: 4,
              order: 1,
              options: {
                create: [
                  { text: "-OH", isCorrect: true, order: 0 },
                  { text: "-COOH", isCorrect: false, order: 1 },
                ],
              },
            },
          ],
        },
      },
    });
    console.log(`✔ assessment ${course.title} — Quiz 1 (published, 2 questions)`);
  } else {
    console.log(`• content skipped (batch already has ${existingCourses} course(s))`);
  }
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
