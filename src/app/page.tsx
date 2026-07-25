import Link from "next/link";
import { getBranding } from "@/lib/branding";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const brand = await getBranding();
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-slate-50 px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <BrandMark brand={brand} size="xl" showName={false} />
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          {brand.name}
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">{brand.tagline}</p>
      </div>
      <Button asChild size="lg" className="text-white hover:opacity-90" style={{ backgroundColor: brand.color }}>
        <Link href="/login">Sign in</Link>
      </Button>
    </main>
  );
}
