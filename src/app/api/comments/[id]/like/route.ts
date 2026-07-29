import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";

// POST /api/comments/[id]/like - toggle like on a comment
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { dbUserId } = await requireAuth();
    const { id: commentId } = await params;

    const comment = await prisma.comment.findUnique({ where: { id: commentId }, select: { id: true } });
    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    const existing = await prisma.commentLike.findUnique({
      where: { commentId_userId: { commentId, userId: dbUserId } },
    });

    if (existing) {
      await prisma.commentLike.delete({ where: { commentId_userId: { commentId, userId: dbUserId } } });
      return NextResponse.json({ success: true, liked: false });
    } else {
      await prisma.commentLike.create({ data: { commentId, userId: dbUserId } });
      return NextResponse.json({ success: true, liked: true });
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to toggle like" }, { status: 500 });
  }
}
