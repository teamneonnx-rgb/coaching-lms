import type { Metadata } from "next";
import { IndianRupee } from "lucide-react";
import { requireRole } from "@/lib/session";
import { getStudentPayments, computeStatus } from "@/lib/payments";
import { getRazorpayConfig } from "@/lib/razorpay";
import { formatDate } from "@/lib/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { RazorpayPayButton } from "@/components/student/razorpay-pay-button";

export const metadata: Metadata = { title: "Fees" };

const STATUS_STYLE: Record<string, string> = {
  PAID: "bg-green-100 text-green-700",
  PARTIAL: "bg-amber-100 text-amber-700",
  PENDING: "bg-slate-100 text-slate-600",
  OVERDUE: "bg-red-100 text-red-700",
};

// Student fee view: outstanding + history; "Pay online" appears only when the
// admin has enabled Razorpay in the Control Center.
export default async function StudentFeesPage() {
  const user = await requireRole("STUDENT");
  const [payments, razorpay] = await Promise.all([
    getStudentPayments(user.id),
    getRazorpayConfig(),
  ]);
  const onlineEnabled = !!razorpay;

  const totalOutstanding = payments.reduce((a, p) => a + Math.max(p.amountDue - p.amountPaid, 0), 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Fees</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {totalOutstanding > 0 ? `₹${totalOutstanding} outstanding` : "All settled 🎉"}
        </p>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">My fee records</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <EmptyState icon={IndianRupee} title="No fees yet" description="Fee demands from your institute will appear here." />
          ) : (
            <ul className="space-y-3">
              {payments.map((p) => {
                const status = computeStatus(p);
                const outstanding = Math.max(p.amountDue - p.amountPaid, 0);
                return (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{p.title}</p>
                      <p className="text-xs text-muted-foreground">
                        ₹{p.amountPaid}/{p.amountDue} paid
                        {p.dueDate ? ` · due ${formatDate(p.dueDate)}` : ""}
                        {p.receiptNo ? ` · receipt ${p.receiptNo}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}>
                        {status}
                      </span>
                      {onlineEnabled && outstanding > 0 ? (
                        <RazorpayPayButton paymentId={p.id} label={p.title} />
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {!onlineEnabled && totalOutstanding > 0 ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Online payment isn&apos;t enabled yet — pay at the institute office to get a receipt.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
