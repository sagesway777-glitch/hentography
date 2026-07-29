import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { z } from "zod";

const ratingSchema = z.object({
  mangaId: z.string().min(1),
  rating: z.number().int().min(1).max(10),
});

export async function POST(request: Request) {
  try {
    const { dbUserId } = await requireAuth();

    const body = await request.json();
    const result = ratingSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    const { mangaId, rating } = result.data;

    const manga = await prisma.manga.findUnique({
      where: { id: mangaId, isDraft: false },
      select: { id: true },
    });
    if (!manga) {
      return NextResponse.json({ error: "Manga not found" }, { status: 404 });
    }

    await prisma.rating.upsert({
      where: { mangaId_userId: { mangaId, userId: dbUserId } },
      update: { rating },
      create: { mangaId, userId: dbUserId, rating },
    });

    // Recalculate average from all ratings
    const allRatings = await prisma.rating.findMany({
      where: { mangaId },
      select: { rating: true },
    });
    const avg = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;
    const roundedAvg = Math.round(avg * 10) / 10;

    await prisma.manga.update({
      where: { id: mangaId },
      data: { averageRating: roundedAvg, ratingCount: allRatings.length },
    });

    return NextResponse.json({ success: true, averageRating: roundedAvg, ratingCount: allRatings.length });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error saving rating:", error);
    return NextResponse.json({ error: "Failed to save rating" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mangaId = searchParams.get("mangaId");
    if (!mangaId) {
      return NextResponse.json({ error: "mangaId required" }, { status: 400 });
    }

    const result = await prisma.rating.aggregate({
      where: { mangaId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return NextResponse.json({
      averageRating: result._avg.rating ? Math.round(result._avg.rating * 10) / 10 : 0,
      ratingCount: result._count.rating,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch rating" }, { status: 500 });
  }
}
