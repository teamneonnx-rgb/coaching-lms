import "server-only";
import { db } from "@/lib/db";

// Resources awaiting review (FR-APR) — newest first, with course/teacher context.
export async function getPendingResources(instituteId: string | null) {
  return db.resource.findMany({
    where: { approvalStatus: "PENDING", chapter: { course: { teacher: { instituteId } } } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      type: true,
      fileKey: true,
      createdAt: true,
      chapter: {
        select: {
          title: true,
          course: {
            select: { id: true, title: true, teacher: { select: { name: true } }, batch: { select: { name: true } } },
          },
        },
      },
    },
  });
}

export async function getPendingResourceCount(instituteId: string | null) {
  return db.resource.count({ where: { approvalStatus: "PENDING", chapter: { course: { teacher: { instituteId } } } } });
}
