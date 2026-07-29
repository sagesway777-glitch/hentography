import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { z } from "zod";

const historySchema = z.object({
  mangaId: z.string().min(1),
  chapterId: z.string().min(1),
  pageNumber: z.number().int().min(0).default(0),
  readingMode: z.enum(["vertical", "horizontal", "webtoon", "single", "double"]).default("vertical"),
  readingDirection: z.enum(["ltr", "rtl"]).default("ltr"),
  zoomLevel: z.number().min(0.5).max(3).default(1),
  brightness: z.number().min(0.3).max(1.5).default(1),
  isCompleted: z.boolean().default(false),
});

// GET /api/history - get user reading history
export async function GET(request: Request) {
  try {
    const { dbUserId } = await requireAuth();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "24")));
    const skip = (page - 1) * limit;

    const [history, total] = await Promise.all([
      prisma.readingHistory.findMany({
        where: { userId: dbUserId },
        skip,
        take: limit,
        orderBy: { lastReadAt: "desc" },
        include: {
          manga: {
            select: {
              id: true,
              title: true,
              slug: true,
              coverImage: true,
              status: true,
              chapters: {
                where: { isPublished: true },
                orderBy: { chapterNumber: "desc" },
                take: 1,
                select: { chapterNumber: true },
              },
            },
          },
          chapter: { select: { id: true, chapterNumber: true, title: true } },
        },
      }),
      prisma.readingHistory.count({ where: { userId: dbUserId } }),
    ]);

    return NextResponse.json({
      data: history,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}

// POST /api/history - save reading progress
export async function POST(request: Request) {
  try {
    const { dbUserId } = await requireAuth();

    const body = await request.json();
    const result = historySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    const { mangaId, chapterId, pageNumber, readingMode, readingDirection, zoomLevel, brightness, isCompleted } = result.data;

    const history = await prisma.readingHistory.upsert({
      where: { mangaId_chapterId_userId: { mangaId, chapterId, userId: dbUserId } },
      update: { pageNumber, readingMode, readingDirection, zoomLevel, brightness, isCompleted, lastReadAt: new Date() },
      create: { mangaId, chapterId, userId: dbUserId, pageNumber, readingMode, readingDirection, zoomLevel, brightness, isCompleted },
    });

    // Views are incremented server-side on page load (deduplicated per session).
    // Do NOT increment views here to avoid double-counting on every progress save.

    return NextResponse.json({ success: true, data: history });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error saving history:", error);
    return NextResponse.json({ error: "Failed to save reading history" }, { status: 500 });
  }
}
