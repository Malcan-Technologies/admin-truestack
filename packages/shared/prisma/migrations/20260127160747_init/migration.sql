/*
  Warnings:

  - Made the column `allow_overdraft` on table `client_product_config` required. This step will fail if there are existing NULL values in that column.
  - Made the column `settings` on table `client_product_config` required. This step will fail if there are existing NULL values in that column.
  - Made the column `document_type` on table `kyc_session` required. This step will fail if there are existing NULL values in that column.
  - Made the column `platform` on table `kyc_session` required. This step will fail if there are existing NULL values in that column.
  - Made the column `metadata` on table `kyc_session` required. This step will fail if there are existing NULL values in that column.
  - Made the column `webhook_delivered` on table `kyc_session` required. This step will fail if there are existing NULL values in that column.
  - Made the column `webhook_attempts` on table `kyc_session` required. This step will fail if there are existing NULL values in that column.
  - Made the column `processed` on table `webhook_log` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "account" DROP CONSTRAINT "account_user_id_fkey";

-- DropForeignKey
ALTER TABLE "client" DROP CONSTRAINT "client_created_by_fkey";

-- DropForeignKey
ALTER TABLE "client_api_key" DROP CONSTRAINT "client_api_key_client_id_fkey";

-- DropForeignKey
ALTER TABLE "client_api_key" DROP CONSTRAINT "client_api_key_created_by_fkey";

-- DropForeignKey
ALTER TABLE "client_api_key" DROP CONSTRAINT "client_api_key_product_id_fkey";

-- DropForeignKey
ALTER TABLE "client_api_key" DROP CONSTRAINT "client_api_key_revoked_by_fkey";

-- DropForeignKey
ALTER TABLE "client_product_config" DROP CONSTRAINT "client_product_config_client_id_fkey";

-- DropForeignKey
ALTER TABLE "client_product_config" DROP CONSTRAINT "client_product_config_product_id_fkey";

-- DropForeignKey
ALTER TABLE "credit_ledger" DROP CONSTRAINT "credit_ledger_client_id_fkey";

-- DropForeignKey
ALTER TABLE "credit_ledger" DROP CONSTRAINT "credit_ledger_created_by_fkey";

-- DropForeignKey
ALTER TABLE "credit_ledger" DROP CONSTRAINT "credit_ledger_product_id_fkey";

-- DropForeignKey
ALTER TABLE "kyc_session" DROP CONSTRAINT "kyc_session_client_id_fkey";

-- DropForeignKey
ALTER TABLE "session" DROP CONSTRAINT "session_user_id_fkey";

-- DropForeignKey
ALTER TABLE "webhook_log" DROP CONSTRAINT "webhook_log_kyc_session_id_fkey";

-- AlterTable
ALTER TABLE "account" ALTER COLUMN "access_token_expires_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "refresh_token_expires_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "client" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "client_api_key" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "revoked_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "client_product_config" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "allow_overdraft" SET NOT NULL,
ALTER COLUMN "settings" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "credit_ledger" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "kyc_session" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "document_type" SET NOT NULL,
ALTER COLUMN "platform" SET NOT NULL,
ALTER COLUMN "metadata" SET NOT NULL,
ALTER COLUMN "webhook_delivered" SET NOT NULL,
ALTER COLUMN "webhook_delivered_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "webhook_attempts" SET NOT NULL,
ALTER COLUMN "expires_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "product" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "session" ALTER COLUMN "expires_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "user" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "verification" ALTER COLUMN "expires_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "webhook_log" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "processed" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client" ADD CONSTRAINT "client_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_api_key" ADD CONSTRAINT "client_api_key_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_api_key" ADD CONSTRAINT "client_api_key_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_api_key" ADD CONSTRAINT "client_api_key_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_api_key" ADD CONSTRAINT "client_api_key_revoked_by_fkey" FOREIGN KEY ("revoked_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_product_config" ADD CONSTRAINT "client_product_config_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_product_config" ADD CONSTRAINT "client_product_config_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_session" ADD CONSTRAINT "kyc_session_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_log" ADD CONSTRAINT "webhook_log_kyc_session_id_fkey" FOREIGN KEY ("kyc_session_id") REFERENCES "kyc_session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_account_user_id" RENAME TO "account_user_id_idx";

-- RenameIndex
ALTER INDEX "idx_client_code" RENAME TO "client_code_idx";

-- RenameIndex
ALTER INDEX "idx_client_status" RENAME TO "client_status_idx";

-- RenameIndex
ALTER INDEX "idx_client_api_key_client" RENAME TO "client_api_key_client_id_idx";

-- RenameIndex
ALTER INDEX "idx_client_api_key_hash" RENAME TO "client_api_key_api_key_hash_idx";

-- RenameIndex
ALTER INDEX "idx_client_api_key_prefix" RENAME TO "client_api_key_api_key_prefix_idx";

-- RenameIndex
ALTER INDEX "idx_client_product_config" RENAME TO "client_product_config_client_id_product_id_idx";

-- RenameIndex
ALTER INDEX "idx_credit_ledger_client" RENAME TO "credit_ledger_client_id_product_id_idx";

-- RenameIndex
ALTER INDEX "idx_credit_ledger_created" RENAME TO "credit_ledger_created_at_idx";

-- RenameIndex
ALTER INDEX "idx_kyc_session_client_id" RENAME TO "kyc_session_client_id_idx";

-- RenameIndex
ALTER INDEX "idx_kyc_session_created" RENAME TO "kyc_session_created_at_idx";

-- RenameIndex
ALTER INDEX "idx_kyc_session_innovatif_id" RENAME TO "kyc_session_innovatif_onboarding_id_idx";

-- RenameIndex
ALTER INDEX "idx_kyc_session_ref_id" RENAME TO "kyc_session_ref_id_idx";

-- RenameIndex
ALTER INDEX "idx_kyc_session_status" RENAME TO "kyc_session_status_idx";

-- RenameIndex
ALTER INDEX "idx_session_expires" RENAME TO "session_expires_at_idx";

-- RenameIndex
ALTER INDEX "idx_session_token" RENAME TO "session_token_idx";

-- RenameIndex
ALTER INDEX "idx_session_user_id" RENAME TO "session_user_id_idx";

-- RenameIndex
ALTER INDEX "idx_verification_identifier" RENAME TO "verification_identifier_idx";

-- RenameIndex
ALTER INDEX "idx_webhook_log_payload_hash" RENAME TO "webhook_log_payload_hash_idx";

-- RenameIndex
ALTER INDEX "idx_webhook_log_session" RENAME TO "webhook_log_kyc_session_id_idx";
