"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { askDoubt } from "@/lib/actions/discussion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export function AskDoubtDialog({ courses }: { courses: { id: string; title: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, start] = useTransition();
  const [form, setForm] = useState({ courseId: "", title: "", body: "" });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function submit() {
    start(async () => {
      const r = await askDoubt(form);
      if (r.ok) {
        toast.success(r.info ?? "Posted");
        setOpen(false);
        setForm({ courseId: "", title: "", body: "" });
        router.refresh();
      } else {
        toast.error(r.error ?? "Failed");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-orange-500 text-white hover:bg-orange-500/90" disabled={courses.length === 0}>
          <Plus className="size-4" /> Ask a doubt
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ask a doubt</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-1.5">
            <Label>Course</Label>
            <Select value={form.courseId} onValueChange={(v) => set("courseId", v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select a course" /></SelectTrigger>
              <SelectContent>
                {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Doubt in Newton's 3rd law" />
          </div>
          <div className="grid gap-1.5">
            <Label>Details</Label>
            <Textarea rows={4} value={form.body} onChange={(e) => set("body", e.target.value)} placeholder="Describe your doubt…" />
          </div>
          <Button
            onClick={submit}
            disabled={isPending || !form.courseId || form.title.trim().length < 3 || form.body.trim().length < 3}
            className="w-full bg-orange-500 text-white hover:bg-orange-500/90"
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null} Post doubt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
