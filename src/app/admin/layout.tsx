import { requireAdminArea, enforcePasswordRotation } from "@/lib/session";
import { getCapabilitySet } from "@/lib/capabilities";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdminArea();
  await enforcePasswordRotation(user.id); // FR-AU-02
  const navUser = { name: user.name, email: user.email };

  // FR-PM-01: nav items an Admin wasn't granted are not rendered. Resolved
  // from the DB per request (never cached in the JWT) so revokes bite
  // immediately (FR-SA-04). Super Admin gets everything; IT gets read-only.
  const capabilities = [...(await getCapabilitySet(user))];

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop: persistent sidebar (w-64) */}
      <aside className="sticky top-0 hidden h-screen shrink-0 lg:block">
        <AdminSidebar user={navUser} role={user.role} capabilities={capabilities} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Sticky header with mobile hamburger + notification bell */}
        <AdminHeader user={navUser} role={user.role} capabilities={capabilities} />
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
