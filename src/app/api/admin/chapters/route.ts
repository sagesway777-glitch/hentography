import { requireAdmin, handleAdminError } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const adminUser = await requireAdmin();
    if (!adminUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const mangaId = searchParams.get("mangaId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const skip = (page - 1) * limit;
    
    const where = mangaId ? { mangaId } : {};

    const [chapters, total] = await Promise.all([
      prisma.chapter.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { mangaId: "desc" },
          { chapterNumber: "desc" }
        ],
        include: {
          manga: {
            select: { title: true, coverImage: true }
          }
        }
      }),
      prisma.chapter.count({ where }),
    ]);

    return NextResponse.json({
      data: chapters,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    const adminErr = handleAdminError(error);
    if (adminErr) return adminErr;
    console.error("Error fetching chapters:", error);
    return NextResponse.json({ error: "Failed to fetch chapters" }, { status: 500 });
  }
}

import { z } from "zod";

const createChapterSchema = z.object({
  mangaId: z.string(),
  chapterNumber: z.number(),
  title: z.string().optional().nullable(),
  isPublished: z.boolean().default(true),
  pages: z.array(z.object({
    pageNumber: z.number(),
    imageUrl: z.string().url(),
  })).min(1),
});

export async function POST(request: Request) {
  try {
    const adminUser = await requireAdmin();
    if (!adminUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const result = createChapterSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    const data = result.data;

    const existingChapter = await prisma.chapter.findFirst({
      where: {
        mangaId: data.mangaId,
        chapterNumber: data.chapterNumber,
      },
    });

    if (existingChapter) {
      return NextResponse.json({ error: `Chapter ${data.chapterNumber} already exists for this manga` }, { status: 409 });
    }

    const chapter = await prisma.chapter.create({
      data: {
        mangaId: data.mangaId,
        chapterNumber: data.chapterNumber,
        title: data.title,
        isPublished: data.isPublished,
        publishedAt: data.isPublished ? new Date() : null,
        pages: data.pages.length,
        images: data.pages.map(p => p.imageUrl),
      }
    });

    await prisma.manga.update({
      where: { id: data.mangaId },
      data: { updatedAt: new Date() }
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: "CREATE",
        entity: "Chapter",
        entityId: chapter.id,
      }
    });

    return NextResponse.json({ success: true, data: chapter }, { status: 201 });
  } catch (error) {
    const adminErr = handleAdminError(error);
    if (adminErr) return adminErr;
    console.error("Error creating chapter:", error);
    return NextResponse.json({ error: "Failed to create chapter" }, { status: 500 });
  }
}
