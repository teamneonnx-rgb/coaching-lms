import { requireRole } from "@/lib/session";
import { BuilderTier1Nav } from "@/components/teacher/builder-tier1-nav";

// Teacher Assessment Builder — "Nested Complexity" 3-tier layout (UI spec).
// Tier 1 (icon nav, w-16) lives here; Tiers 2/3 + canvas are in the page.
export default async function AssessmentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("TEACHER");

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <BuilderTier1Nav />
      <div className="flex min-w-0 flex-1">{children}</div>
    </div>
  );
}
