"use client";

import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type BatchOption = { id: string; name: string };

// Drives the roster via URL search params so the roster itself stays server-rendered.
export function RosterSelector({
  batches,
  batchId,
  date,
}: {
  batches: BatchOption[];
  batchId: string;
  date: string;
}) {
  const router = useRouter();

  function update(next: { batchId?: string; date?: string }) {
    const params = new URLSearchParams();
    params.set("batchId", next.batchId ?? batchId);
    params.set("date", next.date ?? date);
    router.push(`/teacher/attendance?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="grid gap-1.5">
        <Label>Batch</Label>
        <Select value={batchId} onValueChange={(v) => update({ batchId: v })}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Select a batch" />
          </SelectTrigger>
          <SelectContent>
            {batches.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label>Date</Label>
        <Input
          type="date"
          value={date}
          className="w-full sm:w-44"
          onChange={(e) => update({ date: e.target.value })}
        />
      </div>
    </div>
  );
}
