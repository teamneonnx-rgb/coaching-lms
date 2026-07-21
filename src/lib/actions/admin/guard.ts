import "server-only";
import { auth } from "@/auth";

// Every admin mutation calls this first. Throws if the caller is not an admin,
// providing a server-side authorization gate beyond the edge middleware.
export async function assertAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session.user;
}
