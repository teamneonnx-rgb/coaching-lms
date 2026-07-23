import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/session";
import { getUserDiagnostics } from "@/lib/it";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorList } from "@/components/it/error-list";

export const metadata: Metadata = { title: "User diagnostics" };

// FR-IT-04: open a specific user's profile in diagnostic mode — the errors that
// occurred inside that profile. Read-only.
export default async function ItUserDiagnosticPage({ params }: { params: Promise<{ userId: string }> }) {
  await requireRole("IT");
  const { userId } = await params;
  const { user, errors } = await getUserDiagnostics(userId);
  if (!user) notFound();

  return (
    <div className="space-y-6">
      <Link href="/it" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-slate-900">
        <ArrowLeft className="size-4" /> Back to dashboard
      </Link>

      <Card className="border-slate-200">
        <CardHeader><CardTitle className="text-base">{user.name}</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {user.email} · {user.role} · {user.status}
          {user.lastLoginAt ? ` · last login ${user.lastLoginAt.toISOString().slice(0, 10)}` : ""}
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader><CardTitle className="text-base">Errors in this profile ({errors.length})</CardTitle></CardHeader>
        <CardContent>
          <ErrorList
            rows={errors.map((l) => ({
              id: l.id,
              occurredAt: l.occurredAt.toISOString().slice(0, 19).replace("T", " "),
              affectedUserId: l.affectedUserId,
              affectedRole: l.affectedRole,
              screenOrEndpoint: l.screenOrEndpoint,
              errorCode: l.errorCode,
              errorMessage: l.errorMessage,
              stackTrace: l.stackTrace,
              requestPayloadRedacted: l.requestPayloadRedacted,
              severity: l.severity,
              resolvedFlag: l.resolvedFlag,
              resolutionNote: l.resolutionNote,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
