"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, IndianRupee, BellRing } from "lucide-react";
import { toast } from "sonner";
import { createFeeDemand, recordPayment, sendFeeReminders } from "@/lib/actions/admin/payments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export type FeeRow = {
  id: string;
  studentName: string;
  studentEmail: string;
  title: string;
  amountDue: number;
  amountPaid: number;
  dueDate: string | null;
  status: string;
  receiptNo: string | null;
  mode: string | null;
};

const STATUS_STYLE: Record<string, string> = {
  PAID: "bg-green-100 text-green-700",
  PARTIAL: "bg-amber-100 text-amber-700",
  PENDING: "bg-slate-100 text-slate-600",
  OVERDUE: "bg-red-100 text-red-700",
};

export function PaymentsManager({
  rows,
  students,
  canCollect,
  canNotify,
}: {
  rows: FeeRow[];
  students: { id: string; name: string }[];
  canCollect: boolean;
  canNotify: boolean;
}) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [demandOpen, setDemandOpen] = useState(false);
  const [demand, setDemand] = useState({ studentId: "", title: "", amountDue: "", dueDate: "" });
  const [recordFor, setRecordFor] = useState<FeeRow | null>(null);
  const [record, setRecord] = useState({ amount: "", mode: "CASH" as string });

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {canNotify ? (
            <>
              <Button size="sm" variant="outline" disabled={isPending}
                onClick={() => run(() => sendFeeReminders({ scope: "overdue" }))}>
                <BellRing className="size-4" /> Remind overdue
              </Button>
              <Button size="sm" variant="outline" disabled={isPending}
                onClick={() => run(() => sendFeeReminders({ scope: "all_pending" }))}>
                <BellRing className="size-4" /> Remind all pending
              </Button>
            </>
          ) : null}
        </div>
        {canCollect ? (
          <Dialog open={demandOpen} onOpenChange={setDemandOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-600/90">
                <Plus className="size-4" /> New fee demand
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>New fee demand</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-1.5">
                  <Label>Student</Label>
                  <Select value={demand.studentId} onValueChange={(v) => setDemand((d) => ({ ...d, studentId: v }))}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select student" /></SelectTrigger>
                    <SelectContent>
                      {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Fee title</Label>
                  <Input value={demand.title} onChange={(e) => setDemand((d) => ({ ...d, title: e.target.value }))} placeholder="e.g. Term 1 tuition fee" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>Amount (₹)</Label>
                    <Input type="number" min={1} value={demand.amountDue} onChange={(e) => setDemand((d) => ({ ...d, amountDue: e.target.value }))} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Due date</Label>
                    <Input type="date" value={demand.dueDate} onChange={(e) => setDemand((d) => ({ ...d, dueDate: e.target.value }))} />
                  </div>
                </div>
                <Button
                  className="w-full bg-blue-600 text-white hover:bg-blue-600/90"
                  disabled={isPending || !demand.studentId || demand.title.trim().length < 2 || !demand.amountDue}
                  onClick={() =>
                    run(() => createFeeDemand(demand), () => {
                      setDemandOpen(false);
                      setDemand({ studentId: "", title: "", amountDue: "", dueDate: "" });
                    })
                  }
                >
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : null} Create
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Fee</TableHead>
              <TableHead className="text-right">Due</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead>Due date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Receipt</TableHead>
              {canCollect ? <TableHead /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <p className="font-medium text-slate-900">{r.studentName}</p>
                  <p className="text-xs text-muted-foreground">{r.studentEmail}</p>
                </TableCell>
                <TableCell className="text-slate-700">{r.title}</TableCell>
                <TableCell className="text-right text-slate-700">₹{r.amountDue}</TableCell>
                <TableCell className="text-right text-slate-700">₹{r.amountPaid}</TableCell>
                <TableCell className="text-slate-600">{r.dueDate ?? "—"}</TableCell>
                <TableCell>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[r.status] ?? ""}`}>
                    {r.status}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {r.receiptNo ?? "—"}{r.mode ? ` · ${r.mode}` : ""}
                </TableCell>
                {canCollect ? (
                  <TableCell>
                    {r.status !== "PAID" ? (
                      <Button size="sm" variant="outline" onClick={() => { setRecordFor(r); setRecord({ amount: String(r.amountDue - r.amountPaid), mode: "CASH" }); }}>
                        <IndianRupee className="size-4" /> Record
                      </Button>
                    ) : null}
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Record payment dialog (FR-AD-18) */}
      <Dialog open={!!recordFor} onOpenChange={(v) => !v && setRecordFor(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Record payment — {recordFor?.studentName}</DialogTitle>
          </DialogHeader>
          {recordFor ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {recordFor.title}: ₹{recordFor.amountDue - recordFor.amountPaid} outstanding
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Amount (₹)</Label>
                  <Input type="number" min={1} value={record.amount} onChange={(e) => setRecord((x) => ({ ...x, amount: e.target.value }))} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Mode</Label>
                  <Select value={record.mode} onValueChange={(v) => setRecord((x) => ({ ...x, mode: v }))}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["CASH", "ONLINE", "CHEQUE", "UPI"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                className="w-full bg-blue-600 text-white hover:bg-blue-600/90"
                disabled={isPending || !record.amount}
                onClick={() =>
                  run(() => recordPayment({ paymentId: recordFor.id, amount: Number(record.amount), mode: record.mode }), () => setRecordFor(null))
                }
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null} Record &amp; issue receipt
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
