import { requireAdmin, handleAdminError } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const adminUser = await requireAdmin();
    if (!adminUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const [ads, total] = await Promise.all([
      prisma.advertisement.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.advertisement.count(),
    ]);

    return NextResponse.json({
      data: ads,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    const adminErr = handleAdminError(error);
    if (adminErr) return adminErr;
    return NextResponse.json({ error: "Failed to fetch ads" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminUser = await requireAdmin();
    if (!adminUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();

    const ad = await prisma.advertisement.create({
      data: {
        name: body.name,
        type: body.type,
        position: body.position,
        content: body.content || "",
        imageUrl: body.imageUrl,
        linkUrl: body.linkUrl,
        isActive: body.isActive ?? true,
        isDraft: body.isDraft ?? false,
        priority: body.priority || 0,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
      },
    });

    return NextResponse.json({ success: true, data: ad }, { status: 201 });
  } catch (error) {
    const adminErr = handleAdminError(error);
    if (adminErr) return adminErr;
    return NextResponse.json({ error: "Failed to create ad" }, { status: 500 });
  }
}
