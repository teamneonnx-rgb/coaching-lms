import { requireRole } from "@/lib/session";
import { TeacherSidebar } from "@/components/teacher/teacher-sidebar";
import { TeacherTopbar } from "@/components/teacher/teacher-topbar";

export default async function TeacherMainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("TEACHER");
  const navUser = { name: user.name, email: user.email };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="sticky top-0 hidden h-screen shrink-0 lg:block">
        <TeacherSidebar user={navUser} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <TeacherTopbar user={navUser} />
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
