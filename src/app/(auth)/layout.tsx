import Link from "next/link";
import { GraduationCap } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center bg-slate-50 px-4 py-10">
      <Link href="/" className="mb-6 flex items-center gap-2 text-slate-900">
        <span className="flex size-9 items-center justify-center rounded-lg bg-blue-600 text-white">
          <GraduationCap className="size-5" />
        </span>
        <span className="text-lg font-semibold tracking-tight">Coaching Institute LMS</span>
      </Link>
      {children}
    </div>
  );
}
