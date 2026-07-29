import { getCurrentUser } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ mangaSlug: string; chapterSlug: string }> }
) {
  try {
    const { mangaSlug, chapterSlug } = await params;
    const manga = await prisma.manga.findUnique({
      where: { slug: mangaSlug, isDraft: false },
      select: { id: true, title: true, slug: true },
    });

    if (!manga) {
      return NextResponse.json({ error: "Manga not found" }, { status: 404 });
    }

    const chapterNumber = parseInt(chapterSlug.replace("chapter-", ""));
    const chapter = await prisma.chapter.findFirst({
      where: { mangaId: manga.id, chapterNumber, isPublished: true },
      include: {
        manga: { select: { title: true, slug: true, coverImage: true } },
        comments: {
          where: { isApproved: true, parentId: null },
          include: { user: { select: { name: true, image: true } }, likes: true },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!chapter) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }

    const user = await getCurrentUser();
    let readingHistory = null;

    if (user) {
      readingHistory = await prisma.readingHistory.findUnique({
        where: { mangaId_chapterId_userId: { mangaId: manga.id, chapterId: chapter.id, userId: user.id } },
      });
    }

    const prevChapter = await prisma.chapter.findFirst({
      where: { mangaId: manga.id, chapterNumber: { lt: chapterNumber }, isPublished: true },
      orderBy: { chapterNumber: "desc" },
      select: { chapterNumber: true },
    });

    const nextChapter = await prisma.chapter.findFirst({
      where: { mangaId: manga.id, chapterNumber: { gt: chapterNumber }, isPublished: true },
      orderBy: { chapterNumber: "asc" },
      select: { chapterNumber: true },
    });

    return NextResponse.json({
      chapter,
      readingHistory,
      prevChapter: prevChapter ? `chapter-${prevChapter.chapterNumber}` : null,
      nextChapter: nextChapter ? `chapter-${nextChapter.chapterNumber}` : null,
    });
  } catch (error) {
    console.error("Error fetching chapter:", error);
    return NextResponse.json({ error: "Failed to fetch chapter" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ mangaSlug: string; chapterSlug: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { mangaSlug, chapterSlug } = await params;
    const manga = await prisma.manga.findUnique({ where: { slug: mangaSlug } });
    if (!manga) {
      return NextResponse.json({ error: "Manga not found" }, { status: 404 });
    }

    const chapterNumber = parseInt(chapterSlug.replace("chapter-", ""));
    const chapter = await prisma.chapter.findFirst({ where: { mangaId: manga.id, chapterNumber } });
    if (!chapter) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }

    const body = await request.json();
    const { pageNumber, readingMode, readingDirection, zoomLevel, brightness, isCompleted } = body;

    const [history] = await Promise.all([
      prisma.readingHistory.upsert({
        where: { mangaId_chapterId_userId: { mangaId: manga.id, chapterId: chapter.id, userId: user.id } },
        update: {
          pageNumber: pageNumber ?? 0,
          readingMode: readingMode ?? "vertical",
          readingDirection: readingDirection ?? "ltr",
          zoomLevel: zoomLevel ?? 1,
          brightness: brightness ?? 1,
          isCompleted: isCompleted ?? false,
          lastReadAt: new Date(),
        },
        create: {
          mangaId: manga.id,
          chapterId: chapter.id,
          userId: user.id,
          pageNumber: pageNumber ?? 0,
          readingMode: readingMode ?? "vertical",
          readingDirection: readingDirection ?? "ltr",
          zoomLevel: zoomLevel ?? 1,
          brightness: brightness ?? 1,
          isCompleted: isCompleted ?? false,
        },
      }),
      prisma.manga.update({
        where: { id: manga.id },
        data: { views: { increment: 1 } },
      })
    ]);

    return NextResponse.json({ success: true, history });
  } catch (error) {
    console.error("Error updating reading history:", error);
    return NextResponse.json({ error: "Failed to update reading history" }, { status: 500 });
  }
}
