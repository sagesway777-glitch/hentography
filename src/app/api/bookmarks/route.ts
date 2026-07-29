import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { z } from "zod";

const bookmarkSchema = z.object({
  mangaId: z.string().min(1),
  status: z.enum(["WANT_TO_READ", "CURRENTLY_READING", "COMPLETED", "DROPPED", "ON_HOLD"]).optional(),
});

// GET /api/bookmarks - get user bookmarks
export async function GET(request: Request) {
  try {
    const { dbUserId } = await requireAuth();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "24")));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { userId: dbUserId };
    if (status) where.status = status;

    const [bookmarks, total] = await Promise.all([
      prisma.bookmark.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: {
          manga: {
            select: {
              id: true,
              title: true,
              slug: true,
              coverImage: true,
              status: true,
              averageRating: true,
              genres: { include: { genre: { select: { name: true, slug: true } } } },
              chapters: {
                where: { isPublished: true },
                orderBy: { chapterNumber: "desc" },
                take: 1,
                select: { chapterNumber: true },
              },
            },
          },
        },
      }),
      prisma.bookmark.count({ where }),
    ]);

    return NextResponse.json({
      data: bookmarks,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch bookmarks" }, { status: 500 });
  }
}

// POST /api/bookmarks - add or update bookmark
export async function POST(request: Request) {
  try {
    const { dbUserId } = await requireAuth();

    const body = await request.json();
    const result = bookmarkSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    const { mangaId, status = "WANT_TO_READ" } = result.data;

    const manga = await prisma.manga.findUnique({
      where: { id: mangaId, isDraft: false },
      select: { id: true },
    });
    if (!manga) {
      return NextResponse.json({ error: "Manga not found" }, { status: 404 });
    }

    const existing = await prisma.bookmark.findUnique({
      where: { mangaId_userId: { mangaId, userId: dbUserId } },
    });

    const [bookmark] = await prisma.$transaction([
      prisma.bookmark.upsert({
        where: { mangaId_userId: { mangaId, userId: dbUserId } },
        update: { status },
        create: { mangaId, userId: dbUserId, status },
      }),
      ...(!existing
        ? [prisma.manga.update({ where: { id: mangaId }, data: { bookmarkCount: { increment: 1 } } })]
        : []),
    ]);

    return NextResponse.json({ success: true, data: bookmark });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to bookmark manga" }, { status: 500 });
  }
}

// DELETE /api/bookmarks?mangaId=xxx - remove bookmark
export async function DELETE(request: Request) {
  try {
    const { dbUserId } = await requireAuth();

    const { searchParams } = new URL(request.url);
    const mangaId = searchParams.get("mangaId");
    if (!mangaId) {
      return NextResponse.json({ error: "mangaId is required" }, { status: 400 });
    }

    const existing = await prisma.bookmark.findUnique({
      where: { mangaId_userId: { mangaId, userId: dbUserId } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Bookmark not found" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.bookmark.delete({ where: { mangaId_userId: { mangaId, userId: dbUserId } } }),
      prisma.manga.update({ where: { id: mangaId }, data: { bookmarkCount: { decrement: 1 } } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to remove bookmark" }, { status: 500 });
  }
}
