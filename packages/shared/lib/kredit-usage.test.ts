import { describe, it, expect } from "vitest";
import {
  computeUsageFromVerificationCount,
  CREDITS_PER_VERIFICATION,
  CREDITS_PER_MYR,
} from "./kredit-usage";

describe("computeUsageFromVerificationCount", () => {
  it("returns 0 credits and 0 MYR for 0 verifications", () => {
    const result = computeUsageFromVerificationCount(0);
    expect(result.usageCredits).toBe(0);
    expect(result.usageAmountMyr).toBe(0);
  });

  it("returns 40 credits and 4 MYR for 1 verification (RM 4 per verification)", () => {
    const result = computeUsageFromVerificationCount(1);
    expect(result.usageCredits).toBe(CREDITS_PER_VERIFICATION);
    expect(result.usageAmountMyr).toBe(4);
  });

  it("returns correct totals for 5 verifications", () => {
    const result = computeUsageFromVerificationCount(5);
    expect(result.usageCredits).toBe(200); // 5 * 40
    expect(result.usageAmountMyr).toBe(20); // 200 / 10
  });

  it("usageCredits = verificationCount * 40", () => {
    expect(computeUsageFromVerificationCount(10).usageCredits).toBe(400);
    expect(computeUsageFromVerificationCount(100).usageCredits).toBe(4000);
  });

  it("usageAmountMyr = usageCredits / 10", () => {
    const result = computeUsageFromVerificationCount(25);
    expect(result.usageAmountMyr).toBe(result.usageCredits / CREDITS_PER_MYR);
  });
});
