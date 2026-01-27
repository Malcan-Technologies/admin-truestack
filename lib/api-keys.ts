import crypto from "crypto";

const KEY_ENCRYPTION_SECRET = process.env.API_KEY_ENCRYPTION_SECRET!;

export interface GeneratedApiKey {
  key: string;
  hash: string;
  encrypted: string;
  prefix: string;
  suffix: string;
}

/**
 * Generate a new API key for a product
 * Format: {product_prefix}_{environment}_{32 random chars}
 * Example: ti_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
 */
export function generateApiKey(
  productPrefix: string,
  environment: "live" | "test"
): GeneratedApiKey {
  const random = crypto.randomBytes(24).toString("base64url").substring(0, 32);
  const key = `${productPrefix}_${environment}_${random}`;

  return {
    key,
    hash: hashApiKey(key),
    encrypted: encryptKey(key),
    prefix: key.substring(0, 12), // "ti_live_a1b2"
    suffix: key.substring(key.length - 4), // "o5p6"
  };
}

/**
 * Hash an API key using SHA256 for fast lookup
 */
export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

/**
 * Encrypt an API key using AES-256-GCM for secure storage
 * Returns: iv:authTag:encryptedData (all base64 encoded)
 */
function encryptKey(key: string): string {
  if (!KEY_ENCRYPTION_SECRET || KEY_ENCRYPTION_SECRET.length !== 64) {
    throw new Error(
      "API_KEY_ENCRYPTION_SECRET must be a 64-character hex string (32 bytes)"
    );
  }

  const iv = crypto.randomBytes(16);
  const secretBuffer = Buffer.from(KEY_ENCRYPTION_SECRET, "hex");
  const cipher = crypto.createCipheriv("aes-256-gcm", secretBuffer, iv);

  let encrypted = cipher.update(key, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted}`;
}

/**
 * Decrypt an API key for admin reveal functionality
 */
export function decryptKey(encryptedData: string): string {
  if (!KEY_ENCRYPTION_SECRET || KEY_ENCRYPTION_SECRET.length !== 64) {
    throw new Error(
      "API_KEY_ENCRYPTION_SECRET must be a 64-character hex string (32 bytes)"
    );
  }

  const [ivB64, tagB64, data] = encryptedData.split(":");
  if (!ivB64 || !tagB64 || !data) {
    throw new Error("Invalid encrypted key format");
  }

  const secretBuffer = Buffer.from(KEY_ENCRYPTION_SECRET, "hex");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    secretBuffer,
    Buffer.from(ivB64, "base64")
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));

  let decrypted = decipher.update(data, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Validate an API key by hashing and comparing
 * Returns the key data if valid, null otherwise
 */
export async function validateApiKey(
  apiKey: string,
  queryFn: (hash: string) => Promise<{
    id: string;
    client_id: string;
    product_id: string;
    status: string;
  } | null>
): Promise<{
  id: string;
  clientId: string;
  productId: string;
} | null> {
  const hash = hashApiKey(apiKey);
  const keyData = await queryFn(hash);

  if (!keyData || keyData.status !== "active") {
    return null;
  }

  return {
    id: keyData.id,
    clientId: keyData.client_id,
    productId: keyData.product_id,
  };
}

/**
 * Format API key for display (showing only prefix and suffix)
 */
export function formatKeyForDisplay(prefix: string, suffix: string): string {
  const hiddenLength = 32 - prefix.length - suffix.length + 8; // approximate
  return `${prefix}${"•".repeat(Math.max(8, hiddenLength))}${suffix}`;
}
