import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

// SRD §5 — GET /api/admin/notifications?limit=20 → { unreadCount, notifications }.
// Auth: the NextAuth JWT session travels in an httpOnly cookie (sent automatically
// by the SWR fetch), which auth() validates — the secure equivalent of the SRD's
// "Authorization: Bearer <session-token>". Admin-only.
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const rawLimit = Number(searchParams.get("limit") ?? "20");
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 20;

  const [notifications, unreadCount] = await Promise.all([
    db.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        isRead: true,
        createdAt: true,
      },
    }),
    db.notification.count({ where: { userId: session.user.id, isRead: false } }),
  ]);

  return NextResponse.json(
    { unreadCount, notifications },
    { headers: { "Cache-Control": "no-store" } }
  );
}
