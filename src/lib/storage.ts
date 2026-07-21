import "server-only";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Time-limited signed URLs for video/PDF media (FR-COURSE-03, expiry <= 3600s).
// Works with AWS S3 (no endpoint) and Cloudflare R2 (custom S3_ENDPOINT).

const MAX_EXPIRY = 3600; // seconds — hard cap per SRD

export function isStorageConfigured(): boolean {
  return Boolean(
    process.env.S3_BUCKET &&
      process.env.S3_ACCESS_KEY_ID &&
      process.env.S3_SECRET_ACCESS_KEY &&
      process.env.S3_REGION
  );
}

let cachedClient: S3Client | null = null;

function getClient(): S3Client {
  if (cachedClient) return cachedClient;
  cachedClient = new S3Client({
    region: process.env.S3_REGION!,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
    // R2 (and other S3-compatible stores) require an explicit endpoint.
    ...(process.env.S3_ENDPOINT
      ? { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true }
      : {}),
  });
  return cachedClient;
}

/**
 * Returns a presigned GET URL for the object, or null if storage isn't
 * configured (lets the UI degrade gracefully instead of throwing).
 */
export async function getSignedResourceUrl(
  fileKey: string,
  expiresIn: number = MAX_EXPIRY
): Promise<string | null> {
  if (!isStorageConfigured()) return null;

  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: fileKey,
  });

  return getSignedUrl(getClient(), command, {
    expiresIn: Math.min(expiresIn, MAX_EXPIRY),
  });
}

/**
 * Presigned PUT URL for uploading a subjective-test scan (PDF/image).
 * Null if storage isn't configured. Expiry capped at 3600s.
 */
export async function getSignedUploadUrl(
  fileKey: string,
  contentType: string,
  expiresIn: number = MAX_EXPIRY
): Promise<string | null> {
  if (!isStorageConfigured()) return null;

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: fileKey,
    ContentType: contentType,
  });

  return getSignedUrl(getClient(), command, {
    expiresIn: Math.min(expiresIn, MAX_EXPIRY),
  });
}
