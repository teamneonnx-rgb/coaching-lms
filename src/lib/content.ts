import "server-only";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";

// Fetch a course with its chapters+resources IF the user may manage it
// (ADMIN any, TEACHER own). Returns null when not found or not authorized.
export async function getManageableCourse(userId: string, role: Role, courseId: string) {
  const where =
    role === "ADMIN" ? { id: courseId } : { id: courseId, teacherId: userId };

  return db.course.findFirst({
    where,
    include: {
      batch: { select: { id: true, name: true } },
      teacher: { select: { name: true } },
      chapters: {
        orderBy: { order: "asc" },
        include: {
          resources: {
            orderBy: { order: "asc" },
            select: { id: true, title: true, type: true, duration: true },
          },
        },
      },
    },
  });
}
