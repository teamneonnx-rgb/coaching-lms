"use client";

import Link from "next/link";
import { Search } from "lucide-react";

// Top-bar search: a full input on sm+ screens (submits ?q= to the role's search
// page), collapsing to a single icon-button on mobile so it never crowds the
// hamburger + brand. Server-rendered results still live on the search route —
// this is just the always-reachable entry point beside the notification bell.
export function HeaderSearch({
  action,
  placeholder = "Search…",
}: {
  action: string;
  placeholder?: string;
}) {
  return (
    <>
      <form action={action} method="get" role="search" className="relative hidden sm:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          name="q"
          placeholder={placeholder}
          aria-label="Search"
          className="w-48 rounded-full border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100 md:w-64"
        />
        <button type="submit" className="sr-only">Search</button>
      </form>
      <Link
        href={action}
        aria-label="Search"
        className="flex size-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 sm:hidden"
      >
        <Search className="size-4" />
      </Link>
    </>
  );
}
