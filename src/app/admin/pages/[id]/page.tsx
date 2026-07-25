import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, LayoutTemplate } from "lucide-react";
import { requireAdminArea } from "@/lib/session";
import { hasCapability } from "@/lib/capabilities";
import { db } from "@/lib/db";
import { DEFAULT_INSTITUTE_ID } from "@/lib/settings";
import { getPageForEditor } from "@/lib/pages";

export const metadata: Metadata = { title: "Builder" };

export default async function BuilderHostPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdminArea();
  if (!(await hasCapability(user, "PAGE_BUILDER"))) redirect("/admin");

  const { id } = await params;
  const rec = await db.user.findUnique({ where: { id: user.id }, select: { instituteId: true } });
  const page = await getPageForEditor(id, rec?.instituteId ?? DEFAULT_INSTITUTE_ID);
  if (!page) notFound();

  const blockCount = Array.isArray(page.draftBlocks) ? page.draftBlocks.length : 0;

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/admin/pages"
          className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          aria-label="Back to pages"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{page.name}</h1>
          <p className="text-xs text-muted-foreground">/{page.slug} · {page.status.toLowerCase()} · {blockCount} block(s)</p>
        </div>
      </div>

      {/* Phase 1 placeholder — the drag-and-drop editor mounts here in Phase 2. */}
      <div className="flex min-h-[360px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-center">
        <LayoutTemplate className="size-8 text-slate-300" />
        <p className="text-sm font-medium text-slate-600">Canvas</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          The drag-and-drop editor (palette · canvas · inspector) mounts here in Phase 2.
          The page record, storage, and permissions are wired and working.
        </p>
      </div>
    </div>
  );
}
