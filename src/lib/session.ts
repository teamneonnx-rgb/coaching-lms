import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { homeForRole, isAdminArea } from "@/lib/roles";
import { getSessionContext } from "@/lib/impersonation";

// Server-side guard helpers. Middleware already enforces route access, but
// pages call these as defence-in-depth and to obtain the typed session.
// During Super Admin impersonation these return the EFFECTIVE (target) user so
// dashboards render as that user; writes are separately blocked (FR-SA-06).
export async function requireUser() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");
  return ctx.user;
}

export async function requireRole(role: Role) {
  const user = await requireUser();
  if (user.role !== role) redirect(homeForRole(user.role as Role));
  return user;
}

// Allows any admin-area role (SUPER_ADMIN / ADMIN) — used by /admin pages.
export async function requireAdminArea() {
  const user = await requireUser();
  if (!isAdminArea(user.role as Role)) redirect(homeForRole(user.role as Role));
  return user;
}

// FR-AU-02: accounts created by an admin must change their password on first
// login. Called from every role shell layout; sends the user to the rotation
// screen until the flag clears.
export async function enforcePasswordRotation(userId: string) {
  const { db } = await import("@/lib/db");
  const row = await db.user.findUnique({
    where: { id: userId },
    select: { mustChangePassword: true },
  });
  if (row?.mustChangePassword) redirect("/change-password");
}
