import { getCurrentUser } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: Prisma.GenreWhereInput = {};
    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { slug: { contains: query, mode: "insensitive" } },
      ];
    }

    const [genres, total] = await Promise.all([
      prisma.genre.findMany({
        where,
        include: { _count: { select: { manga: true } } },
        orderBy: { name: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.genre.count({ where }),
    ]);

    return NextResponse.json({ data: genres, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Error fetching genres:", error);
    return NextResponse.json({ error: "Failed to fetch genres" }, { status: 500 });
  }
}
