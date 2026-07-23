import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { IndianRupee, AlertTriangle, Wallet, Layers } from "lucide-react";
import { requireAdminArea } from "@/lib/session";
import { hasCapability } from "@/lib/capabilities";
import { db } from "@/lib/db";
import { getAllPayments, getPaymentsDashboard } from "@/lib/payments";
import { toDateInput } from "@/lib/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { PaymentsManager } from "@/components/admin/payments-manager";

export const metadata: Metadata = { title: "Payments" };

// FR-AD-17..21: payments dashboard + per-student fee records + reminders.
export default async function AdminPaymentsPage() {
  const user = await requireAdminArea();
  const canView = await hasCapability(user, "PAYMENT_VIEW");
  const canCollect = await hasCapability(user, "PAYMENT_COLLECT");
  const canNotify = await hasCapability(user, "PAYMENT_NOTIFY");
  if (!canView && !canCollect) redirect("/admin");

  const [dash, payments, students] = await Promise.all([
    getPaymentsDashboard(),
    getAllPayments(),
    db.user.findMany({
      where: { role: "STUDENT", deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const kpis = [
    { icon: IndianRupee, label: "Collected this month", value: `₹${dash.collectedThisMonth}` },
    { icon: Wallet, label: "Pending total", value: `₹${dash.pendingTotal}` },
    { icon: AlertTriangle, label: "Overdue fees", value: String(dash.overdueCount) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Payments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fee demands, collections and reminders. Overdue is flagged automatically.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {kpis.map((k) => (
          <Card key={k.label} className="border-slate-200">
            <CardContent className="flex items-center gap-3 p-4">
              <span className="flex size-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <k.icon className="size-5" />
              </span>
              <div>
                <p className="text-xl font-semibold text-slate-900">{k.value}</p>
                <p className="text-xs text-muted-foreground">{k.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="size-4 text-blue-600" /> Batch-wise collection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch</TableHead>
                  <TableHead className="text-right">Billed</TableHead>
                  <TableHead className="text-right">Collected</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dash.perBatch.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium text-slate-900">{b.name}</TableCell>
                    <TableCell className="text-right text-slate-600">₹{b.due}</TableCell>
                    <TableCell className="text-right text-slate-600">₹{b.paid}</TableCell>
                    <TableCell className="text-right text-slate-600">₹{b.pending}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Fee records ({payments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 && !canCollect ? (
            <EmptyState icon={IndianRupee} title="No fee records yet" />
          ) : (
            <PaymentsManager
              rows={payments.map((p) => ({
                id: p.id,
                studentName: p.student.name ?? "Student",
                studentEmail: p.student.email,
                title: p.title,
                amountDue: p.amountDue,
                amountPaid: p.amountPaid,
                dueDate: p.dueDate ? toDateInput(p.dueDate) : null,
                status: p.status,
                receiptNo: p.receiptNo,
                mode: p.mode,
              }))}
              students={students.map((s) => ({ id: s.id, name: s.name ?? "Student" }))}
              canCollect={canCollect}
              canNotify={canNotify}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
