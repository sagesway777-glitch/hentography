import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { id, type } = await request.json();

    if (!id || !type) {
      return NextResponse.json({ error: "Missing id or type" }, { status: 400 });
    }

    if (type === "impression") {
      await prisma.advertisement.update({
        where: { id },
        data: { impressions: { increment: 1 } },
      });
    } else if (type === "click") {
      await prisma.advertisement.update({
        where: { id },
        data: { clicks: { increment: 1 } },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to track ad" }, { status: 500 });
  }
}
