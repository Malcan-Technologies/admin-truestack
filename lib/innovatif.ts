import crypto from "crypto";

// Environment variables
const API_KEY = process.env.INNOVATIF_API_KEY!;
const PACKAGE_NAME = process.env.INNOVATIF_PACKAGE_NAME!;
const MD5_KEY = process.env.INNOVATIF_MD5_KEY!;
const CIPHERTEXT = process.env.INNOVATIF_CIPHERTEXT!; // 16 bytes IV (base64 encoded "123456789012")
const BASE_URL = process.env.INNOVATIF_BASE_URL || "https://staging.ekyc.xendity.com/v1/gateway";
const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || "http://localhost:3000";

const CIPHER_ALGORITHM = "aes-256-cbc";

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
 * Algorithm: base64(md5(api_key + md5_key + package_name + ref_id + md5_key + request_time))
 */
export function generateSignature(refId: string, requestTime: string): string {
  const source = API_KEY + MD5_KEY + PACKAGE_NAME + refId + MD5_KEY + requestTime;
  const md5Hash = crypto.createHash("md5").update(source).digest();
  return md5Hash.toString("base64");
}

/**
 * Encrypt request body using AES-256-CBC
 * Key: (CIPHERTEXT + API_KEY).substring(0, 32)
 * IV: CIPHERTEXT (decoded from base64)
 */
export function encryptRequest(body: object): string {
  // Decode CIPHERTEXT from base64 to get the actual IV bytes
  const ivBuffer = Buffer.from(CIPHERTEXT, "base64");
  
  // Key is (CIPHERTEXT decoded + API_KEY), truncated to 32 bytes
  const keySource = ivBuffer.toString() + API_KEY;
  const key = Buffer.from(keySource.substring(0, 32));
  
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
  // Decode CIPHERTEXT from base64 to get the actual IV bytes
  const ivBuffer = Buffer.from(CIPHERTEXT, "base64");
  
  // Key is (CIPHERTEXT decoded + API_KEY), truncated to 32 bytes
  const keySource = ivBuffer.toString() + API_KEY;
  const key = Buffer.from(keySource.substring(0, 32));
  
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

/**
 * Create a transaction on Innovatif eKYC Gateway
 */
export async function createInnovatifTransaction(params: {
  refId: string;
  documentName: string;
  documentNumber: string;
  documentType: string;
  sessionId: string;
}): Promise<{
  onboardingId: string;
  onboardingUrl: string;
}> {
  const requestTime = formatRequestTime();
  const signature = generateSignature(params.refId, requestTime);

  // Build request body per Innovatif API spec
  const requestBody = {
    api_key: API_KEY,
    package_name: PACKAGE_NAME,
    ref_id: params.refId,
    document_name: params.documentName,
    document_number: params.documentNumber,
    document_type: params.documentType,
    platform: "Web",
    signature: signature,
    response_url: `${BETTER_AUTH_URL}/r/${params.sessionId}`,
    backend_url: `${BETTER_AUTH_URL}/api/internal/webhooks/innovatif/ekyc`,
    callback_mode: "1", // Summary mode
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

  const result = await response.json();

  // Check for API-level errors
  if (result.status_code !== "200" && result.status_code !== 200) {
    console.error("Innovatif API returned error:", result);
    throw new Error(result.status_message || "Innovatif API returned error");
  }

  // Decrypt response data if encrypted
  let responseData = result;
  if (result.data && typeof result.data === "string") {
    try {
      responseData = decryptResponse(result.data) as Record<string, unknown>;
    } catch (e) {
      // If decryption fails, assume unencrypted response
      console.warn("Response decryption failed, using raw response");
    }
  }

  // Extract onboarding URL and ID
  const onboardingUrl = responseData.onboarding_url || responseData.url;
  const onboardingId = responseData.onboarding_id || responseData.transaction_id;

  if (!onboardingUrl || !onboardingId) {
    console.error("Missing onboarding data in response:", responseData);
    throw new Error("Invalid response from Innovatif API");
  }

  return {
    onboardingId: String(onboardingId),
    onboardingUrl: String(onboardingUrl),
  };
}

/**
 * Get transaction status from Innovatif
 */
export async function getInnovatifTransactionStatus(refId: string): Promise<{
  status: string;
  result?: string;
  data?: Record<string, unknown>;
}> {
  const requestTime = formatRequestTime();
  const signature = generateSignature(refId, requestTime);

  const requestBody = {
    api_key: API_KEY,
    package_name: PACKAGE_NAME,
    ref_id: refId,
    signature: signature,
    request_time: requestTime,
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

  const result = await response.json();

  let responseData = result;
  if (result.data && typeof result.data === "string") {
    try {
      responseData = decryptResponse(result.data) as Record<string, unknown>;
    } catch (e) {
      console.warn("Response decryption failed, using raw response");
    }
  }

  return {
    status: responseData.status || result.status_code,
    result: responseData.result,
    data: responseData,
  };
}
