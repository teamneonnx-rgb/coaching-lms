import type { Metadata } from "next";
import { Building2, ArrowRight } from "lucide-react";
import { requireRole } from "@/lib/session";
import { getTenants } from "@/lib/platform";
import { enterTenant } from "@/lib/actions/platform";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { CreateTenantDialog } from "@/components/platform/create-tenant-dialog";
import { TenantActions } from "@/components/platform/tenant-actions";

export const metadata: Metadata = { title: "Tenants" };

export default async function PlatformPage() {
  await requireRole("PLATFORM_OWNER");
  const tenants = await getTenants();

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <PageHeader title="Tenants" description="Create and manage coaching institutes on the platform." />
        <CreateTenantDialog />
      </div>

      {tenants.length === 0 ? (
        <EmptyState icon={Building2} title="No tenants yet" description="Create your first institute — it gets its own admin and data." />
      ) : (
        <Card className="border-slate-200">
          <CardContent className="divide-y divide-slate-100 p-0">
            {tenants.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50">
                {/* Click the tenant to ENTER it (manage as its Super Admin, read-only). */}
                <form action={enterTenant.bind(null, t.id)} className="min-w-0 flex-1">
                  <button type="submit" title={`Enter ${t.name}`} className="group flex w-full items-center gap-3 text-left">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600">
                      <Building2 className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900 group-hover:text-blue-700">{t.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        /{t.slug} · {t.userCount} user{t.userCount === 1 ? "" : "s"}
                        {t.owner ? ` · admin ${t.owner.email}` : " · no admin"}
                      </span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-slate-300 group-hover:text-blue-500" />
                  </button>
                </form>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    t.isActive ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                  }`}
                >
                  {t.isActive ? "active" : "suspended"}
                </span>
                <TenantActions id={t.id} name={t.name} active={t.isActive} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
