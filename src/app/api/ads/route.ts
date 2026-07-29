import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const position = searchParams.get("position");

    if (!position) {
      return NextResponse.json({ error: "Position is required" }, { status: 400 });
    }

    const now = new Date();
    
    // Fetch active ads for position that are not drafts, and within date bounds if set
    const ads = await prisma.advertisement.findMany({
      where: {
        position: position as any,
        isActive: true,
        isDraft: false,
        OR: [
          { startDate: null },
          { startDate: { lte: now } }
        ],
        AND: [
          { OR: [{ endDate: null }, { endDate: { gte: now } }] }
        ]
      },
      orderBy: { priority: "desc" },
      take: 1, // Currently only taking the top priority ad
    });

    if (ads.length === 0) {
      return NextResponse.json({ data: null });
    }

    return NextResponse.json({ data: ads[0] });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch ad" }, { status: 500 });
  }
}
