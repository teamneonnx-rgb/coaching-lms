"use client";

import { useState, useTransition } from "react";
import { Check, Clock, X, Plane, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { AttendanceStatus } from "@prisma/client";
import { markMyAttendance } from "@/lib/actions/attendance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AttendanceStatusBadge } from "@/components/attendance/attendance-status-badge";

const OPTIONS: { status: AttendanceStatus; label: string; icon: typeof Check; active: string }[] = [
  { status: "PRESENT", label: "Present", icon: Check, active: "bg-green-600 text-white hover:bg-green-600/90" },
  { status: "LATE", label: "Late", icon: Clock, active: "bg-amber-500 text-white hover:bg-amber-500/90" },
  { status: "ON_LEAVE", label: "On leave", icon: Plane, active: "bg-slate-600 text-white hover:bg-slate-600/90" },
  { status: "ABSENT", label: "Absent", icon: X, active: "bg-red-600 text-white hover:bg-red-600/90" },
];

export function SelfAttendanceCard({
  currentStatus,
  accent = "orange",
}: {
  currentStatus: AttendanceStatus | null;
  accent?: "orange" | "teal";
}) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<AttendanceStatus | null>(currentStatus);
  const [pendingStatus, setPendingStatus] = useState<AttendanceStatus | null>(null);

  function mark(next: AttendanceStatus) {
    setPendingStatus(next);
    startTransition(async () => {
      const result = await markMyAttendance({ status: next });
      if (result.ok) {
        setStatus(next);
        toast.success(result.info ?? "Attendance marked");
      } else {
        toast.error(result.error ?? "Could not mark attendance");
      }
      setPendingStatus(null);
    });
  }

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Today&apos;s attendance</CardTitle>
        {status ? <AttendanceStatusBadge status={status} /> : null}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {OPTIONS.map((o) => {
            const isActive = status === o.status;
            const isLoading = isPending && pendingStatus === o.status;
            return (
              <Button
                key={o.status}
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => mark(o.status)}
                className={isActive ? o.active : ""}
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <o.icon className="size-4" />
                )}
                {o.label}
              </Button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {accent === "teal"
            ? "Marking your attendance notifies the admin team."
            : "Marking your attendance notifies your parent/guardian."}
        </p>
      </CardContent>
    </Card>
  );
}
