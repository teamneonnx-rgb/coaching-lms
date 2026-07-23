import type { Metadata } from "next";
import { requireAdminArea } from "@/lib/session";
import { adminSearch } from "@/lib/search";
import { SearchView } from "@/components/search-view";

export const metadata: Metadata = { title: "Search" };

export default async function AdminSearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdminArea();
  const q = (await searchParams).q ?? "";
  const groups = q.trim().length >= 2 ? await adminSearch(q.trim()) : [];
  return <SearchView action="/admin/search" q={q} groups={groups} />;
}
