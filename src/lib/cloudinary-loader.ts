"use client";

export default function cloudinaryLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}) {
  // If it's already a full cloudinary URL or external URL, just return it
  if (src.startsWith("http")) return src;

  const params = ["f_auto", "c_limit", `w_${width}`, `q_${quality || "auto"}`];
  
  return `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/${params.join(",")}/${src}`;
}
