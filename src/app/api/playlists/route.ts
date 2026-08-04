import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/auth-helpers";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth-helpers";

const createPlaylistSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().default(true),
});

// GET /api/playlists - Get playlists (public or user's own)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId"); // specific user's playlists
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "24")));
    const skip = (page - 1) * limit;

    const user = await getCurrentUser().catch(() => null);

    const where: Prisma.PlaylistWhereInput = {};

    if (userId) {
      where.userId = userId;
      // If fetching someone else's, only show public
      if (!user || user.id !== userId) {
        where.isPublic = true;
      }
    } else if (user) {
      // If no userId provided but logged in, show own playlists
      where.userId = user.id;
    } else {
      // If not logged in and no userId, show all public (discover)
      where.isPublic = true;
    }

    const [playlists, total] = await Promise.all([
      prisma.playlist.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: {
          user: { select: { id: true, name: true, username: true, image: true } },
          _count: { select: { items: true } },
          items: {
            take: 4, // Get up to 4 cover images for playlist preview
            orderBy: { sortOrder: "asc" },
            include: { manga: { select: { coverImage: true } } }
          }
        },
      }),
      prisma.playlist.count({ where }),
    ]);

    return NextResponse.json({
      data: playlists,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error fetching playlists:", error);
    return NextResponse.json({ error: "Failed to fetch playlists" }, { status: 500 });
  }
}

// POST /api/playlists - Create a new playlist
export async function POST(request: Request) {
  try {
    const { dbUserId } = await requireAuth();

    const body = await request.json();
    const result = createPlaylistSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    const { name, description, isPublic } = result.data;

    const playlist = await prisma.playlist.create({
      data: {
        name,
        description,
        isPublic,
        userId: dbUserId,
      },
      include: {
        _count: { select: { items: true } }
      }
    });

    return NextResponse.json({ success: true, data: playlist }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error creating playlist:", error);
    return NextResponse.json({ error: "Failed to create playlist" }, { status: 500 });
  }
}
