import { requireRole } from "@/lib/session";
import { StudentSidebar } from "@/components/student/student-sidebar";
import { StudentTopbar } from "@/components/student/student-topbar";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("STUDENT");
  const navUser = { name: user.name, email: user.email };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Desktop: persistent left sidebar (w-64) */}
      <aside className="sticky top-0 hidden h-screen shrink-0 xl:block">
        <StudentSidebar user={navUser} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile/tablet: hamburger → Sheet */}
        <StudentTopbar user={navUser} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
