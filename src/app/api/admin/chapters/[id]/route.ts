import { requireAdmin, handleAdminError } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const updateChapterSchema = z.object({
  title: z.string().optional().nullable(),
  chapterNumber: z.number().optional(),
  isPublished: z.boolean().optional(),
  isDraft: z.boolean().optional(),
  volume: z.number().int().optional().nullable(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireAdmin();
    if (!adminUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const chapter = await prisma.chapter.findUnique({
      where: { id },
      include: {
        manga: { select: { id: true, title: true, slug: true, coverImage: true } },
      },
    });

    if (!chapter) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }

    return NextResponse.json({ data: chapter });
  } catch (error) {
    const adminErr = handleAdminError(error);
    if (adminErr) return adminErr;
    console.error("Error fetching chapter:", error);
    return NextResponse.json({ error: "Failed to fetch chapter" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireAdmin();
    if (!adminUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const existing = await prisma.chapter.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }

    const body = await request.json();
    const result = updateChapterSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    const data = result.data;
    const chapter = await prisma.chapter.update({
      where: { id },
      data: {
        ...data,
        publishedAt: data.isPublished === true && !existing.publishedAt ? new Date() : existing.publishedAt,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: "UPDATE",
        entity: "Chapter",
        entityId: chapter.id,
      },
    });

    return NextResponse.json({ success: true, data: chapter });
  } catch (error) {
    const adminErr = handleAdminError(error);
    if (adminErr) return adminErr;
    console.error("Error updating chapter:", error);
    return NextResponse.json({ error: "Failed to update chapter" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireAdmin();
    if (!adminUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const chapter = await prisma.chapter.findUnique({ where: { id } });
    if (!chapter) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }

    await prisma.chapter.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: "DELETE",
        entity: "Chapter",
        entityId: id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const adminErr = handleAdminError(error);
    if (adminErr) return adminErr;
    console.error("Error deleting chapter:", error);
    return NextResponse.json({ error: "Failed to delete chapter" }, { status: 500 });
  }
}
