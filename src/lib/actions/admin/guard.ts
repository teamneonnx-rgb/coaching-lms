import "server-only";
import { auth } from "@/auth";
import { isAdminArea, isFullAdmin } from "@/lib/roles";

// Admin create/read/update gate — SUPER_ADMIN, ADMIN and IT (FR-ROLE-1/2).
export async function assertAdmin() {
  const session = await auth();
  if (!session?.user || !isAdminArea(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

// Delete gate — SUPER_ADMIN / ADMIN only. IT cannot delete (FR-ROLE-2).
export async function assertCanDelete() {
  const session = await auth();
  if (!session?.user || !isFullAdmin(session.user.role)) {
    throw new Error("Only an admin can delete records");
  }
  return session.user;
}
