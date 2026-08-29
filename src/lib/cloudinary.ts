import "server-only";

import { randomUUID } from "node:crypto";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { z } from "zod";

const cloudinaryEnvironmentSchema = z.object({
  CLOUDINARY_CLOUD_NAME: z.string().trim().min(1),
  CLOUDINARY_API_KEY: z.string().trim().min(1),
  CLOUDINARY_API_SECRET: z.string().trim().min(1),
});

let configured = false;

function getCloudinary() {
  if (!configured) {
    const environment = cloudinaryEnvironmentSchema.parse(process.env);
    cloudinary.config({
      cloud_name: environment.CLOUDINARY_CLOUD_NAME,
      api_key: environment.CLOUDINARY_API_KEY,
      api_secret: environment.CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  }
  return cloudinary;
}

export interface StoredDocumentAsset {
  publicId: string;
  version: number;
  format: string;
  resourceType: string;
  deliveryType: string;
  bytes: number;
}

export async function uploadAuthenticatedDocument(
  buffer: Buffer,
  applicationId: string,
): Promise<StoredDocumentAsset> {
  const client = getCloudinary();
  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = client.uploader.upload_stream(
      {
        resource_type: "image",
        type: "authenticated",
        folder: `sih2k26/applications/${applicationId}`,
        public_id: randomUUID(),
        overwrite: false,
        use_filename: false,
      },
      (error, uploaded) => {
        if (error || !uploaded) reject(error ?? new Error("Cloudinary returned no upload result"));
        else resolve(uploaded);
      },
    );
    stream.end(buffer);
  });

  return {
    publicId: result.public_id,
    version: result.version,
    format: result.format,
    resourceType: result.resource_type,
    deliveryType: result.type,
    bytes: result.bytes,
  };
}

export async function deleteDocumentAsset(asset: {
  publicId: string;
  resourceType: string;
  deliveryType: string;
}) {
  const client = getCloudinary();
  await client.uploader.destroy(asset.publicId, {
    resource_type: asset.resourceType,
    type: asset.deliveryType,
    invalidate: true,
  });
}

export function createDocumentDownloadUrl(asset: {
  publicId: string;
  format: string;
  resourceType: string;
  deliveryType: string;
  filename: string;
}) {
  const client = getCloudinary();
  return client.utils.private_download_url(asset.publicId, asset.format, {
    resource_type: asset.resourceType,
    type: asset.deliveryType,
    expires_at: Math.floor(Date.now() / 1000) + 5 * 60,
    attachment: true,
  });
}
