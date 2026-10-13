import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListBucketsCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "chess-platform-storage";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

// Initialize S3 Client targeting Cloudflare R2 endpoint
export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export interface PresignedUploadResponse {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  bucket: string;
}

/**
 * Generates a presigned PUT URL for direct browser-to-R2 upload
 */
export async function createPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresInSeconds: number = 300
): Promise<PresignedUploadResponse> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(r2Client, command, {
    expiresIn: expiresInSeconds,
  });

  const publicUrl = R2_PUBLIC_URL
    ? `${R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`
    : uploadUrl.split("?")[0]; // Fallback to bucket direct path

  return {
    uploadUrl,
    publicUrl,
    key,
    bucket: R2_BUCKET_NAME,
  };
}

/**
 * Generates a temporary presigned download URL for private files
 */
export async function createPresignedDownloadUrl(
  key: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(r2Client, command, { expiresIn: expiresInSeconds });
}

/**
 * Deletes an object from the R2 bucket
 */
export async function deleteR2Object(key: string): Promise<boolean> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });
    await r2Client.send(command);
    return true;
  } catch (error) {
    console.error("Failed to delete R2 object:", error);
    return false;
  }
}

/**
 * Lists all buckets associated with the R2 token
 */
export async function listR2Buckets() {
  try {
    const command = new ListBucketsCommand({});
    const response = await r2Client.send(command);
    return response.Buckets || [];
  } catch (error) {
    console.error("Failed to list R2 buckets:", error);
    throw error;
  }
}
