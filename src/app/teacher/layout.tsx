import { requireRole } from "@/lib/session";

// Root teacher guard. The dashboard/attendance sidebar shell lives in the
// (main) route group; the assessment builder uses its own 3-tier layout.
export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("TEACHER");
  return <>{children}</>;
}
