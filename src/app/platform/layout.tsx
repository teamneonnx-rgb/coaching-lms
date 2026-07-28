import { requireRole, enforcePasswordRotation } from "@/lib/session";
import { getBranding } from "@/lib/branding";
import { BrandMark } from "@/components/brand-mark";
import { LogoutButton } from "@/components/logout-button";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("PLATFORM_OWNER");
  await enforcePasswordRotation(user.id);
  const brand = await getBranding();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <BrandMark brand={brand} size="md" showName={false} />
          <div>
            <p className="text-sm font-semibold text-slate-900">Platform console</p>
            <p className="text-xs text-muted-foreground">{user.name}</p>
          </div>
        </div>
        <LogoutButton />
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 p-4 lg:p-8">{children}</main>
    </div>
  );
}
