import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { z } from "zod";

import { rateLimit } from "@/lib/rate-limit";

const createReviewSchema = z.object({
  mangaId: z.string().min(1),
  rating: z.number().int().min(1).max(10),
  title: z.string().max(200).optional(),
  body: z.string().min(20, "Review must be at least 20 characters").max(10000),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mangaId = searchParams.get("mangaId");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(20, Math.max(1, parseInt(searchParams.get("limit") || "10")));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { isApproved: true };
    if (mangaId) where.mangaId = mangaId;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ helpfulVotes: "desc" }, { createdAt: "desc" }],
        include: {
          user: { select: { id: true, name: true, image: true, username: true } },
        },
      }),
      prisma.review.count({ where }),
    ]);

    return NextResponse.json({
      data: reviews,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { dbUserId } = await requireAuth();

    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const rl = rateLimit(`reviews-${dbUserId}-${ip}`, 5, 60 * 1000);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many reviews. Please slow down." }, { status: 429 });
    }

    const body = await request.json();
    const result = createReviewSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    const { mangaId, rating, title, body: reviewBody } = result.data;

    const manga = await prisma.manga.findUnique({
      where: { id: mangaId, isDraft: false },
      select: { id: true },
    });
    if (!manga) {
      return NextResponse.json({ error: "Manga not found" }, { status: 404 });
    }

    const review = await prisma.review.upsert({
      where: { mangaId_userId: { mangaId, userId: dbUserId } },
      update: { rating, title: title || null, body: reviewBody },
      create: { mangaId, userId: dbUserId, rating, title: title || null, body: reviewBody },
      include: { user: { select: { id: true, name: true, image: true, username: true } } },
    });

    // Recalculate from all approved reviews
    const allReviews = await prisma.review.findMany({
      where: { mangaId, isApproved: true },
      select: { rating: true },
    });
    const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await prisma.manga.update({
      where: { id: mangaId },
      data: { averageRating: Math.round(avg * 10) / 10, reviewCount: allReviews.length },
    });

    return NextResponse.json({ success: true, data: review }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error creating review:", error);
    return NextResponse.json({ error: "Failed to create review" }, { status: 500 });
  }
}
