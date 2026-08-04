import { requireAdmin, handleAdminError } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { generateSlug } from "@/lib/utils";

const updateMangaSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  alternativeTitles: z.string().optional().nullable(),
  synopsis: z.string().optional().nullable(),
  coverImage: z.string().url().optional(),
  bannerImage: z.string().url().optional().nullable(),
  status: z.enum(["ONGOING", "COMPLETED", "HIATUS", "CANCELLED"]).optional(),
  releaseYear: z.number().int().min(1900).max(2100).optional().nullable(),
  language: z.string().optional(),
  demographic: z.string().optional().nullable(),
  ageRating: z.string().optional().nullable(),
  isFeatured: z.boolean().optional(),
  isTrending: z.boolean().optional(),
  isDraft: z.boolean().optional(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  seoKeywords: z.string().optional().nullable(),
  genres: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  themes: z.array(z.string()).optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireAdmin();
    if (!adminUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const manga = await prisma.manga.findUnique({
      where: { id },
      include: {
        genres: { include: { genre: true } },
        tags: { include: { tag: true } },
        themes: { include: { theme: true } },
        authors: { include: { author: true } },
        artists: { include: { artist: true } },
        publishers: { include: { publisher: true } },
        chapters: { where: { isPublished: true }, orderBy: { chapterNumber: "desc" }, take: 5 },
        _count: { select: { chapters: true, comments: true, reviews: true } },
      },
    });

    if (!manga) {
      return NextResponse.json({ error: "Manga not found" }, { status: 404 });
    }

    return NextResponse.json({ data: manga });
  } catch (error) {
    const adminErr = handleAdminError(error);
    if (adminErr) return adminErr;
    console.error("Error fetching manga:", error);
    return NextResponse.json({ error: "Failed to fetch manga" }, { status: 500 });
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
    const existing = await prisma.manga.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Manga not found" }, { status: 404 });
    }

    const body = await request.json();
    const result = updateMangaSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    const data = result.data;

    // Handle slug update if title changed
    let slug = existing.slug;
    if (data.title && data.title !== existing.title) {
      const baseSlug = generateSlug(data.title);
      slug = baseSlug;
      let counter = 1;
      while (await prisma.manga.findFirst({ where: { slug, NOT: { id } } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
    }

    // Handle genres, tags, themes replacements
    const { genres, tags, themes, ...rest } = data;

    const manga = await prisma.manga.update({
      where: { id },
      data: {
        ...rest,
        slug,
        publishedAt: data.isDraft === false && !existing.publishedAt ? new Date() : existing.publishedAt,
        ...(genres !== undefined && {
          genres: {
            deleteMany: {},
            create: genres.map(genreId => ({ genre: { connect: { id: genreId } } })),
          },
        }),
        ...(tags !== undefined && {
          tags: {
            deleteMany: {},
            create: tags.map(tagId => ({ tag: { connect: { id: tagId } } })),
          },
        }),
        ...(themes !== undefined && {
          themes: {
            deleteMany: {},
            create: themes.map(themeId => ({ theme: { connect: { id: themeId } } })),
          },
        }),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: "UPDATE",
        entity: "Manga",
        entityId: manga.id,
        oldValues: JSON.stringify({ title: existing.title, status: existing.status, isDraft: existing.isDraft }),
        newValues: JSON.stringify({ title: manga.title, status: manga.status, isDraft: manga.isDraft }),
      },
    });

    return NextResponse.json({ success: true, data: manga });
  } catch (error) {
    const adminErr = handleAdminError(error);
    if (adminErr) return adminErr;
    console.error("Error updating manga:", error);
    return NextResponse.json({ error: "Failed to update manga" }, { status: 500 });
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
    const manga = await prisma.manga.findUnique({ where: { id } });
    if (!manga) {
      return NextResponse.json({ error: "Manga not found" }, { status: 404 });
    }

    await prisma.manga.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: "DELETE",
        entity: "Manga",
        entityId: id,
        oldValues: JSON.stringify({ title: manga.title }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const adminErr = handleAdminError(error);
    if (adminErr) return adminErr;
    console.error("Error deleting manga:", error);
    return NextResponse.json({ error: "Failed to delete manga" }, { status: 500 });
  }
}
