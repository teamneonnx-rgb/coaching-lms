import "server-only";
import type { ErrorSeverity } from "@prisma/client";
import { db } from "@/lib/db";

// FR-IT-07: redact sensitive fields before anything hits the database.
const SENSITIVE_KEYS = /pass(word)?|secret|token|otp|card|cvv|ssn|aadhaar|account|auth|apikey|api_key|razorpay|key/i;

export function redactPayload(input: unknown): string | null {
  if (input == null) return null;
  const seen = new WeakSet();
  const walk = (v: unknown): unknown => {
    if (v == null) return v;
    if (typeof v !== "object") return v;
    if (seen.has(v as object)) return "[circular]";
    seen.add(v as object);
    if (Array.isArray(v)) return v.map(walk);
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEYS.test(k) ? "[redacted]" : walk(val);
    }
    return out;
  };
  try {
    return JSON.stringify(walk(input)).slice(0, 4000);
  } catch {
    return null;
  }
}

// Best-effort severity classifier from the error/context.
function classify(message: string, code?: string): ErrorSeverity {
  const m = `${message} ${code ?? ""}`.toLowerCase();
  if (/econnrefused|database|prisma|pool|timeout|out of memory|ecancel/.test(m)) return "CRITICAL";
  if (/unauthorized|forbidden|403|payment|razorpay/.test(m)) return "HIGH";
  if (/not found|404|validation|invalid/.test(m)) return "LOW";
  return "MEDIUM";
}

// NFR-08 / FR-IT-01: the single sink for unhandled server errors. Never throws
// into the caller. On HIGH/CRITICAL it alerts IT (in-app + email).
export async function recordError(input: {
  error: unknown;
  affectedUserId?: string | null;
  affectedRole?: string | null;
  screenOrEndpoint?: string | null;
  errorCode?: string | null;
  requestPayload?: unknown;
}): Promise<void> {
  try {
    const err = input.error;
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? (err.stack ?? null) : null;
    // Ignore Next.js control-flow "errors".
    if (/NEXT_REDIRECT|NEXT_NOT_FOUND|DYNAMIC_SERVER_USAGE/.test(message)) return;

    const severity = classify(message, input.errorCode ?? undefined);
    const log = await db.errorLog.create({
      data: {
        affectedUserId: input.affectedUserId ?? null,
        affectedRole: input.affectedRole ?? null,
        screenOrEndpoint: input.screenOrEndpoint ?? null,
        errorCode: input.errorCode ?? null,
        errorMessage: message.slice(0, 1000),
        stackTrace: stack?.slice(0, 6000) ?? null,
        requestPayloadRedacted: redactPayload(input.requestPayload),
        severity,
      },
      select: { id: true, severity: true, errorMessage: true },
    });

    // FR-IT-08: severity thresholds alert IT (in-app + email best-effort).
    if (log.severity === "HIGH" || log.severity === "CRITICAL") {
      const its = await db.user.findMany({
        where: { role: "IT", deletedAt: null },
        select: { id: true },
      });
      if (its.length > 0) {
        await db.notification.createMany({
          data: its.map((it) => ({
            userId: it.id,
            title: `${log.severity} error`,
            message: log.errorMessage.slice(0, 200),
            type: "SYSTEM_ALERT" as const,
          })),
        });
      }
    }
  } catch (e) {
    // The error sink must never make things worse.
    console.error("[error-log] failed to record", e);
  }
}
