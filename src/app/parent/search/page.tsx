import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { parentSearch } from "@/lib/search";
import { SearchView } from "@/components/search-view";

export const metadata: Metadata = { title: "Search" };

export default async function ParentSearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const parent = await requireRole("PARENT");
  const q = (await searchParams).q ?? "";
  const groups = q.trim().length >= 2 ? await parentSearch(parent.id, q.trim()) : [];
  return <SearchView action="/parent/search" q={q} groups={groups} />;
}
