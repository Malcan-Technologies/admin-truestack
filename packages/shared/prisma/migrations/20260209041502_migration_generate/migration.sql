/*
  Warnings:

  - Made the column `generated_at` on table `invoice` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `invoice` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `invoice` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `invoice_line_item` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `payment` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "invoice" DROP CONSTRAINT "invoice_client_id_fkey";

-- DropForeignKey
ALTER TABLE "invoice" DROP CONSTRAINT "invoice_generated_by_fkey";

-- DropForeignKey
ALTER TABLE "invoice" DROP CONSTRAINT "invoice_superseded_by_invoice_id_fkey";

-- DropForeignKey
ALTER TABLE "invoice_line_item" DROP CONSTRAINT "invoice_line_item_invoice_id_fkey";

-- DropForeignKey
ALTER TABLE "invoice_line_item" DROP CONSTRAINT "invoice_line_item_reference_invoice_id_fkey";

-- DropForeignKey
ALTER TABLE "payment" DROP CONSTRAINT "payment_client_id_fkey";

-- DropForeignKey
ALTER TABLE "payment" DROP CONSTRAINT "payment_invoice_id_fkey";

-- DropForeignKey
ALTER TABLE "payment" DROP CONSTRAINT "payment_recorded_by_fkey";

-- DropForeignKey
ALTER TABLE "pricing_tier" DROP CONSTRAINT "pricing_tier_client_id_fkey";

-- DropForeignKey
ALTER TABLE "pricing_tier" DROP CONSTRAINT "pricing_tier_product_id_fkey";

-- DropIndex
DROP INDEX "kyc_session_billed_status_idx";

-- AlterTable
ALTER TABLE "demo_webhook" ALTER COLUMN "received_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "invoice" ALTER COLUMN "period_start" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "period_end" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "generated_at" SET NOT NULL,
ALTER COLUMN "generated_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "invoice_line_item" ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "payment" ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "pricing_tier" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- DropIndex (replaces partial index from 20260130100000_add_billed_at with full index per schema)
DROP INDEX IF EXISTS "kyc_session_billed_at_idx";

-- CreateIndex
CREATE INDEX "kyc_session_billed_at_idx" ON "kyc_session"("billed_at");

-- AddForeignKey
ALTER TABLE "pricing_tier" ADD CONSTRAINT "pricing_tier_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_tier" ADD CONSTRAINT "pricing_tier_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_superseded_by_invoice_id_fkey" FOREIGN KEY ("superseded_by_invoice_id") REFERENCES "invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_item" ADD CONSTRAINT "invoice_line_item_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_item" ADD CONSTRAINT "invoice_line_item_reference_invoice_id_fkey" FOREIGN KEY ("reference_invoice_id") REFERENCES "invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_demo_webhook_session" RENAME TO "demo_webhook_session_id_idx";

-- RenameIndex
ALTER INDEX "idx_invoice_client_id" RENAME TO "invoice_client_id_idx";

-- RenameIndex
ALTER INDEX "idx_invoice_due_date" RENAME TO "invoice_due_date_idx";

-- RenameIndex
ALTER INDEX "idx_invoice_period" RENAME TO "invoice_period_start_period_end_idx";

-- RenameIndex
ALTER INDEX "idx_invoice_status" RENAME TO "invoice_status_idx";

-- RenameIndex
ALTER INDEX "idx_invoice_line_item_invoice" RENAME TO "invoice_line_item_invoice_id_idx";

-- RenameIndex
ALTER INDEX "idx_invoice_line_item_type" RENAME TO "invoice_line_item_line_type_idx";

-- RenameIndex
ALTER INDEX "idx_payment_client" RENAME TO "payment_client_id_idx";

-- RenameIndex
ALTER INDEX "idx_payment_invoice" RENAME TO "payment_invoice_id_idx";

-- RenameIndex
ALTER INDEX "idx_pricing_tier_client_product" RENAME TO "pricing_tier_client_id_product_id_idx";
