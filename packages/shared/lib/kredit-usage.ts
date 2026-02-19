/**
 * Kredit usage calculation utilities.
 * RM 4 per verification = 40 credits (10 credits = RM 1)
 */
export const CREDITS_PER_MYR = 10;
export const CREDITS_PER_VERIFICATION = 40; // RM 4

export function computeUsageFromVerificationCount(
  verificationCount: number
): { usageCredits: number; usageAmountMyr: number } {
  const usageCredits = verificationCount * CREDITS_PER_VERIFICATION;
  const usageAmountMyr = usageCredits / CREDITS_PER_MYR;
  return { usageCredits, usageAmountMyr };
}
