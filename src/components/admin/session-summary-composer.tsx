"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { publishSessionSummary } from "@/lib/actions/admin/summaries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// FR-AD-41: per-day class session summary composer.
export function SessionSummaryComposer({ batches, today }: { batches: { id: string; name: string }[]; today: string }) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [form, setForm] = useState({ batchId: "", sessionDate: today, topicsCovered: "", homework: "", remarks: "" });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function publish() {
    start(async () => {
      const r = await publishSessionSummary(form);
      if (r.ok) {
        toast.success(r.info ?? "Published");
        setForm((f) => ({ ...f, topicsCovered: "", homework: "", remarks: "" }));
        router.refresh();
      } else {
        toast.error(r.error ?? "Failed");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Batch</Label>
          <Select value={form.batchId} onValueChange={(v) => set("batchId", v)}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Select batch" /></SelectTrigger>
            <SelectContent>
              {batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Session date</Label>
          <Input type="date" value={form.sessionDate} onChange={(e) => set("sessionDate", e.target.value)} />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label>Topics covered</Label>
        <Textarea rows={3} value={form.topicsCovered} onChange={(e) => set("topicsCovered", e.target.value)} placeholder="What was taught today?" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Homework</Label>
          <Textarea rows={2} value={form.homework} onChange={(e) => set("homework", e.target.value)} placeholder="Optional" />
        </div>
        <div className="grid gap-1.5">
          <Label>Remarks</Label>
          <Textarea rows={2} value={form.remarks} onChange={(e) => set("remarks", e.target.value)} placeholder="Optional" />
        </div>
      </div>
      <Button
        onClick={publish}
        disabled={isPending || !form.batchId || form.topicsCovered.trim().length < 3}
        className="bg-blue-600 text-white hover:bg-blue-600/90"
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Publish to parents
      </Button>
    </div>
  );
}
