import "server-only";
import { db } from "@/lib/db";

// Server-side read helpers for the page builder. Everything is scoped to the
// caller's institute; the runtime renderer additionally enforces role scope.

export async function getAdminPages(instituteId: string) {
  return db.page.findMany({
    where: { instituteId, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      assignedRoles: true,
      version: true,
      updatedAt: true,
    },
  });
}

export async function getPageForEditor(id: string, instituteId: string) {
  return db.page.findFirst({
    where: { id, instituteId, deletedAt: null },
  });
}
