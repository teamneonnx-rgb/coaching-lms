import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { requireAdminArea } from "@/lib/session";
import { hasCapability } from "@/lib/capabilities";
import { db } from "@/lib/db";
import { DEFAULT_INSTITUTE_ID } from "@/lib/settings";
import { getPageForEditor } from "@/lib/pages";
import type { Block } from "@/lib/pages/types";
import { BuilderMount } from "@/components/builder/builder-mount";

export const metadata: Metadata = { title: "Builder" };

export default async function BuilderHostPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdminArea();
  if (!(await hasCapability(user, "PAGE_BUILDER"))) redirect("/admin");

  const { id } = await params;
  const rec = await db.user.findUnique({ where: { id: user.id }, select: { instituteId: true } });
  const page = await getPageForEditor(id, rec?.instituteId ?? DEFAULT_INSTITUTE_ID);
  if (!page) notFound();

  const blocks = Array.isArray(page.draftBlocks) ? (page.draftBlocks as unknown as Block[]) : [];

  return <BuilderMount page={{ id: page.id, name: page.name, blocks }} />;
}
