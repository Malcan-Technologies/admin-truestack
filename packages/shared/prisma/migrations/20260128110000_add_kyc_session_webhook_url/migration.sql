-- Add webhook_url column to kyc_session table
-- Allows per-session webhook URL override (falls back to client_product_config.webhook_url if null)

ALTER TABLE "kyc_session" ADD COLUMN "webhook_url" TEXT;

-- Add comment for documentation
COMMENT ON COLUMN "kyc_session"."webhook_url" IS 'Per-session webhook URL override. If null, uses webhook_url from client_product_config.';
