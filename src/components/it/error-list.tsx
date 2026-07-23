"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Check, RotateCcw, ChevronDown, User } from "lucide-react";
import { toast } from "sonner";
import { resolveError } from "@/lib/actions/it";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type ErrorRow = {
  id: string;
  occurredAt: string;
  affectedUserId: string | null;
  affectedRole: string | null;
  screenOrEndpoint: string | null;
  errorCode: string | null;
  errorMessage: string;
  stackTrace: string | null;
  requestPayloadRedacted: string | null;
  severity: string;
  resolvedFlag: boolean;
  resolutionNote: string | null;
};

const SEV_STYLE: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-amber-100 text-amber-700",
  HIGH: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700",
};

export function ErrorList({ rows }: { rows: ErrorRow[] }) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  function toggleResolve(row: ErrorRow) {
    start(async () => {
      const r = await resolveError({ id: row.id, resolved: !row.resolvedFlag, note });
      if (r.ok) {
        toast.success(r.info ?? "Done");
        setNote("");
        router.refresh();
      } else {
        toast.error(r.error ?? "Failed");
      }
    });
  }

  if (rows.length === 0) {
    return <p className="rounded-lg border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-muted-foreground">No errors match these filters. 🎉</p>;
  }

  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.id} className="rounded-lg border border-slate-200 bg-white">
          <div className="flex items-start justify-between gap-3 p-3">
            <button
              type="button"
              onClick={() => setOpenId(openId === row.id ? null : row.id)}
              className="min-w-0 flex-1 text-left"
            >
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${SEV_STYLE[row.severity] ?? ""}`}>{row.severity}</span>
                {row.affectedRole ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{row.affectedRole}</span> : null}
                {row.resolvedFlag ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">Resolved</span> : null}
                <span className="text-xs text-muted-foreground">{row.occurredAt}</span>
              </div>
              <p className="truncate text-sm font-medium text-slate-900">{row.errorMessage}</p>
              <p className="truncate text-xs text-muted-foreground">{row.screenOrEndpoint ?? "—"}</p>
            </button>
            <div className="flex shrink-0 items-center gap-1.5">
              {row.affectedUserId ? (
                <Button asChild size="icon-sm" variant="ghost" aria-label="User diagnostics">
                  <Link href={`/it/${row.affectedUserId}`}><User className="size-4" /></Link>
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                onClick={() => toggleResolve(row)}
                disabled={isPending}
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : row.resolvedFlag ? <RotateCcw className="size-4" /> : <Check className="size-4" />}
                {row.resolvedFlag ? "Reopen" : "Resolve"}
              </Button>
              <ChevronDown className={`size-4 text-slate-400 transition-transform ${openId === row.id ? "rotate-180" : ""}`} />
            </div>
          </div>

          {openId === row.id ? (
            <div className="space-y-3 border-t border-slate-100 p-3 text-xs">
              {row.errorCode ? <p><span className="font-medium text-slate-500">Code:</span> {row.errorCode}</p> : null}
              {row.requestPayloadRedacted ? (
                <div>
                  <p className="mb-1 font-medium text-slate-500">Request payload (redacted)</p>
                  <pre className="max-h-40 overflow-auto rounded bg-slate-50 p-2 text-[11px] text-slate-700">{row.requestPayloadRedacted}</pre>
                </div>
              ) : null}
              {row.stackTrace ? (
                <div>
                  <p className="mb-1 font-medium text-slate-500">Stack trace</p>
                  <pre className="max-h-56 overflow-auto rounded bg-slate-900 p-2 text-[11px] text-slate-200">{row.stackTrace}</pre>
                </div>
              ) : null}
              {row.resolutionNote ? <p><span className="font-medium text-slate-500">Resolution:</span> {row.resolutionNote}</p> : null}
              {!row.resolvedFlag ? (
                <Input placeholder="Resolution note (added when you resolve)" value={note} onChange={(e) => setNote(e.target.value)} className="h-8 text-xs" />
              ) : null}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
