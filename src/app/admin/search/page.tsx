import type { Metadata } from "next";
import { requireAdminInstitute } from "@/lib/session";
import { adminSearch } from "@/lib/search";
import { SearchView } from "@/components/search-view";

export const metadata: Metadata = { title: "Search" };

export default async function AdminSearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { instituteId } = await requireAdminInstitute();
  const q = (await searchParams).q ?? "";
  const groups = q.trim().length >= 2 ? await adminSearch(q.trim(), instituteId) : [];
  return <SearchView action="/admin/search" q={q} groups={groups} />;
}
