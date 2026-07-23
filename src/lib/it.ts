import "server-only";
import type { ErrorSeverity, Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type ErrorFilter = {
  role?: string;
  severity?: ErrorSeverity;
  resolved?: "resolved" | "unresolved";
  userId?: string;
};

// FR-IT-01/03: errors across all role profiles, filterable.
export async function getErrorLogs(filter: ErrorFilter = {}, take = 100) {
  const where: Prisma.ErrorLogWhereInput = {};
  if (filter.role) where.affectedRole = filter.role;
  if (filter.severity) where.severity = filter.severity;
  if (filter.resolved) where.resolvedFlag = filter.resolved === "resolved";
  if (filter.userId) where.affectedUserId = filter.userId;

  return db.errorLog.findMany({
    where,
    orderBy: { occurredAt: "desc" },
    take,
  });
}

// Header KPIs for the dashboard.
export async function getErrorStats() {
  const [total, unresolved, critical, byRole] = await Promise.all([
    db.errorLog.count(),
    db.errorLog.count({ where: { resolvedFlag: false } }),
    db.errorLog.count({ where: { severity: { in: ["HIGH", "CRITICAL"] }, resolvedFlag: false } }),
    db.errorLog.groupBy({ by: ["affectedRole"], _count: { _all: true } }),
  ]);
  return { total, unresolved, critical, byRole };
}

// FR-IT-04: a specific user's profile in diagnostic mode.
export async function getUserDiagnostics(userId: string) {
  const [user, errors] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, status: true, lastLoginAt: true },
    }),
    db.errorLog.findMany({
      where: { affectedUserId: userId },
      orderBy: { occurredAt: "desc" },
      take: 100,
    }),
  ]);
  return { user, errors };
}
