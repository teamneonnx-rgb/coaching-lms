"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { validateAttendance } from "@/lib/actions/attendance";
import { Button } from "@/components/ui/button";
import { AttendanceStatusBadge } from "@/components/attendance/attendance-status-badge";
import type { AttendanceStatus } from "@prisma/client";

type Pending = {
  id: string;
  studentName: string;
  studentEmail: string;
  batchName: string;
  status: AttendanceStatus;
  date: string;
};

export function PendingValidations({ items }: { items: Pending[] }) {
  const [rows, setRows] = useState(items);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function validate(id: string) {
    setPendingId(id);
    startTransition(async () => {
      const result = await validateAttendance(id);
      if (result.ok) {
        toast.success(result.info ?? "Validated");
        setRows((prev) => prev.filter((r) => r.id !== id));
      } else {
        toast.error(result.error ?? "Failed");
      }
      setPendingId(null);
    });
  }

  if (rows.length === 0) return null;

  return (
    <ul className="divide-y divide-slate-100">
      {rows.map((r) => (
        <li key={r.id} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">{r.studentName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {r.batchName} · {r.date}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <AttendanceStatusBadge status={r.status} />
            <Button
              size="sm"
              onClick={() => validate(r.id)}
              disabled={isPending}
              className="bg-teal-600 text-white hover:bg-teal-600/90"
            >
              {isPending && pendingId === r.id ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Validate
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
