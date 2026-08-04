import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import AdmZip from "adm-zip";
import fs from "fs/promises";
import path from "path";
import os from "os";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  let tempFilePath = "";
  try {
    const cookieStore = await cookies();
    const adminToken = cookieStore.get("admin_token")?.value;

    if (!adminToken) {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const decoded = jwt.verify(adminToken, process.env.JWT_SECRET!) as jwt.JwtPayload & { role?: string };
      if (decoded.role !== "ADMIN" && decoded.role !== "MODERATOR") {
         return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    } catch(err) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const mangaId = formData.get("mangaId") as string;
    const chapterNumber = formData.get("chapterNumber") as string;

    if (!file || !mangaId || !chapterNumber) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!file.name.endsWith(".zip")) {
      return NextResponse.json({ error: "Only ZIP files are supported" }, { status: 400 });
    }

    // Save ZIP to temp file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const tempDir = os.tmpdir();
    tempFilePath = path.join(tempDir, `${crypto.randomBytes(16).toString("hex")}.zip`);
    await fs.writeFile(tempFilePath, buffer);

    // Extract ZIP
    const zip = new AdmZip(tempFilePath);
    const zipEntries = zip.getEntries();

    const imageEntries = zipEntries.filter(entry => {
      const ext = path.extname(entry.entryName).toLowerCase();
      return !entry.isDirectory && [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext);
    });

    if (imageEntries.length === 0) {
      return NextResponse.json({ error: "No images found in ZIP file" }, { status: 400 });
    }

    // Sort entries logically (e.g. 1.jpg, 2.jpg)
    imageEntries.sort((a, b) => {
      return a.entryName.localeCompare(b.entryName, undefined, { numeric: true, sensitivity: 'base' });
    });

    const folder = `hentography/manga/${mangaId}/chapter-${chapterNumber}`;
    const uploadPromises = imageEntries.map(async (entry, index) => {
      const imgBuffer = entry.getData();
      
      return new Promise<{ pageNumber: number, url: string, publicId: string }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: "image",
            // Use index as name to keep order easily identifiable in Cloudinary
            public_id: `page_${(index + 1).toString().padStart(3, '0')}`,
          },
          (error, result) => {
            if (error) return reject(error);
            if (!result) return reject(new Error("No result from Cloudinary"));
            
            resolve({
              pageNumber: index + 1,
              url: result.secure_url,
              publicId: result.public_id,
            });
          }
        );
        stream.end(imgBuffer);
      });
    });

    // Upload in parallel
    const uploadedPages = await Promise.all(uploadPromises);

    return NextResponse.json({
      success: true,
      pages: uploadedPages.sort((a, b) => a.pageNumber - b.pageNumber),
    });
  } catch (error) {
    console.error("ZIP Upload error:", error);
    return NextResponse.json({ error: "Failed to process ZIP upload" }, { status: 500 });
  } finally {
    // Cleanup
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (e) {
        console.error("Failed to delete temp file:", e);
      }
    }
  }
}
