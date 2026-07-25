import { requireRole, enforcePasswordRotation } from "@/lib/session";
import { getBranding } from "@/lib/branding";
import { db } from "@/lib/db";
import { DEFAULT_INSTITUTE_ID } from "@/lib/settings";
import { TeacherSidebar } from "@/components/teacher/teacher-sidebar";
import { TeacherTopbar } from "@/components/teacher/teacher-topbar";

export default async function TeacherMainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("TEACHER");
  await enforcePasswordRotation(user.id); // FR-AU-02
  const navUser = { name: user.name, email: user.email };
  const actor = await db.user.findUnique({ where: { id: user.id }, select: { instituteId: true } });
  const brand = await getBranding(actor?.instituteId ?? DEFAULT_INSTITUTE_ID);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="sticky top-0 hidden h-screen shrink-0 lg:block">
        <TeacherSidebar user={navUser} brand={brand} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <TeacherTopbar user={navUser} brand={brand} />
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
