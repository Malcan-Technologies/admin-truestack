/*
  Warnings:

  - A unique constraint covering the columns `[tenant_slug]` on the table `client` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "tenant_billing_period" DROP CONSTRAINT "tenant_billing_period_client_id_fkey";

-- AlterTable
ALTER TABLE "tenant_billing_period" ALTER COLUMN "paid_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- CreateIndex (IF NOT EXISTS: 20260218100000 may have already created these)
CREATE UNIQUE INDEX IF NOT EXISTS "client_tenant_slug_key" ON "client"("tenant_slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "client_tenant_slug_idx" ON "client"("tenant_slug");

-- AddForeignKey
ALTER TABLE "tenant_billing_period" ADD CONSTRAINT "tenant_billing_period_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
