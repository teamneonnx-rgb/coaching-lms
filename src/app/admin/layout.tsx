import { requireAdminArea } from "@/lib/session";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdminArea();
  const navUser = { name: user.name, email: user.email };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop: persistent sidebar (w-64) */}
      <aside className="sticky top-0 hidden h-screen shrink-0 lg:block">
        <AdminSidebar user={navUser} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Sticky header with mobile hamburger + notification bell */}
        <AdminHeader user={navUser} />
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
