import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { teacherSearch } from "@/lib/search";
import { SearchView } from "@/components/search-view";

export const metadata: Metadata = { title: "Search" };

export default async function TeacherSearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const teacher = await requireRole("TEACHER");
  const q = (await searchParams).q ?? "";
  const groups = q.trim().length >= 2 ? await teacherSearch(teacher.id, q.trim()) : [];
  return <SearchView action="/teacher/search" q={q} groups={groups} />;
}
