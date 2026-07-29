import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { z } from "zod";

// POST /api/likes - toggle manga like
export async function POST(request: Request) {
  try {
    const { dbUserId } = await requireAuth();

    const body = await request.json();
    const mangaId = z.string().min(1).safeParse(body.mangaId);
    if (!mangaId.success) {
      return NextResponse.json({ error: "Manga ID is required" }, { status: 400 });
    }

    const manga = await prisma.manga.findUnique({
      where: { id: mangaId.data, isDraft: false },
      select: { id: true },
    });
    if (!manga) {
      return NextResponse.json({ error: "Manga not found" }, { status: 404 });
    }

    const existingLike = await prisma.mangaLike.findUnique({
      where: { mangaId_userId: { mangaId: mangaId.data, userId: dbUserId } },
    });

    if (existingLike) {
      await prisma.$transaction([
        prisma.mangaLike.delete({ where: { mangaId_userId: { mangaId: mangaId.data, userId: dbUserId } } }),
        prisma.manga.update({ where: { id: mangaId.data }, data: { likeCount: { decrement: 1 } } }),
      ]);
      return NextResponse.json({ success: true, liked: false });
    }

    await prisma.$transaction([
      prisma.mangaLike.create({ data: { mangaId: mangaId.data, userId: dbUserId } }),
      prisma.manga.update({ where: { id: mangaId.data }, data: { likeCount: { increment: 1 } } }),
    ]);

    return NextResponse.json({ success: true, liked: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error toggling like:", error);
    return NextResponse.json({ error: "Failed to toggle like" }, { status: 500 });
  }
}

// GET /api/likes?mangaId=xxx - check if user liked a manga
export async function GET(request: Request) {
  try {
    const { dbUserId } = await requireAuth();
    const { searchParams } = new URL(request.url);
    const mangaId = searchParams.get("mangaId");

    if (mangaId) {
      const like = await prisma.mangaLike.findUnique({
        where: { mangaId_userId: { mangaId, userId: dbUserId } },
      });
      return NextResponse.json({ isLiked: !!like });
    }

    // Return all liked manga
    const likes = await prisma.mangaLike.findMany({
      where: { userId: dbUserId },
      include: {
        manga: {
          select: {
            id: true, title: true, slug: true, coverImage: true, status: true,
            chapters: { where: { isPublished: true }, orderBy: { chapterNumber: "desc" }, take: 1, select: { chapterNumber: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: likes });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch likes" }, { status: 500 });
  }
}
