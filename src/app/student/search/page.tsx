import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { studentSearch } from "@/lib/search";
import { SearchView } from "@/components/search-view";

export const metadata: Metadata = { title: "Search" };

export default async function StudentSearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const student = await requireRole("STUDENT");
  const q = (await searchParams).q ?? "";
  const groups = q.trim().length >= 2 ? await studentSearch(student.id, q.trim()) : [];
  return (
    <div className="p-4 lg:p-8">
      <SearchView action="/student/search" q={q} groups={groups} />
    </div>
  );
}
