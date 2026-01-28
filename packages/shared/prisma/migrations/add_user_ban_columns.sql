-- Add ban-related columns required by Better Auth admin plugin
-- Run this migration manually: psql $DATABASE_URL -f add_user_ban_columns.sql

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT false;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS ban_expires TIMESTAMP;
