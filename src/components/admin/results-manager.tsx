"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Megaphone, Check } from "lucide-react";
import { toast } from "sonner";
import { enterBatchResults, publishExam, updateResult } from "@/lib/actions/admin/results";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export type BatchRoster = { id: string; name: string; students: { id: string; name: string }[] };
export type ExamGroup = {
  batchId: string;
  batchName: string;
  examName: string;
  published: boolean;
  rows: { id: string; studentName: string; marksObtained: number; maxMarks: number; grade: string | null }[];
};

export function ResultsManager({ batches, examGroups }: { batches: BatchRoster[]; examGroups: ExamGroup[] }) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [form, setForm] = useState({ batchId: "", examName: "", subject: "", examDate: "", maxMarks: "100" });
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [edits, setEdits] = useState<Record<string, string>>({});

  const roster = batches.find((b) => b.id === form.batchId)?.students ?? [];

  function run(fn: () => Promise<{ ok: boolean; error?: string; info?: string }>, after?: () => void) {
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(r.info ?? "Done");
        after?.();
        router.refresh();
      } else {
        toast.error(r.error ?? "Failed");
      }
    });
  }

  function saveSheet() {
    const rows = roster
      .filter((s) => marks[s.id] !== undefined && marks[s.id] !== "")
      .map((s) => ({ studentId: s.id, marks: Number(marks[s.id]) }));
    run(
      () => enterBatchResults({ ...form, maxMarks: Number(form.maxMarks), rows }),
      () => setMarks({})
    );
  }

  return (
    <div className="space-y-6">
      {/* FR-AD-52/53: marks-sheet entry for a full batch */}
      <Card className="border-slate-200">
        <CardHeader><CardTitle className="text-base">Enter results (batch marks sheet)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="grid gap-1.5">
              <Label>Batch</Label>
              <Select value={form.batchId} onValueChange={(v) => setForm((f) => ({ ...f, batchId: v }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select batch" /></SelectTrigger>
                <SelectContent>
                  {batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5"><Label>Exam name</Label><Input value={form.examName} onChange={(e) => setForm((f) => ({ ...f, examName: e.target.value }))} placeholder="e.g. Unit Test 1" /></div>
            <div className="grid gap-1.5"><Label>Subject</Label><Input value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} placeholder="Optional" /></div>
            <div className="grid gap-1.5"><Label>Exam date</Label><Input type="date" value={form.examDate} onChange={(e) => setForm((f) => ({ ...f, examDate: e.target.value }))} /></div>
            <div className="grid gap-1.5"><Label>Max marks</Label><Input type="number" min={1} value={form.maxMarks} onChange={(e) => setForm((f) => ({ ...f, maxMarks: e.target.value }))} /></div>
          </div>

          {roster.length > 0 ? (
            <>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {roster.map((s) => (
                  <label key={s.id} className="flex items-center justify-between gap-2 rounded-md border border-slate-200 px-3 py-2">
                    <span className="truncate text-sm text-slate-900">{s.name}</span>
                    <Input
                      type="number" min={0}
                      className="h-8 w-20 text-right"
                      value={marks[s.id] ?? ""}
                      onChange={(e) => setMarks((m) => ({ ...m, [s.id]: e.target.value }))}
                      placeholder="—"
                    />
                  </label>
                ))}
              </div>
              <Button
                onClick={saveSheet}
                disabled={isPending || form.examName.trim().length < 2 || !Object.values(marks).some((v) => v !== "")}
                className="bg-blue-600 text-white hover:bg-blue-600/90"
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save sheet (unpublished)
              </Button>
            </>
          ) : form.batchId ? (
            <p className="text-sm text-muted-foreground">No active students in this batch.</p>
          ) : null}
        </CardContent>
      </Card>

      {/* FR-AD-54/55: exams with publish + edit */}
      {examGroups.map((g) => (
        <Card key={`${g.batchId}|${g.examName}`} className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">
              {g.examName} <span className="text-xs font-normal text-muted-foreground">· {g.batchName}</span>
              <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${g.published ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                {g.published ? "Published" : "Unpublished"}
              </span>
            </CardTitle>
            {!g.published ? (
              <Button
                size="sm"
                onClick={() => run(() => publishExam({ batchId: g.batchId, examName: g.examName }))}
                disabled={isPending}
                className="bg-green-600 text-white hover:bg-green-600/90"
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : <Megaphone className="size-4" />} Publish
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {g.rows.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 rounded-md border border-slate-100 px-3 py-1.5 text-sm">
                  <span className="text-slate-900">{r.studentName}</span>
                  <span className="flex items-center gap-2">
                    <Input
                      type="number" min={0} max={r.maxMarks}
                      className="h-7 w-20 text-right text-xs"
                      value={edits[r.id] ?? String(r.marksObtained)}
                      onChange={(e) => setEdits((x) => ({ ...x, [r.id]: e.target.value }))}
                    />
                    <span className="text-xs text-muted-foreground">/ {r.maxMarks}{r.grade ? ` · ${r.grade}` : ""}</span>
                    {edits[r.id] !== undefined && edits[r.id] !== String(r.marksObtained) ? (
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={isPending}
                        onClick={() => run(() => updateResult({ id: r.id, marksObtained: Number(edits[r.id]) }), () => setEdits((x) => { const y = { ...x }; delete y[r.id]; return y; }))}>
                        <Check className="size-3.5" /> Save
                      </Button>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
