import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadToCloudinary(
  file: Buffer | string,
  folder: string = "hentography"
): Promise<{ secure_url: string; public_id: string }> {
  const uploadOptions: any = {
    folder,
    resource_type: "auto",
    transformation: [
      { quality: "auto" },
      { fetch_format: "auto" },
    ],
  };

  if (Buffer.isBuffer(file)) {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(uploadOptions, (error: any, result: any) => {
        if (error) return reject(error);
        if (!result) return reject(new Error("Upload failed"));
        resolve({ secure_url: result.secure_url, public_id: result.public_id });
      });
      Readable.from(file).pipe(stream);
    });
  }

  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(file, uploadOptions, (error: any, result: any) => {
      if (error) return reject(error);
      if (!result) return reject(new Error("Upload failed"));
      resolve({ secure_url: result.secure_url, public_id: result.public_id });
    });
  });
}



export function getUploadSignature(folder: string = "hentography") {
  const timestamp = Math.round(new Date().getTime() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp,
      folder,
    },
    process.env.CLOUDINARY_API_SECRET!
  );

  return {
    timestamp,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
  };
}

export default cloudinary;
