import { requireRole, enforcePasswordRotation } from "@/lib/session";
import { getBranding } from "@/lib/branding";
import { db } from "@/lib/db";
import { DEFAULT_INSTITUTE_ID } from "@/lib/settings";
import { StudentSidebar } from "@/components/student/student-sidebar";
import { StudentTopbar } from "@/components/student/student-topbar";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("STUDENT");
  await enforcePasswordRotation(user.id); // FR-AU-02
  const navUser = { name: user.name, email: user.email };
  const actor = await db.user.findUnique({ where: { id: user.id }, select: { instituteId: true } });
  const brand = await getBranding(actor?.instituteId ?? DEFAULT_INSTITUTE_ID);

  return (
    <div className="flex min-h-screen bg-white">
      {/* Desktop: persistent left sidebar (w-64) */}
      <aside className="sticky top-0 hidden h-screen shrink-0 xl:block">
        <StudentSidebar user={navUser} brand={brand} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile/tablet: hamburger → Sheet */}
        <StudentTopbar user={navUser} brand={brand} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
