import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { z } from "zod";

import { rateLimit } from "@/lib/rate-limit";

const commentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(5000, "Comment is too long"),
  mangaId: z.string().min(1),
  chapterId: z.string().optional(),
  parentId: z.string().optional(),
  isSpoiler: z.boolean().optional().default(false),
});

// GET /api/comments?mangaId=xxx&chapterId=xxx - get comments for manga or chapter
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mangaId = searchParams.get("mangaId");
    const chapterId = searchParams.get("chapterId");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;

    if (!mangaId) {
      return NextResponse.json({ error: "mangaId is required" }, { status: 400 });
    }

    const where: Record<string, unknown> = {
      mangaId,
      isApproved: true,
      isHidden: false,
      parentId: null, // top-level comments only
    };
    if (chapterId) where.chapterId = chapterId;

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true, image: true, id: true, username: true, clerkId: true } },
          likes: { select: { user: { select: { clerkId: true } } } },
          replies: {
            where: { isApproved: true, isHidden: false },
            orderBy: { createdAt: "asc" },
            include: {
              user: { select: { name: true, image: true, id: true, username: true, clerkId: true } },
              likes: { select: { user: { select: { clerkId: true } } } },
            },
          },
        },
      }),
      prisma.comment.count({ where }),
    ]);

    return NextResponse.json({
      data: comments,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}

// POST /api/comments - create a comment
export async function POST(request: Request) {
  try {
    const { dbUserId } = await requireAuth();

    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const rl = rateLimit(`comments-${dbUserId}-${ip}`, 10, 60 * 1000);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many comments. Please slow down." }, { status: 429 });
    }

    const body = await request.json();
    const result = commentSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    const { content, mangaId, chapterId, parentId, isSpoiler } = result.data;

    // Verify manga exists
    const manga = await prisma.manga.findUnique({
      where: { id: mangaId, isDraft: false },
      select: { id: true },
    });
    if (!manga) {
      return NextResponse.json({ error: "Manga not found" }, { status: 404 });
    }

    // Verify parent comment exists if replying
    if (parentId) {
      const parent = await prisma.comment.findUnique({ where: { id: parentId }, select: { id: true } });
      if (!parent) {
        return NextResponse.json({ error: "Parent comment not found" }, { status: 404 });
      }
    }

    const [comment] = await prisma.$transaction([
      prisma.comment.create({
        data: {
          content,
          mangaId,
          chapterId: chapterId || null,
          userId: dbUserId,
          parentId: parentId || null,
          isSpoiler,
        },
        include: {
          user: { select: { name: true, image: true, username: true } },
          likes: { select: { userId: true } },
          replies: true,
        },
      }),
      prisma.manga.update({ where: { id: mangaId }, data: { commentCount: { increment: 1 } } }),
    ]);

    return NextResponse.json({ success: true, data: comment }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error creating comment:", error);
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}
