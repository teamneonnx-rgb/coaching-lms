"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/capabilities";
import { DEFAULT_INSTITUTE_ID } from "@/lib/settings";
import { logAudit } from "@/lib/audit";
import { blockTreeSchema } from "@/lib/pages/types";

export type ActionResult = { ok: boolean; error?: string; info?: string };

// Builder access is gated by the PAGE_BUILDER capability (Super Admin implicit;
// impersonation blocked). Returns the actor + their institute for scoping.
async function requireBuilder() {
  const actor = await requireCapability("PAGE_BUILDER");
  const rec = await db.user.findUnique({ where: { id: actor.id }, select: { instituteId: true } });
  return { actor, instituteId: rec?.instituteId ?? DEFAULT_INSTITUTE_ID };
}

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "page"
  );
}

// Ensure the slug is unique within the institute (append -2, -3, …).
async function uniqueSlug(instituteId: string, base: string) {
  let slug = base;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const clash = await db.page.findFirst({
      where: { instituteId, slug },
      select: { id: true },
    });
    if (!clash) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

const createSchema = z.object({ name: z.string().trim().min(1, "Name is required").max(120) });

export async function createPage(values: unknown): Promise<ActionResult & { id?: string }> {
  let ctx;
  try {
    ctx = await requireBuilder();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Not authorized" };
  }
  const parsed = createSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const slug = await uniqueSlug(ctx.instituteId, slugify(parsed.data.name));
  const page = await db.page.create({
    data: {
      instituteId: ctx.instituteId,
      name: parsed.data.name,
      slug,
      draftBlocks: [],
      updatedById: ctx.actor.id,
    },
    select: { id: true },
  });

  await logAudit({
    actorId: ctx.actor.id, actorRole: ctx.actor.role, action: "page.create",
    entity: "Page", entityId: page.id, detail: parsed.data.name,
  });

  revalidatePath("/admin/pages");
  return { ok: true, id: page.id };
}

const saveDraftSchema = z.object({ id: z.string().min(1), blocks: blockTreeSchema });

// Autosave: persists the working block tree. Validated so an unknown block type
// or malformed tree can never be stored.
export async function savePageDraft(values: unknown): Promise<ActionResult> {
  let ctx;
  try {
    ctx = await requireBuilder();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Not authorized" };
  }
  const parsed = saveDraftSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Invalid page content" };

  const page = await db.page.findFirst({
    where: { id: parsed.data.id, instituteId: ctx.instituteId, deletedAt: null },
    select: { id: true },
  });
  if (!page) return { ok: false, error: "Page not found" };

  await db.page.update({
    where: { id: page.id },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma Json input
    data: { draftBlocks: parsed.data.blocks as any, updatedById: ctx.actor.id },
  });
  return { ok: true };
}

const renameSchema = z.object({ id: z.string().min(1), name: z.string().trim().min(1).max(120) });

export async function renamePage(values: unknown): Promise<ActionResult> {
  let ctx;
  try {
    ctx = await requireBuilder();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Not authorized" };
  }
  const parsed = renameSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const page = await db.page.findFirst({
    where: { id: parsed.data.id, instituteId: ctx.instituteId, deletedAt: null },
    select: { id: true },
  });
  if (!page) return { ok: false, error: "Page not found" };

  await db.page.update({
    where: { id: page.id },
    data: { name: parsed.data.name, updatedById: ctx.actor.id },
  });
  revalidatePath("/admin/pages");
  return { ok: true };
}

export async function deletePage(id: string): Promise<ActionResult> {
  let ctx;
  try {
    ctx = await requireBuilder();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Not authorized" };
  }
  const page = await db.page.findFirst({
    where: { id, instituteId: ctx.instituteId, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!page) return { ok: false, error: "Page not found" };

  await db.page.update({ where: { id: page.id }, data: { deletedAt: new Date() } });
  await logAudit({
    actorId: ctx.actor.id, actorRole: ctx.actor.role, action: "page.delete",
    entity: "Page", entityId: page.id, detail: page.name,
  });
  revalidatePath("/admin/pages");
  return { ok: true, info: "Page deleted" };
}
