"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { assertNotImpersonating, IMP_COOKIE } from "@/lib/impersonation";
import { logAudit } from "@/lib/audit";

export type ActionResult = { ok: boolean; error?: string; info?: string };

const BCRYPT_ROUNDS = 12;

function slugify(v: string) {
  return v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "tenant";
}

const createSchema = z.object({
  instituteName: z.string().trim().min(2, "Institute name is required").max(120),
  adminName: z.string().trim().min(2, "Admin name is required").max(120),
  adminEmail: z.string().trim().email("Enter a valid email"),
  adminPassword: z.string().min(8, "Password must be at least 8 characters").max(100),
});

// Provision a new tenant: an Institute + its owner SUPER_ADMIN (one per
// institute, enforced by a partial unique index). Platform-owner only.
export async function createTenant(values: unknown): Promise<ActionResult & { id?: string }> {
  let owner;
  try {
    owner = await requireRole("PLATFORM_OWNER");
    await assertNotImpersonating();
  } catch {
    return { ok: false, error: "403 — platform owner only" };
  }
  const parsed = createSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;
  const email = d.adminEmail.toLowerCase();

  if (await db.user.findUnique({ where: { email }, select: { id: true } })) {
    return { ok: false, error: "That admin email is already in use" };
  }

  let slug = slugify(d.instituteName);
  let n = 1;
  while (await db.institute.findUnique({ where: { slug }, select: { id: true } })) {
    n += 1;
    slug = `${slugify(d.instituteName)}-${n}`;
  }

  const institute = await db.institute.create({ data: { name: d.instituteName, slug } });
  await db.user.create({
    data: {
      name: d.adminName,
      email,
      password: await bcrypt.hash(d.adminPassword, BCRYPT_ROUNDS),
      role: "SUPER_ADMIN",
      instituteId: institute.id,
      mustChangePassword: true, // owner sets their own password on first login
    },
  });

  await logAudit({
    actorId: owner.id, actorRole: owner.role, action: "tenant.create",
    entity: "Institute", entityId: institute.id, detail: d.instituteName,
  });
  revalidatePath("/platform");
  return { ok: true, id: institute.id, info: "Tenant created" };
}

export async function setTenantActive(id: string, active: boolean): Promise<ActionResult> {
  let owner;
  try {
    owner = await requireRole("PLATFORM_OWNER");
    await assertNotImpersonating();
  } catch {
    return { ok: false, error: "403 — platform owner only" };
  }
  const inst = await db.institute.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!inst) return { ok: false, error: "Tenant not found" };

  await db.institute.update({ where: { id }, data: { isActive: active } });
  await logAudit({
    actorId: owner.id, actorRole: owner.role,
    action: active ? "tenant.reactivate" : "tenant.suspend",
    entity: "Institute", entityId: id, detail: inst.name,
  });
  revalidatePath("/platform");
  return { ok: true, info: active ? "Tenant reactivated" : "Tenant suspended — its users can no longer sign in" };
}

// "Enter" a tenant: the platform owner drops into that institute's admin area
// as its Super Admin, READ-ONLY (the same imp_uid cookie + write-block used by
// impersonation). Honoured only when the real session is the platform owner
// (getSessionContext). Redirects into /admin; exit via the banner → /platform.
export async function enterTenant(instituteId: string): Promise<void> {
  const owner = await requireRole("PLATFORM_OWNER"); // redirects if not platform owner
  await assertNotImpersonating();

  const admin = await db.user.findFirst({
    where: { instituteId, role: "SUPER_ADMIN", deletedAt: null },
    select: { id: true },
  });
  const inst = await db.institute.findUnique({ where: { id: instituteId }, select: { name: true } });
  if (!admin || !inst) redirect("/platform");

  (await cookies()).set(IMP_COOKIE, admin.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 });
  await logAudit({
    actorId: owner.id, actorRole: owner.role, action: "tenant.enter",
    entity: "Institute", entityId: instituteId, detail: inst.name,
  });
  redirect("/admin");
}
