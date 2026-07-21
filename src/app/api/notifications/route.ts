import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

// Notifications for the current user (any role). Powers the notification bell
// across admin/teacher/student (FR-STU-10 / FR-NOT).
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
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
      select: { id: true, title: true, message: true, type: true, isRead: true, createdAt: true },
    }),
    db.notification.count({ where: { userId: session.user.id, isRead: false } }),
  ]);

  return NextResponse.json(
    { unreadCount, notifications },
    { headers: { "Cache-Control": "no-store" } }
  );
}
