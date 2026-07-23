"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { approveAttendance, approveBatchDay, amendAttendance } from "@/lib/actions/admin/attendance";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export type QueueRow = {
  id: string;
  name: string;
  role: string;
  status: string;
  date: string; // yyyy-mm-dd
  dateLabel: string;
  batchId: string | null;
  batchName: string | null;
};

const STATUSES = ["PRESENT", "ABSENT", "LATE", "ON_LEAVE"] as const;

// FR-AD-49: single approval queue, grouped by date, split teacher/student,
// with one-action approval for a full batch-day.
export function AttendanceApprovalQueue({ rows }: { rows: QueueRow[] }) {
  const router = useRouter();
  const [isPending, start] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string; info?: string }>) {
    start(async () => {
      const r = await fn();
      if (r.ok) toast.success(r.info ?? "Done");
      else toast.error(r.error ?? "Failed");
      router.refresh();
    });
  }

  const teacherRows = rows.filter((r) => r.role === "TEACHER");
  const studentRows = rows.filter((r) => r.role !== "TEACHER");

  // Group student rows into batch-days.
  const groups = new Map<string, { batchId: string; batchName: string; date: string; dateLabel: string; items: QueueRow[] }>();
  for (const r of studentRows) {
    const key = `${r.batchId}|${r.date}`;
    if (!groups.has(key)) {
      groups.set(key, { batchId: r.batchId ?? "", batchName: r.batchName ?? "—", date: r.date, dateLabel: r.dateLabel, items: [] });
    }
    groups.get(key)!.items.push(r);
  }

  if (rows.length === 0) {
    return <p className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-muted-foreground">Nothing awaiting approval.</p>;
  }

  return (
    <div className="space-y-6">
      {teacherRows.length > 0 ? (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-900">Teacher attendance</h3>
          <ul className="space-y-2">
            {teacherRows.map((r) => (
              <Row key={r.id} row={r} disabled={isPending} onAmend={(s) => run(() => amendAttendance({ id: r.id, status: s }))} onApprove={() => run(() => approveAttendance([r.id]))} />
            ))}
          </ul>
        </div>
      ) : null}

      {[...groups.values()].map((g) => (
        <div key={`${g.batchId}|${g.date}`}>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              {g.batchName} · {g.dateLabel}
              <span className="ml-2 text-xs font-normal text-muted-foreground">{g.items.length} student(s)</span>
            </h3>
            <Button
              size="sm"
              onClick={() => run(() => approveBatchDay(g.batchId, g.date))}
              disabled={isPending}
              className="bg-blue-600 text-white hover:bg-blue-600/90"
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCheck className="size-4" />}
              Approve batch-day
            </Button>
          </div>
          <ul className="space-y-2">
            {g.items.map((r) => (
              <Row key={r.id} row={r} disabled={isPending} onAmend={(s) => run(() => amendAttendance({ id: r.id, status: s }))} onApprove={() => run(() => approveAttendance([r.id]))} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Row({
  row, disabled, onAmend, onApprove,
}: {
  row: QueueRow;
  disabled: boolean;
  onAmend: (status: (typeof STATUSES)[number]) => void;
  onApprove: () => void;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-900">{row.name}</p>
        <p className="text-xs text-muted-foreground">
          {row.role === "TEACHER" ? `Teacher · ${row.dateLabel}` : row.batchName}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {/* FR-AD-48: correct the value before approving */}
        <Select defaultValue={row.status} onValueChange={(v) => onAmend(v as (typeof STATUSES)[number])} disabled={disabled}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={onApprove} disabled={disabled}>
          <Check className="size-4" /> Approve
        </Button>
      </div>
    </li>
  );
}
