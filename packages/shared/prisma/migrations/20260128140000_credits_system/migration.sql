-- Migration: Credits System
-- Changes pricing_tier from price_per_unit (MYR) to credits_per_session (integer credits)
-- Credit system: 10 credits = RM 1 (each credit = RM 0.10)

-- Step 1: Add new column credits_per_session
ALTER TABLE "pricing_tier" ADD COLUMN "credits_per_session" INTEGER;

-- Step 2: Migrate existing data - convert MYR to credits (multiply by 10)
-- e.g., RM 5.00 becomes 50 credits
UPDATE "pricing_tier" SET "credits_per_session" = ROUND("price_per_unit" * 10)::INTEGER;

-- Step 3: Make credits_per_session NOT NULL after migration
ALTER TABLE "pricing_tier" ALTER COLUMN "credits_per_session" SET NOT NULL;

-- Step 4: Drop the old price_per_unit column
ALTER TABLE "pricing_tier" DROP COLUMN "price_per_unit";

-- Add comment documenting the credit system
COMMENT ON TABLE "pricing_tier" IS 'Volume-based pricing tiers per client per product. Credits: 10 credits = RM 1';
COMMENT ON COLUMN "pricing_tier"."credits_per_session" IS 'Number of credits charged per KYC session (10 credits = RM 1)';
