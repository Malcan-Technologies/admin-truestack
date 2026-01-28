-- Add banned, ban_reason, and ban_expires columns to user table for Better Auth admin plugin
ALTER TABLE "user" ADD COLUMN "banned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "user" ADD COLUMN "ban_reason" TEXT;
ALTER TABLE "user" ADD COLUMN "ban_expires" TIMESTAMP(3);
