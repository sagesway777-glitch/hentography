import { getCurrentUser } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const manga = await prisma.manga.findFirst({
      where: { slug, isDraft: false },
      include: {
        genres: { include: { genre: true } },
        tags: { include: { tag: true } },
        themes: { include: { theme: true } },
        authors: { include: { author: true } },
        artists: { include: { artist: true } },
        publishers: { include: { publisher: true } },
        chapters: { where: { isPublished: true }, orderBy: { chapterNumber: "asc" } },
        comments: {
          where: { isApproved: true, parentId: null },
          include: { user: true, likes: true, replies: { include: { user: true, likes: true } } },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        ratings: true,
        related: { include: { relatedManga: { include: { genres: { include: { genre: true } }, chapters: { where: { isPublished: true }, take: 1 } } } } },
        relatedTo: { include: { manga: { include: { genres: { include: { genre: true } }, chapters: { where: { isPublished: true }, take: 1 } } } } },
      },
    });

    if (!manga) {
      return NextResponse.json({ error: "Manga not found" }, { status: 404 });
    }

    const user = await getCurrentUser();
    let isBookmarked = false;
    let isLiked = false;
    let userRating = 0;

    if (user) {
      const [bookmark, like, rating] = await Promise.all([
        prisma.bookmark.findUnique({ where: { mangaId_userId: { mangaId: manga.id, userId: user.id } } }),
        prisma.mangaLike.findUnique({ where: { mangaId_userId: { mangaId: manga.id, userId: user.id } } }),
        prisma.rating.findUnique({ where: { mangaId_userId: { mangaId: manga.id, userId: user.id } } }),
      ]);
      isBookmarked = !!bookmark;
      isLiked = !!like;
      userRating = rating?.rating || 0;
    }

    return NextResponse.json({
      ...manga,
      isBookmarked,
      isLiked,
      userRating,
    });
  } catch (error) {
    console.error("Error fetching manga:", error);
    return NextResponse.json({ error: "Failed to fetch manga" }, { status: 500 });
  }
}
