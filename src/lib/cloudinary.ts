import { v2 as cloudinary } from "cloudinary";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Falta ${name} en variables de entorno.`);
  }
  return value;
}

let configured = false;

function ensureCloudinaryConfig() {
  if (configured) return;
  cloudinary.config({
    cloud_name: requireEnv("CLOUDINARY_CLOUD_NAME"),
    api_key: requireEnv("CLOUDINARY_API_KEY"),
    api_secret: requireEnv("CLOUDINARY_API_SECRET"),
    secure: true,
  });
  configured = true;
}

export async function uploadBufferToCloudinary(params: {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
}): Promise<{
  publicId: string;
  originalFilename: string | null;
  resourceType: string;
  secureUrl: string;
  format: string | null;
}> {
  ensureCloudinaryConfig();

  const folder = process.env.CLOUDINARY_UPLOAD_FOLDER?.trim() || undefined;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
        public_id: params.fileName,
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary no devolvió resultado."));
          return;
        }
        resolve({
          publicId: result.public_id,
          originalFilename: result.original_filename ?? null,
          resourceType: result.resource_type,
          secureUrl: result.secure_url,
          format: result.format ?? null,
        });
      },
    );
    stream.end(params.buffer);
  });
}

export async function deleteCloudinaryAsset(publicId: string): Promise<void> {
  ensureCloudinaryConfig();
  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
  await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
}
