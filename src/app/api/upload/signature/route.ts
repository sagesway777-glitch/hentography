import { requireAdmin } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import { getUploadSignature } from "@/lib/cloudinary";

export async function GET(request: Request) {
  try {
    const adminUser = await requireAdmin();
    
    // Only admins can upload files in this architecture (manga covers/chapters)
    // If users can upload avatars, we'd need to adjust this
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const folder = searchParams.get("folder") || "hentaiplus";

    const signatureData = getUploadSignature(folder);

    return NextResponse.json(signatureData);
  } catch (error) {
    console.error("Signature error:", error);
    return NextResponse.json({ error: "Failed to generate signature" }, { status: 500 });
  }
}
