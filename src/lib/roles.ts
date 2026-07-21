import type { Role } from "@prisma/client";

// Single source of truth for role → landing route (FR-AUTH-02).
export const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/admin",
  TEACHER: "/teacher",
  STUDENT: "/student",
};

// Route prefix each role is allowed to access.
export const ROLE_PREFIX: Record<Role, string> = {
  ADMIN: "/admin",
  TEACHER: "/teacher",
  STUDENT: "/student",
};

export function homeForRole(role: Role): string {
  return ROLE_HOME[role] ?? "/";
}
