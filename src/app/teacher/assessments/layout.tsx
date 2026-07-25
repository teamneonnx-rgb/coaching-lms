import { requireRole } from "@/lib/session";
import { getBranding } from "@/lib/branding";
import { db } from "@/lib/db";
import { DEFAULT_INSTITUTE_ID } from "@/lib/settings";
import { BuilderTier1Nav } from "@/components/teacher/builder-tier1-nav";

// Teacher Assessment Builder — "Nested Complexity" 3-tier layout (UI spec).
// Tier 1 (icon nav, w-16) lives here; Tiers 2/3 + canvas are in the page.
export default async function AssessmentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("TEACHER");
  const actor = await db.user.findUnique({ where: { id: user.id }, select: { instituteId: true } });
  const brand = await getBranding(actor?.instituteId ?? DEFAULT_INSTITUTE_ID);

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <BuilderTier1Nav brand={brand} />
      <div className="flex min-w-0 flex-1">{children}</div>
    </div>
  );
}
