-- Migration: Add unique constraint to webhook_log.payload_hash
-- This is required for ON CONFLICT clause to work for deduplication

-- First, remove any duplicate entries (keep the first one)
DELETE FROM "webhook_log" a USING "webhook_log" b
WHERE a.created_at > b.created_at AND a.payload_hash = b.payload_hash;

-- Drop the existing index (if exists)
DROP INDEX IF EXISTS "webhook_log_payload_hash_idx";

-- Add unique constraint on payload_hash
ALTER TABLE "webhook_log" ADD CONSTRAINT "webhook_log_payload_hash_key" UNIQUE ("payload_hash");
