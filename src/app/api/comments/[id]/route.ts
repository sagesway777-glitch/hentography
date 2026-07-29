import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { z } from "zod";

// GET /api/comments/[id] - get single comment with replies
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const comment = await prisma.comment.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, image: true, username: true } },
        likes: { select: { userId: true } },
        replies: {
          where: { isApproved: true, isHidden: false },
          include: {
            user: { select: { id: true, name: true, image: true, username: true } },
            likes: { select: { userId: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!comment || !comment.isApproved || comment.isHidden) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    return NextResponse.json({ data: comment });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch comment" }, { status: 500 });
  }
}

// DELETE /api/comments/[id] - delete own comment
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { dbUserId } = await requireAuth();
    const { id } = await params;

    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Only the owner can delete their own comment (admins delete via admin API)
    if (comment.userId !== dbUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.$transaction([
      prisma.comment.delete({ where: { id } }),
      prisma.manga.update({
        where: { id: comment.mangaId },
        data: { commentCount: { decrement: 1 } },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}

// PATCH /api/comments/[id] - edit own comment
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { dbUserId } = await requireAuth();
    const { id } = await params;

    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (comment.userId !== dbUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const content = z.string().min(1).max(5000).safeParse(body.content);
    if (!content.success) {
      return NextResponse.json({ error: "Invalid content" }, { status: 400 });
    }

    const updated = await prisma.comment.update({
      where: { id },
      data: {
        content: content.data,
        isSpoiler: body.isSpoiler ?? comment.isSpoiler,
        editedAt: new Date(),
      },
      include: { user: { select: { id: true, name: true, image: true, username: true } } },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to update comment" }, { status: 500 });
  }
}
