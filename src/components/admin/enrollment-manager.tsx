"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Loader2, X, Users } from "lucide-react";
import { toast } from "sonner";
import { enrollStudents, unenrollStudent } from "@/lib/actions/admin/enrollment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/empty-state";

type Student = { id: string; name: string; email: string };

export function EnrollmentManager({
  batchId,
  enrolled,
  available,
}: {
  batchId: string;
  enrolled: Student[];
  available: Student[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);

  function remove(studentId: string) {
    setRemovingId(studentId);
    startTransition(async () => {
      const result = await unenrollStudent({ batchId, studentId });
      if (result.ok) {
        toast.success(result.info ?? "Removed");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed");
      }
      setRemovingId(null);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-900">Enrolled students ({enrolled.length})</p>
        <AddStudentsDialog batchId={batchId} available={available} />
      </div>

      {enrolled.length === 0 ? (
        <EmptyState icon={Users} title="No students enrolled" description="Add students to this batch." />
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {enrolled.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{s.name}</p>
                <p className="truncate text-xs text-muted-foreground">{s.email}</p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Remove"
                disabled={isPending}
                onClick={() => remove(s.id)}
              >
                {isPending && removingId === s.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <X className="size-4 text-destructive" />
                )}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AddStudentsDialog({ batchId, available }: { batchId: string; available: Student[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const filtered = available.filter(
    (s) =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.email.toLowerCase().includes(query.toLowerCase())
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submit() {
    startTransition(async () => {
      const result = await enrollStudents({ batchId, studentIds: [...selected] });
      if (result.ok) {
        toast.success(result.info ?? "Enrolled");
        setSelected(new Set());
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 text-white hover:bg-blue-600/90">
          <UserPlus className="size-4" /> Add students
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add students to batch</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Search students…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No unenrolled students found.
              </p>
            ) : (
              filtered.map((s) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-slate-100 px-3 py-2 hover:bg-slate-50"
                >
                  <Checkbox checked={selected.has(s.id)} onCheckedChange={() => toggle(s.id)} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-900">{s.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{s.email}</span>
                  </span>
                </label>
              ))
            )}
          </div>
          <Button
            onClick={submit}
            disabled={isPending || selected.size === 0}
            className="w-full bg-blue-600 text-white hover:bg-blue-600/90"
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Enroll {selected.size > 0 ? `(${selected.size})` : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
