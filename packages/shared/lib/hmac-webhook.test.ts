import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  verifyKreditWebhookSignature,
  signOutboundWebhook,
} from "./hmac-webhook";

describe("verifyKreditWebhookSignature", () => {
  const secret = "test-secret-key";
  const rawBody = '{"tenant_id":"t1","borrower_id":"b1"}';

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-02-18T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects missing signature header", () => {
    const result = verifyKreditWebhookSignature(rawBody, null, "1739793600000", secret);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Missing");
  });

  it("rejects missing timestamp header", () => {
    const result = verifyKreditWebhookSignature(rawBody, "abc123", null, secret);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Missing");
  });

  it("rejects invalid timestamp format", () => {
    const result = verifyKreditWebhookSignature(rawBody, "abc123", "not-a-number", secret);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid timestamp");
  });

  it("rejects timestamp outside replay window (too old)", () => {
    const sixMinutesAgo = Date.now() - 6 * 60 * 1000;
    const payload = `${sixMinutesAgo}.${rawBody}`;
    const crypto = require("crypto");
    const signature = crypto.createHmac("sha256", secret).update(payload).digest("base64");
    const result = verifyKreditWebhookSignature(
      rawBody,
      signature,
      sixMinutesAgo.toString(),
      secret
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain("replay window");
  });

  it("rejects timestamp outside replay window (future)", () => {
    const sixMinutesLater = Date.now() + 6 * 60 * 1000;
    const payload = `${sixMinutesLater}.${rawBody}`;
    const crypto = require("crypto");
    const signature = crypto.createHmac("sha256", secret).update(payload).digest("base64");
    const result = verifyKreditWebhookSignature(
      rawBody,
      signature,
      sixMinutesLater.toString(),
      secret
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain("replay window");
  });

  it("rejects invalid signature", () => {
    const timestamp = Date.now().toString();
    const payload = `${timestamp}.${rawBody}`;
    const crypto = require("crypto");
    const validSig = crypto.createHmac("sha256", secret).update(payload).digest("base64");
    const invalidSig = validSig.slice(0, -1) + (validSig.slice(-1) === "A" ? "B" : "A");
    const result = verifyKreditWebhookSignature(rawBody, invalidSig, timestamp, secret);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Invalid signature|Signature verification failed/);
  });

  it("accepts valid signature within replay window", () => {
    const { signature, timestamp } = signOutboundWebhook(rawBody, secret);
    const result = verifyKreditWebhookSignature(rawBody, signature, timestamp, secret);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

describe("signOutboundWebhook", () => {
  it("produces signature and timestamp", () => {
    const rawBody = '{"event":"payment.recorded"}';
    const { signature, timestamp } = signOutboundWebhook(rawBody, "secret");
    expect(signature).toBeDefined();
    expect(signature.length).toBeGreaterThan(0);
    expect(timestamp).toBeDefined();
    expect(parseInt(timestamp, 10)).toBeGreaterThan(0);
  });

  it("produces verifiable signature", () => {
    const rawBody = '{"tenant_id":"t1"}';
    const secret = "my-secret";
    const { signature, timestamp } = signOutboundWebhook(rawBody, secret);
    const result = verifyKreditWebhookSignature(rawBody, signature, timestamp, secret);
    expect(result.valid).toBe(true);
  });
});
