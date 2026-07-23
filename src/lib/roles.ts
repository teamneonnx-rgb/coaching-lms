import type { Role } from "@prisma/client";

// Single source of truth for role → landing route (FR-AUTH-02).
// SUPER_ADMIN and ADMIN live in /admin. IT has its own read-only diagnostics
// shell at /it (FR-IT-06 — no business write access). PARENT gets a portal.
export const ROLE_HOME: Record<Role, string> = {
  SUPER_ADMIN: "/admin",
  ADMIN: "/admin",
  IT: "/it",
  TEACHER: "/teacher",
  STUDENT: "/student",
  PARENT: "/parent",
};

// Route prefix each role is allowed to access.
export const ROLE_PREFIX: Record<Role, string> = {
  SUPER_ADMIN: "/admin",
  ADMIN: "/admin",
  IT: "/it",
  TEACHER: "/teacher",
  STUDENT: "/student",
  PARENT: "/parent",
};

// Roles that may enter the /admin area. IT is NOT one of them (FR-IT-06).
export const ADMIN_AREA_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN"];

// Roles with full (delete-capable) admin power. IT is deliberately excluded
// (FR-ROLE-2: IT cannot delete).
export const FULL_ADMIN_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN"];

export function homeForRole(role: Role): string {
  return ROLE_HOME[role] ?? "/";
}

export function isAdminArea(role: Role): boolean {
  return ADMIN_AREA_ROLES.includes(role);
}

export function isFullAdmin(role: Role): boolean {
  return FULL_ADMIN_ROLES.includes(role);
}
