import { requireAdmin, handleAdminError } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const adminUser = await requireAdmin();
    if (!adminUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const prefix = searchParams.get("prefix");

    const where = prefix ? { key: { startsWith: prefix } } : {};
    const settings = await prisma.siteSettings.findMany({ where, orderBy: { key: "asc" } });

    return NextResponse.json({ data: settings });
  } catch (error) {
    const adminErr = handleAdminError(error);
    if (adminErr) return adminErr;
    console.error("Error fetching settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminUser = await requireAdmin();
    if (!adminUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { key, value, type, description } = await request.json();
    if (!key || value === undefined) {
      return NextResponse.json({ error: "key and value are required" }, { status: 400 });
    }

    const setting = await prisma.siteSettings.upsert({
      where: { key },
      update: { value, type: type || "text", description },
      create: { key, value, type: type || "text", description },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: "UPDATE",
        entity: "SiteSettings",
        entityId: setting.id,
        newValues: JSON.stringify({ key, value }),
      },
    });

    return NextResponse.json({ success: true, data: setting });
  } catch (error) {
    const adminErr = handleAdminError(error);
    if (adminErr) return adminErr;
    console.error("Error updating settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
