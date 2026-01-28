import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({ region: process.env.AWS_REGION || "ap-southeast-5" });
const BUCKET = process.env.S3_KYC_BUCKET!;

// Default expiration for pre-signed URLs (1 hour)
const DEFAULT_PRESIGNED_EXPIRY_SECONDS = 3600;

export type DocumentType = "front_document" | "back_document" | "face_image" | "best_frame";

/**
 * Upload a KYC document to S3
 * Decodes base64 image and stores as JPEG
 * Skips upload if the file already exists (idempotent)
 */
export async function uploadKycDocument(
  clientId: string,
  sessionId: string,
  documentType: DocumentType,
  base64Data: string
): Promise<string> {
  const key = `kyc/${clientId}/${sessionId}/${documentType}.jpg`;

  // Check if file already exists - skip upload if it does
  const exists = await kycDocumentExists(key);
  if (exists) {
    console.log(`S3 document already exists, skipping upload: ${key}`);
    return key;
  }

  // Remove data URL prefix if present
  const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(cleanBase64, "base64");

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: "image/jpeg",
    })
  );

  console.log(`S3 document uploaded: ${key}`);
  return key;
}

/**
 * Get a KYC document from S3
 * Returns the image as a Buffer
 */
export async function getKycDocument(key: string): Promise<Buffer> {
  const response = await s3.send(
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );

  return Buffer.from(await response.Body!.transformToByteArray());
}

/**
 * Check if a KYC document exists in S3
 * Uses HeadObject which is more efficient than GetObject for existence checks
 */
export async function kycDocumentExists(key: string): Promise<boolean> {
  try {
    await s3.send(
      new HeadObjectCommand({
        Bucket: BUCKET,
        Key: key,
      })
    );
    return true;
  } catch (error) {
    // NotFound error means the object doesn't exist
    return false;
  }
}

/**
 * Generate a pre-signed URL for a KYC document
 * Returns a time-limited URL that allows direct access to the S3 object
 * @param key - The S3 object key
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 */
export async function getPresignedUrl(
  key: string,
  expiresIn: number = DEFAULT_PRESIGNED_EXPIRY_SECONDS
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  return getSignedUrl(s3, command, { expiresIn });
}

/**
 * Generate pre-signed URLs for multiple KYC document keys
 * Returns null for keys that are null/undefined
 * @param keys - Object with document type as key and S3 key as value
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 */
export async function getPresignedUrls(
  keys: Record<string, string | null>,
  expiresIn: number = DEFAULT_PRESIGNED_EXPIRY_SECONDS
): Promise<Record<string, string | null>> {
  const entries = Object.entries(keys);
  const results = await Promise.all(
    entries.map(async ([docType, key]) => {
      if (!key) return [docType, null] as const;
      const url = await getPresignedUrl(key, expiresIn);
      return [docType, url] as const;
    })
  );
  return Object.fromEntries(results);
}
