import { NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { sendParentAttendanceAlert } from "@/lib/notifications/attendance-alert";

// QStash worker (SRD sequence step 4a): receives the enqueued job and sends the
// parent SMS/Email. Verifies the QStash signature so only the queue can invoke it.

export const runtime = "nodejs";

function hasSigningKeys(): boolean {
  return Boolean(
    process.env.QSTASH_CURRENT_SIGNING_KEY && process.env.QSTASH_NEXT_SIGNING_KEY
  );
}

export async function POST(req: Request) {
  const bodyText = await req.text();

  // Verify the request genuinely came from QStash.
  if (hasSigningKeys()) {
    const signature = req.headers.get("upstash-signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }
    const receiver = new Receiver({
      currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
      nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
    });
    const valid = await receiver
      .verify({ signature, body: bodyText })
      .catch(() => false);
    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else {
    // No signing keys configured — refuse to run an unauthenticated worker.
    return NextResponse.json({ error: "Worker not configured" }, { status: 503 });
  }

  let attendanceId: string | undefined;
  try {
    attendanceId = JSON.parse(bodyText)?.attendanceId;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!attendanceId) {
    return NextResponse.json({ error: "Missing attendanceId" }, { status: 400 });
  }

  const result = await sendParentAttendanceAlert(attendanceId);
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
