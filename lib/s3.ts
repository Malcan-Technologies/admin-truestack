import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({ region: process.env.AWS_REGION || "ap-southeast-5" });
const BUCKET = process.env.S3_KYC_BUCKET!;

export type DocumentType = "front_document" | "back_document" | "face_image" | "best_frame";

/**
 * Upload a KYC document to S3
 * Decodes base64 image and stores as JPEG
 */
export async function uploadKycDocument(
  clientId: string,
  sessionId: string,
  documentType: DocumentType,
  base64Data: string
): Promise<string> {
  // Remove data URL prefix if present
  const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(cleanBase64, "base64");
  const key = `kyc/${clientId}/${sessionId}/${documentType}.jpg`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: "image/jpeg",
    })
  );

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
 */
export async function kycDocumentExists(key: string): Promise<boolean> {
  try {
    await s3.send(
      new GetObjectCommand({
        Bucket: BUCKET,
        Key: key,
      })
    );
    return true;
  } catch (error) {
    return false;
  }
}
