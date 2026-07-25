import Link from "next/link";
import { getBranding } from "@/lib/branding";
import { BrandMark } from "@/components/brand-mark";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const brand = await getBranding();
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center bg-slate-50 px-4 py-10">
      <Link href="/" className="mb-6 text-slate-900">
        <BrandMark brand={brand} size="lg" nameClassName="text-lg font-semibold tracking-tight" />
      </Link>
      {children}
    </div>
  );
}
