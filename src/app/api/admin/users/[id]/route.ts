import { requireAdmin, handleAdminError } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminUser = await requireAdmin();
    if (!adminUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { role, status } = body;

    const data: any = {};
    if (role) data.role = role;
    if (status) data.status = status;

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, status: true },
    });

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    const adminErr = handleAdminError(error);
    if (adminErr) return adminErr;
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
