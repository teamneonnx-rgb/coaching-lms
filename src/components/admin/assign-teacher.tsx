"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { assignBatchTeacher } from "@/lib/actions/admin/batches";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// FR-AD-10/11: batch → exactly one owning teacher; reassignment preserves history.
export function AssignTeacher({
  batchId,
  currentTeacherId,
  teachers,
  scheduleDays,
  scheduleTime,
  capacity,
}: {
  batchId: string;
  currentTeacherId: string | null;
  teachers: { id: string; name: string }[];
  scheduleDays: string | null;
  scheduleTime: string | null;
  capacity: number | null;
}) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [form, setForm] = useState({
    teacherId: currentTeacherId ?? "",
    scheduleDays: scheduleDays ?? "",
    scheduleTime: scheduleTime ?? "",
    capacity: capacity?.toString() ?? "",
  });

  function save() {
    start(async () => {
      const r = await assignBatchTeacher({
        batchId,
        teacherId: form.teacherId,
        scheduleDays: form.scheduleDays,
        scheduleTime: form.scheduleTime,
        capacity: form.capacity ? Number(form.capacity) : undefined,
      });
      if (r.ok) toast.success(r.info ?? "Saved");
      else toast.error(r.error ?? "Failed");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <div className="grid gap-1.5 lg:col-span-2">
        <Label>Owning teacher</Label>
        <Select value={form.teacherId} onValueChange={(v) => setForm((f) => ({ ...f, teacherId: v }))}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Select teacher" /></SelectTrigger>
          <SelectContent>
            {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label>Days</Label>
        <Input value={form.scheduleDays} onChange={(e) => setForm((f) => ({ ...f, scheduleDays: e.target.value }))} placeholder="Mon,Wed,Fri" />
      </div>
      <div className="grid gap-1.5">
        <Label>Time</Label>
        <Input value={form.scheduleTime} onChange={(e) => setForm((f) => ({ ...f, scheduleTime: e.target.value }))} placeholder="07:00-09:00" />
      </div>
      <div className="grid gap-1.5">
        <Label>Capacity</Label>
        <Input type="number" min={1} value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} placeholder="e.g. 40" />
      </div>
      <div className="sm:col-span-2 lg:col-span-5">
        <Button size="sm" onClick={save} disabled={isPending || !form.teacherId} className="bg-blue-600 text-white hover:bg-blue-600/90">
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <UserCheck className="size-4" />} Save assignment
        </Button>
      </div>
    </div>
  );
}
