import { requireAdmin, handleAdminError } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();

    const { id } = await params;
    const ad = await prisma.advertisement.findUnique({ where: { id } });

    if (!ad) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ data: ad });
  } catch (error) {
    const adminErr = handleAdminError(error);
    if (adminErr) return adminErr;
    return NextResponse.json({ error: "Failed to fetch ad" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();

    const { id } = await params;
    const body = await request.json();

    const updateData: Prisma.AdvertisementUpdateInput = { ...body };
    if (body.startDate) updateData.startDate = new Date(body.startDate);
    if (body.endDate) updateData.endDate = new Date(body.endDate);

    const ad = await prisma.advertisement.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: ad });
  } catch (error) {
    const adminErr = handleAdminError(error);
    if (adminErr) return adminErr;
    return NextResponse.json({ error: "Failed to update ad" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();

    const { id } = await params;
    await prisma.advertisement.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    const adminErr = handleAdminError(error);
    if (adminErr) return adminErr;
    return NextResponse.json({ error: "Failed to delete ad" }, { status: 500 });
  }
}
