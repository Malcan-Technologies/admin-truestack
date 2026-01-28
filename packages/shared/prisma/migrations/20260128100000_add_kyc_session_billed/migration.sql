-- Add billed column to kyc_session table
-- This column tracks whether a credit has been deducted for this session
-- Billing only happens on completion (approved or rejected), not on session creation

ALTER TABLE "kyc_session" ADD COLUMN "billed" BOOLEAN NOT NULL DEFAULT false;

-- Add index for querying unbilled completed sessions (useful for reconciliation)
CREATE INDEX "kyc_session_billed_status_idx" ON "kyc_session" ("billed", "status");

-- Add comment for documentation
COMMENT ON COLUMN "kyc_session"."billed" IS 'Indicates if credit has been deducted for this session. Billing occurs on completion (approved/rejected), not on creation.';
