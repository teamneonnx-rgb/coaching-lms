"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createAssignment } from "@/lib/actions/assignments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AssignmentFormDialog({ courses }: { courses: { id: string; label: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    title: "",
    instructions: "",
    courseId: "",
    dueDate: "",
    totalMarks: "100",
    allowLate: true,
    submissionType: "BOTH" as "FILE" | "TEXT" | "BOTH",
  });

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  function submit() {
    startTransition(async () => {
      const r = await createAssignment({ ...form, totalMarks: Number(form.totalMarks) });
      if (r.ok) {
        toast.success("Assignment created");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(r.error ?? "Failed");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-teal-600 text-white hover:bg-teal-600/90" disabled={courses.length === 0}>
          <Plus className="size-4" /> New assignment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New assignment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-1.5">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Chapter 3 problems" />
          </div>
          <div className="grid gap-1.5">
            <Label>Instructions</Label>
            <Textarea rows={3} value={form.instructions} onChange={(e) => set("instructions", e.target.value)} placeholder="Optional" />
          </div>
          <div className="grid gap-1.5">
            <Label>Course</Label>
            <Select value={form.courseId} onValueChange={(v) => set("courseId", v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select a course" /></SelectTrigger>
              <SelectContent>
                {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Due date</Label>
              <Input type="datetime-local" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Total marks</Label>
              <Input type="number" min={1} value={form.totalMarks} onChange={(e) => set("totalMarks", e.target.value)} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Submission type</Label>
            <Select value={form.submissionType} onValueChange={(v) => set("submissionType", v)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BOTH">File &amp; text</SelectItem>
                <SelectItem value="FILE">File only</SelectItem>
                <SelectItem value="TEXT">Text only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2">
            <Checkbox checked={form.allowLate} onCheckedChange={(v) => set("allowLate", v === true)} />
            <span className="text-sm">Allow late submissions</span>
          </label>
          <Button onClick={submit} disabled={isPending || form.title.trim().length < 2 || !form.courseId} className="w-full bg-teal-600 text-white hover:bg-teal-600/90">
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Create
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
