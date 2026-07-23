import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Bug, ShieldCheck } from "lucide-react";
import { requireRole } from "@/lib/session";
import { getErrorLogs, getErrorStats, type ErrorFilter } from "@/lib/it";
import type { ErrorSeverity } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorList } from "@/components/it/error-list";

export const metadata: Metadata = { title: "IT Diagnostics" };

const ROLES = ["SUPER_ADMIN", "ADMIN", "IT", "TEACHER", "STUDENT", "PARENT"];
const SEVERITIES: ErrorSeverity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

// FR-IT-01/02/03: error dashboard across all role profiles, filterable by role,
// severity and resolved status (query-param filters).
export default async function ItDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; severity?: string; resolved?: string }>;
}) {
  await requireRole("IT");
  const sp = await searchParams;

  const filter: ErrorFilter = {
    role: sp.role || undefined,
    severity: (SEVERITIES.includes(sp.severity as ErrorSeverity) ? sp.severity : undefined) as ErrorSeverity | undefined,
    resolved: sp.resolved === "resolved" || sp.resolved === "unresolved" ? (sp.resolved as "resolved" | "unresolved") : undefined,
  };

  const [stats, logs] = await Promise.all([getErrorStats(), getErrorLogs(filter)]);

  // Build filter chips as links preserving the other params.
  const qs = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { role: filter.role, severity: filter.severity, resolved: filter.resolved, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, String(v));
    const s = params.toString();
    return s ? `/it?${s}` : "/it";
  };

  const chip = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs font-medium ${active ? "bg-red-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Error dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Server errors across every role profile.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-slate-200"><CardContent className="flex items-center gap-3 p-4">
          <span className="flex size-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Bug className="size-5" /></span>
          <div><p className="text-xl font-semibold text-slate-900">{stats.total}</p><p className="text-xs text-muted-foreground">Total logged</p></div>
        </CardContent></Card>
        <Card className="border-slate-200"><CardContent className="flex items-center gap-3 p-4">
          <span className="flex size-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700"><ShieldCheck className="size-5" /></span>
          <div><p className="text-xl font-semibold text-slate-900">{stats.unresolved}</p><p className="text-xs text-muted-foreground">Unresolved</p></div>
        </CardContent></Card>
        <Card className="border-slate-200"><CardContent className="flex items-center gap-3 p-4">
          <span className="flex size-10 items-center justify-center rounded-lg bg-red-100 text-red-700"><AlertTriangle className="size-5" /></span>
          <div><p className="text-xl font-semibold text-slate-900">{stats.critical}</p><p className="text-xs text-muted-foreground">High/critical open</p></div>
        </CardContent></Card>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="space-y-3">
          <CardTitle className="text-base">Errors</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Role:</span>
            <Link href={qs({ role: undefined })} className={chip(!filter.role)}>All</Link>
            {ROLES.map((r) => (
              <Link key={r} href={qs({ role: r })} className={chip(filter.role === r)}>{r}</Link>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Severity:</span>
            <Link href={qs({ severity: undefined })} className={chip(!filter.severity)}>All</Link>
            {SEVERITIES.map((s) => (
              <Link key={s} href={qs({ severity: s })} className={chip(filter.severity === s)}>{s}</Link>
            ))}
            <span className="ml-3 text-xs font-medium text-muted-foreground">Status:</span>
            <Link href={qs({ resolved: "unresolved" })} className={chip(filter.resolved === "unresolved")}>Unresolved</Link>
            <Link href={qs({ resolved: "resolved" })} className={chip(filter.resolved === "resolved")}>Resolved</Link>
          </div>
        </CardHeader>
        <CardContent>
          <ErrorList
            rows={logs.map((l) => ({
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
