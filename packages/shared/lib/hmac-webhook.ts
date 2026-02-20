import crypto from "crypto";

const REPLAY_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

const HEX_SHA256_LENGTH = 64; // 32 bytes as hex

function isHexString(s: string, length: number): boolean {
  return s.length === length && /^[0-9a-fA-F]+$/.test(s);
}

/**
 * Verify HMAC-SHA256 signature for Kredit webhook requests.
 * Accepts x-kredit-signature as either base64 (44 chars) or hex (64 chars).
 * Payload: HMAC(secret, timestamp + "." + rawBody)
 * Headers: x-kredit-signature, x-kredit-timestamp (unix ms)
 */
export function verifyKreditWebhookSignature(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
  secret: string
): { valid: boolean; error?: string } {
  const sig = signature?.trim() ?? "";
  const ts = timestamp?.trim() ?? "";

  if (!sig || !ts) {
    return { valid: false, error: "Missing x-kredit-signature or x-kredit-timestamp header" };
  }

  const timestampNum = parseInt(ts, 10);
  if (isNaN(timestampNum)) {
    return { valid: false, error: "Invalid timestamp format" };
  }

  const now = Date.now();
  if (Math.abs(now - timestampNum) > REPLAY_WINDOW_MS) {
    return { valid: false, error: "Timestamp outside replay window" };
  }

  const payload = `${ts}.${rawBody}`;
  const expectedRaw = crypto.createHmac("sha256", secret).update(payload).digest();

  let sigBuf: Buffer;
  let expectedBuf: Buffer;
  if (isHexString(sig, HEX_SHA256_LENGTH)) {
    try {
      sigBuf = Buffer.from(sig, "hex");
    } catch {
      return { valid: false, error: "Invalid hex signature" };
    }
    expectedBuf = expectedRaw;
  } else {
    // base64 (typically 44 chars)
    const expectedBase64 = expectedRaw.toString("base64");
    sigBuf = Buffer.from(sig);
    expectedBuf = Buffer.from(expectedBase64);
    if (sigBuf.length !== expectedBuf.length) {
      return {
        valid: false,
        error: `Signature length ${sig.length} is not base64 (44) or hex (64). Use HMAC-SHA256 then encode as base64 or hex.`,
      };
    }
  }

  try {
    const valid =
      sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf);
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
