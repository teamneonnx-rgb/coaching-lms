import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { homeForRole } from "@/lib/roles";

// Post-login router: forwards each user to their role home (FR-AUTH-02).
export default async function DashboardRouter() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  redirect(homeForRole(session.user.role));
}
