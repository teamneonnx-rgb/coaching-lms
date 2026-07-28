import "server-only";
import { db } from "@/lib/db";

// Platform-owner view of all tenants (institutes) + their owner admin and size.
export async function getTenants() {
  const institutes = await db.institute.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { users: true } },
      users: {
        where: { role: "SUPER_ADMIN", deletedAt: null },
        select: { name: true, email: true },
        take: 1,
      },
    },
  });
  return institutes.map((i) => ({
    id: i.id,
    name: i.name,
    slug: i.slug,
    isActive: i.isActive,
    createdAt: i.createdAt,
    userCount: i._count.users,
    owner: i.users[0] ?? null,
  }));
}
