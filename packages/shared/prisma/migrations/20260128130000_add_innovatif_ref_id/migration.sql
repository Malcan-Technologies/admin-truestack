-- Add innovatif_ref_id column to kyc_session table
-- This stores the prefixed ref_id returned by Innovatif's create-transaction API
-- Per Innovatif docs, this prefixed ref_id must be used for get-status API calls

ALTER TABLE "kyc_session" ADD COLUMN "innovatif_ref_id" TEXT;
