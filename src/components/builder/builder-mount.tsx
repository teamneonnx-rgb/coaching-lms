"use client";

import dynamic from "next/dynamic";
import type { Block } from "@/lib/pages/types";
import { Skeleton } from "@/components/ui/skeleton";

// The editor (with @dnd-kit) is lazy-loaded and never SSR'd, so it stays out of
// every other route's bundle and avoids drag-hydration mismatches.
const PageEditor = dynamic(() => import("./page-editor").then((m) => m.PageEditor), {
  ssr: false,
  loading: () => (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <Skeleton className="h-8 w-48" />
      <div className="flex flex-1 gap-3">
        <Skeleton className="hidden h-full w-52 md:block" />
        <Skeleton className="h-full flex-1" />
        <Skeleton className="hidden h-full w-72 lg:block" />
      </div>
    </div>
  ),
});

export function BuilderMount({ page }: { page: { id: string; name: string; blocks: Block[] } }) {
  return <PageEditor page={page} />;
}
