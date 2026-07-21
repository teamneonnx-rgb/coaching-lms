import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-slate-50 px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-xl bg-blue-600 text-white">
          <GraduationCap className="size-8" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Coaching Institute LMS
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Batches, courses, assessments, attendance, and notifications — one
          platform for admins, teachers, and students.
        </p>
      </div>
      <Button asChild size="lg" className="bg-blue-600 text-white hover:bg-blue-600/90">
        <Link href="/login">Sign in</Link>
      </Button>
    </main>
  );
}
