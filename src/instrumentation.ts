import type { Instrumentation } from "next";

// NFR-08 / FR-IT-01: the centralised exception handler. Every unhandled server
// error (render, route handler, or server action) is written to ErrorLog with
// role + user context attached — this is what powers the IT dashboard.
// Prisma is imported dynamically and only on the Node runtime so this file
// stays edge-safe.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const [{ recordError }, { auth }] = await Promise.all([
      import("@/lib/error-log"),
      import("@/auth"),
    ]);

    let affectedUserId: string | null = null;
    let affectedRole: string | null = null;
    try {
      const session = await auth();
      affectedUserId = session?.user?.id ?? null;
      affectedRole = session?.user?.role ?? null;
    } catch {
      // no session context available for this error
    }

    const digest =
      typeof err === "object" && err !== null && "digest" in err
        ? String((err as { digest?: unknown }).digest)
        : undefined;

    await recordError({
      error: err,
      affectedUserId,
      affectedRole,
      screenOrEndpoint: `${request.method} ${request.path} (${context.routeType})`,
      errorCode: digest,
    });
  } catch (e) {
    console.error("[instrumentation] onRequestError failed", e);
  }
};
