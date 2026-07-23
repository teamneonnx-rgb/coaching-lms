import { requireRole, enforcePasswordRotation } from "@/lib/session";
import { ItSidebar } from "@/components/it/it-sidebar";

// FR-IT: the IT diagnostics shell. Distinct from /admin — IT has no business
// write access anywhere (FR-IT-06).
export default async function ItLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("IT");
  await enforcePasswordRotation(user.id);
  const navUser = { name: user.name, email: user.email };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="sticky top-0 hidden h-screen shrink-0 lg:block">
        <ItSidebar user={navUser} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
