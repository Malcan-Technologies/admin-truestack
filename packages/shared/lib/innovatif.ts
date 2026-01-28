import crypto from "crypto";

// Environment variables
const API_KEY = process.env.INNOVATIF_API_KEY!;
const PACKAGE_NAME = process.env.INNOVATIF_PACKAGE_NAME!;
const MD5_KEY = process.env.INNOVATIF_MD5_KEY!;
const CIPHERTEXT = process.env.INNOVATIF_CIPHERTEXT!; // 16 bytes IV (base64 encoded "123456789012")
const BASE_URL = process.env.INNOVATIF_BASE_URL || "https://staging.ekyc.xendity.com/v1/gateway";

const CIPHER_ALGORITHM = "aes-256-cbc";

// Type for Innovatif API responses
interface InnovatifApiResponse {
  success?: boolean;
  status_code?: string | number;
  status_message?: string;
  data?: string | { message?: string; [key: string]: unknown };
  [key: string]: unknown;
}

/**
 * Format date for Innovatif API
 * Format: "YYYY-MM-DD HH:mm:ss"
 */
function formatRequestTime(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * Generate signature for Innovatif API
 * Algorithm: base64(md5_hex(api_key + md5_key + package_name + ref_id + md5_key + request_time))
 * 
 * Note: PHP's md5() returns a hex string by default, then base64_encode() encodes that.
 * So we need: base64(md5_as_hex_string), not base64(md5_raw_bytes)
 */
export function generateSignature(refId: string, requestTime: string): string {
  const source = API_KEY + MD5_KEY + PACKAGE_NAME + refId + MD5_KEY + requestTime;
  // Get MD5 as hex string (like PHP's md5() default)
  const md5Hex = crypto.createHash("md5").update(source).digest("hex");
  // Base64 encode the hex string (not the raw bytes)
  return Buffer.from(md5Hex).toString("base64");
}

/**
 * Encrypt request body using AES-256-CBC
 * Key: (CIPHERTEXT + API_KEY).substring(0, 32) - using the base64 string directly
 * IV: CIPHERTEXT as UTF-8 bytes (the 16-char base64 string, not decoded)
 * 
 * Note: Innovatif's PHP uses the base64 string itself as both IV and key prefix,
 * NOT the decoded value. The base64 string "MTIzNDU2Nzg5MDEy" is 16 chars = 16 bytes.
 */
export function encryptRequest(body: object): string {
  // Use CIPHERTEXT as UTF-8 string (16 chars = 16 bytes for AES-256-CBC IV)
  const ivBuffer = Buffer.from(CIPHERTEXT, "utf8");
  
  // Key is (CIPHERTEXT + API_KEY), truncated to 32 bytes
  const keySource = CIPHERTEXT + API_KEY;
  const key = Buffer.from(keySource.substring(0, 32), "utf8");
  
  const json = JSON.stringify(body);
  const cipher = crypto.createCipheriv(CIPHER_ALGORITHM, key, ivBuffer);
  
  let encrypted = cipher.update(json, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  return encrypted.toString("base64");
}

/**
 * Decrypt response data using AES-256-CBC
 */
export function decryptResponse(encryptedData: string): unknown {
  // Use CIPHERTEXT as UTF-8 string (16 chars = 16 bytes for AES-256-CBC IV)
  const ivBuffer = Buffer.from(CIPHERTEXT, "utf8");
  
  // Key is (CIPHERTEXT + API_KEY), truncated to 32 bytes
  const keySource = CIPHERTEXT + API_KEY;
  const key = Buffer.from(keySource.substring(0, 32), "utf8");
  
  const decipher = crypto.createDecipheriv(CIPHER_ALGORITHM, key, ivBuffer);
  
  let decrypted = decipher.update(Buffer.from(encryptedData, "base64"));
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return JSON.parse(decrypted.toString("utf8"));
}

/**
 * Verify Innovatif webhook signature
 */
export function verifyWebhookSignature(
  signature: string,
  refId: string,
  requestTime: string
): boolean {
  const expectedSignature = generateSignature(refId, requestTime);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Valid platform values for Innovatif API
export type InnovatifPlatform = "Web" | "iOS" | "Android";

/**
 * Create a transaction on Innovatif eKYC Gateway
 */
export async function createInnovatifTransaction(
  params: {
    refId: string;
    documentName: string;
    documentNumber: string;
    documentType: string;
    sessionId: string;
    platform?: InnovatifPlatform;
  },
  backendUrl: string,
  coreUrl?: string
): Promise<{
  onboardingId: string;
  onboardingUrl: string;
  innovatifRefId?: string; // Prefixed ref_id from Innovatif - use for get-status API
}> {
  const requestTime = formatRequestTime();
  const signature = generateSignature(params.refId, requestTime);

  // Use core URL for user-facing redirect, backend URL for webhooks
  const redirectBaseUrl = coreUrl || backendUrl;

  // Build request body per Innovatif API spec
  // Default platform to "Web" if not specified
  const webhookUrl = `${backendUrl}/api/internal/webhooks/innovatif/ekyc`;
  const responseUrl = `${redirectBaseUrl}/r/${params.sessionId}`;
  
  console.log(`[Innovatif] Creating transaction with webhook URL: ${webhookUrl}`);
  console.log(`[Innovatif] Response URL: ${responseUrl}`);
  
  const requestBody = {
    api_key: API_KEY,
    package_name: PACKAGE_NAME,
    ref_id: params.refId,
    document_name: params.documentName,
    document_number: params.documentNumber,
    document_type: params.documentType,
    platform: params.platform || "Web",
    signature: signature,
    response_url: responseUrl,
    backend_url: webhookUrl,
    callback_mode: "2", // Detail mode - matches get-status API response format
    response_mode: "1", // With queries
    request_time: requestTime,
  };

  // Encrypt the request
  const encryptedData = encryptRequest(requestBody);

  // Make the API call
  const response = await fetch(`${BASE_URL}/create-transaction`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: API_KEY,
      data: encryptedData,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Innovatif API error:", response.status, errorText);
    throw new Error(`Innovatif API error: ${response.status}`);
  }

  const result = await response.json() as InnovatifApiResponse;

  // Check for API-level errors
  // Innovatif API can return either:
  // - { success: true, data: "encrypted_string" }
  // - { status_code: 200, ... }
  // - { success: false, data: { message: "error" } }
  const isSuccess = result.success === true || 
                    result.status_code === "200" || 
                    result.status_code === 200;
  
  if (!isSuccess) {
    console.error("Innovatif API returned error:", result);
    const errorData = typeof result.data === "object" ? result.data : undefined;
    const errorMessage = errorData?.message || result.status_message || "Innovatif API returned error";
    throw new Error(errorMessage);
  }

  // Decrypt response data if encrypted
  let responseData: Record<string, unknown> = result;
  if (result.data && typeof result.data === "string") {
    try {
      responseData = decryptResponse(result.data) as Record<string, unknown>;
      console.log("Decrypted Innovatif response:", responseData);
    } catch (e) {
      // If decryption fails, assume unencrypted response
      console.warn("Response decryption failed, using raw response:", e);
    }
  }

  // Extract onboarding URL, ID, and prefixed ref_id
  const onboardingUrl = responseData.onboarding_url || responseData.url;
  const onboardingId = responseData.onboarding_id || responseData.transaction_id;
  // Innovatif prepends a prefix to our ref_id - we need to store this for get-status API
  const prefixedRefId = responseData.ref_id;

  if (!onboardingUrl || !onboardingId) {
    console.error("Missing onboarding data in response:", responseData);
    throw new Error("Invalid response from Innovatif API");
  }

  return {
    onboardingId: String(onboardingId),
    onboardingUrl: String(onboardingUrl),
    // The prefixed ref_id from Innovatif - use this for get-status API calls
    innovatifRefId: prefixedRefId ? String(prefixedRefId) : undefined,
  };
}

/**
 * Get transaction status from Innovatif
 * @param refId - Our reference ID for the session
 * @param onboardingId - Innovatif's onboarding ID (required per their API docs)
 * @param platform - Platform used for the session (Web/iOS/Android)
 * @param mode - Response mode: 1=Summary (recommended), 2=Detail with images
 */
export async function getInnovatifTransactionStatus(
  refId: string,
  onboardingId: string,
  platform: InnovatifPlatform = "Web",
  mode: 1 | 2 = 1
): Promise<{
  status: string;
  result?: string;
  data?: Record<string, unknown>;
}> {
  const requestTime = formatRequestTime();
  const signature = generateSignature(refId, requestTime);

  // All fields are mandatory per Innovatif API docs
  const requestBody = {
    api_key: API_KEY,
    package_name: PACKAGE_NAME,
    ref_id: refId,
    onboarding_id: onboardingId,
    platform: platform,
    signature: signature,
    request_time: requestTime,
    mode: mode,
  };

  const encryptedData = encryptRequest(requestBody);

  const response = await fetch(`${BASE_URL}/get-status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: API_KEY,
      data: encryptedData,
    }),
  });

  if (!response.ok) {
    throw new Error(`Innovatif API error: ${response.status}`);
  }

  const result = await response.json() as InnovatifApiResponse;

  // Check for API-level errors (unencrypted error responses)
  if (result.success === false && typeof result.data === "object") {
    const errorData = result.data as { message?: string };
    throw new Error(errorData.message || "Innovatif API returned error");
  }

  let responseData: Record<string, unknown> = result;
  if (result.data && typeof result.data === "string") {
    try {
      responseData = decryptResponse(result.data) as Record<string, unknown>;
      console.log("Innovatif get-status response:", responseData);
    } catch (e) {
      console.warn("Response decryption failed, using raw response");
    }
  }

  return {
    status: String(responseData.status || result.status_code || ""),
    result: responseData.result as string | undefined,
    data: responseData,
  };
}
