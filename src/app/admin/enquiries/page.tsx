import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Inbox } from "lucide-react";
import { requireAdminArea } from "@/lib/session";
import { hasCapability } from "@/lib/capabilities";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { EnquiriesManager } from "@/components/admin/enquiries-manager";

export const metadata: Metadata = { title: "Enquiries" };

// FR-AD-25..28: enquiry pipeline — list, status flow, notes, convert-to-student,
// CSV export. Gated on ENQUIRY_VIEW; conversion also needs STUDENT_MANAGE.
export default async function AdminEnquiriesPage() {
  const user = await requireAdminArea();
  if (!(await hasCapability(user, "ENQUIRY_VIEW"))) redirect("/admin");
  const canConvert = await hasCapability(user, "STUDENT_MANAGE");

  const enquiries = await db.enquiry.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const counts = {
    NEW: enquiries.filter((e) => e.status === "NEW").length,
    CONTACTED: enquiries.filter((e) => e.status === "CONTACTED").length,
    CONVERTED: enquiries.filter((e) => e.status === "CONVERTED").length,
    LOST: enquiries.filter((e) => e.status === "LOST").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Enquiries</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {counts.NEW} new · {counts.CONTACTED} contacted · {counts.CONVERTED} converted · {counts.LOST} lost
        </p>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">All enquiries ({enquiries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {enquiries.length === 0 ? (
            <div className="space-y-4">
              <EmptyState icon={Inbox} title="No enquiries yet" description="Add walk-in / phone enquiries and track them to conversion." />
              <EnquiriesManager rows={[]} canConvert={canConvert} />
            </div>
          ) : (
            <EnquiriesManager
              rows={enquiries.map((e) => ({
                id: e.id,
                name: e.name,
                phone: e.phone,
                email: e.email,
                interestedCourse: e.interestedCourse,
                source: e.source,
                status: e.status,
                notes: e.notes,
                converted: !!e.convertedUserId,
                createdAt: e.createdAt.toISOString().slice(0, 10),
              }))}
              canConvert={canConvert}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
