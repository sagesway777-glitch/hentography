import { requireAdmin, handleAdminError } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const adminUser = await requireAdmin();
    if (!adminUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [
      totalUsers,
      newUsers,
      totalManga,
      publishedManga,
      totalChapters,
      totalComments,
      totalReviews,
      topManga,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: since } } }),
      prisma.manga.count(),
      prisma.manga.count({ where: { isDraft: false } }),
      prisma.chapter.count(),
      prisma.comment.count(),
      prisma.review.count(),
      prisma.manga.findMany({
        where: { isDraft: false },
        orderBy: { views: "desc" },
        take: 10,
        select: { id: true, title: true, slug: true, coverImage: true, views: true, averageRating: true, bookmarkCount: true },
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { user: { select: { name: true, image: true } } },
      }),
    ]);

    return NextResponse.json({
      stats: {
        totalUsers,
        newUsers,
        totalManga,
        publishedManga,
        totalChapters,
        totalComments,
        totalReviews,
      },
      topManga,
      recentAuditLogs,
    });
  } catch (error) {
    const adminErr = handleAdminError(error);
    if (adminErr) return adminErr;
    console.error("Error fetching analytics:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
