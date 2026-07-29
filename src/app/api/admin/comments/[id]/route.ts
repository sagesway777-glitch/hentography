import { requireAdmin, handleAdminError } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminUser = await requireAdmin();
    if (!adminUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    const comment = await prisma.comment.update({
      where: { id },
      data: {
        isApproved: body.isApproved,
        isHidden: body.isHidden,
      },
    });

    return NextResponse.json({ success: true, data: comment });
  } catch (error) {
    const adminErr = handleAdminError(error);
    if (adminErr) return adminErr;
    return NextResponse.json({ error: "Failed to update comment" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminUser = await requireAdmin();
    if (!adminUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await prisma.comment.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    const adminErr = handleAdminError(error);
    if (adminErr) return adminErr;
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}
