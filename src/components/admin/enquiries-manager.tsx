"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Download, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { createEnquiry, updateEnquiry, convertEnquiry } from "@/lib/actions/admin/enquiries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export type EnquiryRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  interestedCourse: string | null;
  source: string | null;
  status: string;
  notes: string | null;
  converted: boolean;
  createdAt: string;
};

const STATUSES = ["NEW", "CONTACTED", "CONVERTED", "LOST"] as const;
const STATUS_STYLE: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700",
  CONTACTED: "bg-amber-100 text-amber-700",
  CONVERTED: "bg-green-100 text-green-700",
  LOST: "bg-slate-100 text-slate-600",
};

export function EnquiriesManager({ rows, canConvert }: { rows: EnquiryRow[]; canConvert: boolean }) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", interestedCourse: "", source: "", notes: "" });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function run(fn: () => Promise<{ ok: boolean; error?: string; info?: string; tempPassword?: string }>, after?: () => void) {
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(r.tempPassword ? `${r.info} — temp password: ${r.tempPassword}` : (r.info ?? "Done"), {
          duration: r.tempPassword ? 15000 : 4000,
        });
        after?.();
        router.refresh();
      } else {
        toast.error(r.error ?? "Failed");
      }
    });
  }

  // FR-AD-28: CSV export, generated client-side from the loaded rows.
  function exportCsv() {
    const esc = (v: string | null) => `"${(v ?? "").replaceAll('"', '""')}"`;
    const lines = [
      "Name,Phone,Email,Interested course,Source,Status,Notes,Created",
      ...rows.map((r) =>
        [esc(r.name), esc(r.phone), esc(r.email), esc(r.interestedCourse), esc(r.source), r.status, esc(r.notes), r.createdAt].join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `enquiries-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button size="sm" variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
          <Download className="size-4" /> Export CSV
        </Button>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-600/90">
              <Plus className="size-4" /> Add enquiry
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Add enquiry</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid gap-1.5"><Label>Name</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></div>
                <div className="grid gap-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5"><Label>Interested course</Label><Input value={form.interestedCourse} onChange={(e) => set("interestedCourse", e.target.value)} /></div>
                <div className="grid gap-1.5"><Label>Source</Label><Input value={form.source} onChange={(e) => set("source", e.target.value)} placeholder="walk-in / call / referral" /></div>
              </div>
              <div className="grid gap-1.5"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div>
              <Button
                className="w-full bg-blue-600 text-white hover:bg-blue-600/90"
                disabled={isPending || form.name.trim().length < 2}
                onClick={() =>
                  run(() => createEnquiry(form), () => {
                    setAddOpen(false);
                    setForm({ name: "", phone: "", email: "", interestedCourse: "", source: "", notes: "" });
                  })
                }
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null} Add
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contact</TableHead>
              <TableHead>Interested in</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <p className="font-medium text-slate-900">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{[r.phone, r.email].filter(Boolean).join(" · ") || "—"}</p>
                </TableCell>
                <TableCell className="text-slate-600">{r.interestedCourse ?? "—"}</TableCell>
                <TableCell className="text-slate-600">{r.source ?? "—"}</TableCell>
                <TableCell>
                  {r.converted ? (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE.CONVERTED}`}>CONVERTED</span>
                  ) : (
                    <Select
                      defaultValue={r.status}
                      onValueChange={(v) => run(() => updateEnquiry({ id: r.id, status: v, notes: r.notes ?? "" }))}
                      disabled={isPending}
                    >
                      <SelectTrigger className={`h-7 w-32 text-xs ${STATUS_STYLE[r.status] ?? ""}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.filter((s) => s !== "CONVERTED").map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>
                <TableCell className="max-w-48 truncate text-xs text-muted-foreground">{r.notes ?? "—"}</TableCell>
                <TableCell>
                  {!r.converted && canConvert ? (
                    <Button size="sm" variant="outline" disabled={isPending} onClick={() => run(() => convertEnquiry(r.id))}>
                      <UserPlus className="size-4" /> Convert
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
