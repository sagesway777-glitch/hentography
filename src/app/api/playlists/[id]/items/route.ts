import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, getCurrentUser } from "@/lib/auth-helpers";
import { z } from "zod";

const addItemSchema = z.object({
  mangaId: z.string().min(1),
});

const updateSortSchema = z.object({
  items: z.array(z.object({
    id: z.string().min(1), // PlaylistItem ID
    sortOrder: z.number().int(),
  })),
});

// GET /api/playlists/[id]/items - Get items in a playlist
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser().catch(() => null);

    const playlist = await prisma.playlist.findUnique({
      where: { id },
      select: { isPublic: true, userId: true },
    });

    if (!playlist) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
    }

    if (!playlist.isPublic) {
      if (!user || user.id !== playlist.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.playlistItem.findMany({
        where: { playlistId: id },
        skip,
        take: limit,
        orderBy: [{ sortOrder: "asc" }, { addedAt: "desc" }],
        include: {
          manga: {
            select: {
              id: true, title: true, slug: true, coverImage: true,
              status: true, averageRating: true,
              chapters: { where: { isPublished: true }, orderBy: { chapterNumber: "desc" }, take: 1, select: { chapterNumber: true } }
            },
          },
        },
      }),
      prisma.playlistItem.count({ where: { playlistId: id } }),
    ]);

    return NextResponse.json({
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error fetching playlist items:", error);
    return NextResponse.json({ error: "Failed to fetch playlist items" }, { status: 500 });
  }
}

// POST /api/playlists/[id]/items - Add item to playlist
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { dbUserId } = await requireAuth();
    const { id } = await params;

    const playlist = await prisma.playlist.findUnique({ where: { id } });

    if (!playlist) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
    }

    if (playlist.userId !== dbUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const result = addItemSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    const { mangaId } = result.data;

    const manga = await prisma.manga.findUnique({ where: { id: mangaId, isDraft: false }, select: { id: true } });
    if (!manga) {
      return NextResponse.json({ error: "Manga not found" }, { status: 404 });
    }

    // Get current max sortOrder
    const maxSort = await prisma.playlistItem.aggregate({
      where: { playlistId: id },
      _max: { sortOrder: true },
    });
    const nextSort = (maxSort._max.sortOrder ?? -1) + 1;

    const item = await prisma.playlistItem.create({
      data: {
        playlistId: id,
        mangaId,
        sortOrder: nextSort,
      },
      include: {
        manga: { select: { title: true, coverImage: true } }
      }
    });

    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: "Manga is already in this playlist" }, { status: 400 });
    }
    console.error("Error adding item to playlist:", error);
    return NextResponse.json({ error: "Failed to add item" }, { status: 500 });
  }
}

// DELETE /api/playlists/[id]/items?mangaId=xxx - Remove item from playlist
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { dbUserId } = await requireAuth();
    const { id } = await params;

    const playlist = await prisma.playlist.findUnique({ where: { id } });

    if (!playlist) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
    }

    if (playlist.userId !== dbUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const mangaId = searchParams.get("mangaId");

    if (!mangaId) {
      return NextResponse.json({ error: "mangaId is required" }, { status: 400 });
    }

    await prisma.playlistItem.delete({
      where: {
        playlistId_mangaId: {
          playlistId: id,
          mangaId,
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: "Item not found in playlist" }, { status: 404 });
    }
    console.error("Error removing item:", error);
    return NextResponse.json({ error: "Failed to remove item" }, { status: 500 });
  }
}

// PUT /api/playlists/[id]/items - Update sort order
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { dbUserId } = await requireAuth();
    const { id } = await params;

    const playlist = await prisma.playlist.findUnique({ where: { id } });

    if (!playlist) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
    }

    if (playlist.userId !== dbUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const result = updateSortSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    const { items } = result.data;

    // Use transaction to update all items efficiently
    await prisma.$transaction(
      items.map(item => 
        prisma.playlistItem.update({
          where: { id: item.id, playlistId: id },
          data: { sortOrder: item.sortOrder }
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error updating sort order:", error);
    return NextResponse.json({ error: "Failed to update sort order" }, { status: 500 });
  }
}
