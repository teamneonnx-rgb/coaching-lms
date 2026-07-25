import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutTemplate, Pencil } from "lucide-react";
import { requireAdminArea } from "@/lib/session";
import { hasCapability } from "@/lib/capabilities";
import { db } from "@/lib/db";
import { DEFAULT_INSTITUTE_ID } from "@/lib/settings";
import { getAdminPages } from "@/lib/pages";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { RoleBadge } from "@/components/admin/role-badge";
import { NewPageDialog } from "@/components/builder/new-page-dialog";
import { DeletePageButton } from "@/components/builder/delete-page-button";

export const metadata: Metadata = { title: "Page builder" };

export default async function AdminPagesPage() {
  const user = await requireAdminArea();
  if (!(await hasCapability(user, "PAGE_BUILDER"))) redirect("/admin");

  const rec = await db.user.findUnique({ where: { id: user.id }, select: { instituteId: true } });
  const pages = await getAdminPages(rec?.instituteId ?? DEFAULT_INSTITUTE_ID);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Page builder"
          description="Build custom screens by dragging components onto a canvas, then publish them to roles."
        />
        <NewPageDialog />
      </div>

      {pages.length === 0 ? (
        <EmptyState
          icon={LayoutTemplate}
          title="No pages yet"
          description="Create your first page, then drag components onto the canvas."
        />
      ) : (
        <Card className="border-slate-200">
          <CardContent className="divide-y divide-slate-100 p-0">
            {pages.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <Link href={`/admin/pages/${p.id}`} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{p.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    /{p.slug} · updated {p.updatedAt.toLocaleDateString("en", { day: "numeric", month: "short" })}
                  </p>
                </Link>

                <div className="hidden items-center gap-1.5 sm:flex">
                  {p.assignedRoles.length === 0 ? (
                    <span className="text-xs text-slate-400">no roles</span>
                  ) : (
                    p.assignedRoles.map((r) => <RoleBadge key={r} role={r} />)
                  )}
                </div>

                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    p.status === "PUBLISHED"
                      ? "bg-green-50 text-green-600"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {p.status === "PUBLISHED" ? `published v${p.version}` : "draft"}
                </span>

                <Link
                  href={`/admin/pages/${p.id}`}
                  className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                  title="Open in builder"
                  aria-label={`Edit ${p.name}`}
                >
                  <Pencil className="size-4" />
                </Link>
                <DeletePageButton id={p.id} name={p.name} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
