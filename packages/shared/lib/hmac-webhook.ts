import crypto from "crypto";

const REPLAY_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Verify HMAC-SHA256 signature for Kredit webhook requests.
 * Expected format: HMAC(secret, timestamp + "." + rawBody)
 * Headers: x-kredit-signature, x-kredit-timestamp
 */
export function verifyKreditWebhookSignature(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
  secret: string
): { valid: boolean; error?: string } {
  if (!signature || !timestamp) {
    return { valid: false, error: "Missing x-kredit-signature or x-kredit-timestamp header" };
  }

  const timestampNum = parseInt(timestamp, 10);
  if (isNaN(timestampNum)) {
    return { valid: false, error: "Invalid timestamp format" };
  }

  const now = Date.now();
  if (Math.abs(now - timestampNum) > REPLAY_WINDOW_MS) {
    return { valid: false, error: "Timestamp outside replay window" };
  }

  const payload = `${timestamp}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64");

  try {
    const valid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    return valid ? { valid: true } : { valid: false, error: "Invalid signature" };
  } catch {
    return { valid: false, error: "Signature verification failed" };
  }
}

/**
 * Generate HMAC-SHA256 signature for outbound webhooks to Kredit.
 * Format: HMAC(secret, timestamp + "." + rawBody)
 */
export function signOutboundWebhook(rawBody: string, secret: string): {
  signature: string;
  timestamp: string;
} {
  const timestamp = Date.now().toString();
  const payload = `${timestamp}.${rawBody}`;
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("base64");
  return { signature, timestamp };
}
