import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { auth } from "@/auth";
import { homeForRole } from "@/lib/roles";

// Server-side guard helpers. Middleware already enforces route access, but
// pages call these as defence-in-depth and to obtain the typed session.
export async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
}

export async function requireRole(role: Role) {
  const user = await requireUser();
  if (user.role !== role) redirect(homeForRole(user.role));
  return user;
}
