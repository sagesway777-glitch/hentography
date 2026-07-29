import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";

// GET /api/notifications - get user notifications
export async function GET(request: Request) {
  try {
    const { dbUserId } = await requireAuth();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const unreadOnly = searchParams.get("unread") === "true";
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { userId: dbUserId };
    if (unreadOnly) where.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          manga: { select: { id: true, title: true, slug: true, coverImage: true } },
        },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: dbUserId, isRead: false } }),
    ]);

    return NextResponse.json({
      data: notifications,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit), unreadCount },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

// PATCH /api/notifications - mark all as read
export async function PATCH(request: Request) {
  try {
    const { dbUserId } = await requireAuth();

    const { ids } = await request.json().catch(() => ({ ids: null }));

    if (ids && Array.isArray(ids)) {
      // Mark specific notifications as read
      await prisma.notification.updateMany({
        where: { id: { in: ids }, userId: dbUserId },
        data: { isRead: true },
      });
    } else {
      // Mark all as read
      await prisma.notification.updateMany({
        where: { userId: dbUserId, isRead: false },
        data: { isRead: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
}
