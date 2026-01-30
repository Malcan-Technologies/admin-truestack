-- Add billed_at column to kyc_session for stable billing timestamp
-- This column is set once when billing occurs and is immutable
-- Used for tiering calculations instead of mutable updated_at

ALTER TABLE "kyc_session" ADD COLUMN "billed_at" TIMESTAMP(3);

-- Backfill existing billed sessions with updated_at as best available approximation
UPDATE "kyc_session" SET "billed_at" = "updated_at" WHERE "billed" = true AND "billed_at" IS NULL;

-- Add index for efficient monthly billing queries
CREATE INDEX "kyc_session_billed_at_idx" ON "kyc_session"("billed_at") WHERE "billed" = true;
