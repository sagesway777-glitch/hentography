import { getCurrentUser } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const genres = searchParams.getAll("genres");
    const status = searchParams.getAll("status");
    const type = searchParams.getAll("type");
    const year = searchParams.getAll("year");
    const rating = searchParams.get("rating");
    const language = searchParams.getAll("language");
    const tags = searchParams.getAll("tags");
    const sortBy = searchParams.get("sortBy") || "popularity";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "24");

    const where: any = {
      isDraft: false,
      OR: query
        ? [
            { title: { contains: query, mode: "insensitive" } },
            { alternativeTitles: { contains: query, mode: "insensitive" } },
            { synopsis: { contains: query, mode: "insensitive" } },
          ]
        : undefined,
      genres: {
        some: {
          genre: {
            slug: { in: genres.length > 0 ? genres : undefined },
          },
        },
      },
      status: status.length > 0 ? { in: status } : undefined,
      tags: {
        some: {
          tag: {
            name: { in: tags.length > 0 ? tags : undefined },
          },
        },
      },
      ...(rating && { averageRating: { gte: parseFloat(rating) } }),
    };

    let orderBy: any = {};
    switch (sortBy) {
      case "newest":
        orderBy = { createdAt: "desc" };
        break;
      case "oldest":
        orderBy = { createdAt: "asc" };
        break;
      case "alphabetical":
        orderBy = { title: "asc" };
        break;
      case "views":
        orderBy = { views: "desc" };
        break;
      case "bookmarkCount":
        orderBy = { bookmarkCount: "desc" };
        break;
      case "rating":
        orderBy = { averageRating: "desc" };
        break;
      case "popularity":
      default:
        orderBy = { bookmarkCount: "desc" };
        break;
    }

    const [manga, total] = await Promise.all([
      prisma.manga.findMany({
        where,
        include: {
          genres: { include: { genre: true } },
          tags: { include: { tag: true } },
          authors: { include: { author: true } },
          chapters: { where: { isPublished: true }, orderBy: { chapterNumber: "desc" }, take: 1 },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.manga.count({ where }),
    ]);

    return NextResponse.json({
      data: manga,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching manga:", error);
    return NextResponse.json({ error: "Failed to fetch manga" }, { status: 500 });
  }
}
