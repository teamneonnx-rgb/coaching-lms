import Link from "next/link";
import { Search } from "lucide-react";
import type { SearchGroup } from "@/lib/search";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";

// Shared, server-rendered search UI. The form submits ?q= back to the same
// route; results are already scoped to the caller's role by the query layer.
export function SearchView({
  action,
  q,
  groups,
}: {
  action: string;
  q: string;
  groups: SearchGroup[];
}) {
  const total = groups.reduce((a, g) => a + g.items.length, 0);
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Search</h1>
        <p className="mt-1 text-sm text-muted-foreground">Scoped to what you&apos;re allowed to see.</p>
      </div>

      <form action={action} method="get" className="mb-6 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            name="q"
            defaultValue={q}
            autoFocus
            placeholder="Search…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-400"
          />
        </div>
        <button type="submit" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800/90">
          Search
        </button>
      </form>

      {q.trim().length === 0 ? (
        <EmptyState icon={Search} title="Type to search" description="Results appear grouped by type." />
      ) : total === 0 ? (
        <EmptyState icon={Search} title="No matches" description={`Nothing found for “${q}”.`} />
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.label}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.label}</p>
              <Card className="border-slate-200">
                <CardContent className="divide-y divide-slate-100 p-0">
                  {g.items.map((item, i) => {
                    const body = (
                      <div className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-sm font-medium text-slate-900">{item.title}</span>
                        {item.subtitle ? <span className="text-xs text-muted-foreground">{item.subtitle}</span> : null}
                      </div>
                    );
                    return item.href ? (
                      <Link key={i} href={item.href} className="block hover:bg-slate-50">{body}</Link>
                    ) : (
                      <div key={i}>{body}</div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
