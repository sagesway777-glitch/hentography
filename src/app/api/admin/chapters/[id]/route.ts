import { requireAdmin, handleAdminError } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

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

    // Accept both simple metadata updates AND full page updates from the chapter editor
    const updateSchema = z.object({
      title: z.string().optional().nullable(),
      chapterNumber: z.number().optional(),
      mangaId: z.string().optional(),
      isPublished: z.boolean().optional(),
      isDraft: z.boolean().optional(),
      volume: z.number().int().optional().nullable(),
      // Page images array from chapter editor (already uploaded Cloudinary URLs)
      images: z.array(z.string()).optional(),
      pages: z.number().int().optional(),
    });

    const result = updateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    const data = result.data;

    // Build update payload — only include explicitly provided fields
    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.chapterNumber !== undefined) updateData.chapterNumber = data.chapterNumber;
    if (data.isPublished !== undefined) updateData.isPublished = data.isPublished;
    if (data.isDraft !== undefined) updateData.isDraft = data.isDraft;
    if (data.volume !== undefined) updateData.volume = data.volume;

    // Handle page images update — images array takes priority over pages count
    if (data.images !== undefined && data.images.length > 0) {
      updateData.images = data.images;
      updateData.pages = data.images.length;
    } else if (data.pages !== undefined) {
      updateData.pages = data.pages;
    }

    // Handle publishedAt transitions
    if (data.isPublished === true && !existing.publishedAt) {
      updateData.publishedAt = new Date();
    } else if (data.isPublished === false) {
      updateData.publishedAt = null;
    } else {
      updateData.publishedAt = existing.publishedAt;
    }

    const chapter = await prisma.chapter.update({
      where: { id },
      data: updateData,
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
