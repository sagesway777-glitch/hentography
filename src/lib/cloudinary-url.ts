export function optimizeCloudinaryUrl(src: string, width?: number): string {
  if (!src || !src.includes("res.cloudinary.com")) {
    return src;
  }

  // Insert standard optimization flags: format auto, quality auto
  const params = ["f_auto", "q_auto"];
  
  if (width) {
    params.push("c_limit");
    params.push(`w_${width}`);
  }

  const parts = src.split("/upload/");
  if (parts.length === 2) {
    return `${parts[0]}/upload/${params.join(",")}/${parts[1]}`;
  }

  return src;
}
