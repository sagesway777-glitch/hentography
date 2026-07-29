import { requireAdmin, handleAdminError } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { generateSlug } from "@/lib/utils";
import { Prisma } from "@prisma/client";

const createMangaSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  alternativeTitles: z.string().optional(),
  synopsis: z.string().optional(),
  coverImage: z.string().url("Valid cover image URL is required"),
  bannerImage: z.string().url().optional().or(z.literal("")),
  status: z.enum(["ONGOING", "COMPLETED", "HIATUS", "CANCELLED"]),
  releaseYear: z.number().int().min(1900).max(2100).optional().nullable(),
  language: z.string().default("Japanese"),
  demographic: z.string().optional(),
  ageRating: z.string().optional(),
  isFeatured: z.boolean().default(false),
  isTrending: z.boolean().default(false),
  isDraft: z.boolean().default(true),
  genres: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  themes: z.array(z.string()).optional(),
});

export async function GET(request: Request) {
  try {
    const adminUser = await requireAdmin();
    if (!adminUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");

    const skip = (page - 1) * limit;

    const where: Prisma.MangaWhereInput = {
      ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
      ...(status ? { status: status as any } : {}),
    };

    const [manga, total] = await Promise.all([
      prisma.manga.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { chapters: true },
          },
        },
      }),
      prisma.manga.count({ where }),
    ]);

    return NextResponse.json({
      data: manga,
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
    console.error("Error fetching manga:", error);
    return NextResponse.json({ error: "Failed to fetch manga" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminUser = await requireAdmin();
    if (!adminUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const result = createMangaSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    const data = result.data;
    
    // Generate unique slug
    let baseSlug = generateSlug(data.title);
    let slug = baseSlug;
    let counter = 1;
    
    while (await prisma.manga.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const manga = await prisma.manga.create({
      data: {
        title: data.title,
        alternativeTitles: data.alternativeTitles,
        slug,
        synopsis: data.synopsis,
        coverImage: data.coverImage,
        bannerImage: data.bannerImage || null,
        status: data.status,
        releaseYear: data.releaseYear,
        language: data.language,
        demographic: data.demographic,
        ageRating: data.ageRating,
        isFeatured: data.isFeatured,
        isTrending: data.isTrending,
        isDraft: data.isDraft,
        publishedAt: data.isDraft ? null : new Date(),
        // Handle relations (genres, tags, themes) if provided
        ...(data.genres?.length && {
          genres: {
            create: data.genres.map(genreId => ({
              genre: { connect: { id: genreId } }
            }))
          }
        }),
        ...(data.themes?.length && {
          themes: {
            create: data.themes.map(themeId => ({
              theme: { connect: { id: themeId } }
            }))
          }
        }),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: "CREATE",
        entity: "Manga",
        entityId: manga.id,
      }
    });

    return NextResponse.json({ success: true, data: manga }, { status: 201 });
  } catch (error) {
    const adminErr = handleAdminError(error);
    if (adminErr) return adminErr;
    console.error("Error creating manga:", error);
    return NextResponse.json({ error: "Failed to create manga" }, { status: 500 });
  }
}
