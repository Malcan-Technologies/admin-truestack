-- Add SST (Service Tax) fields to invoice table
ALTER TABLE "invoice" ADD COLUMN "sst_rate" DECIMAL(5,4) NOT NULL DEFAULT 0.0800;
ALTER TABLE "invoice" ADD COLUMN "sst_amount_myr" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "invoice" ADD COLUMN "total_with_sst_myr" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Add SST fields to payment table
ALTER TABLE "payment" ADD COLUMN "sst_rate" DECIMAL(5,4) NOT NULL DEFAULT 0.0800;
ALTER TABLE "payment" ADD COLUMN "sst_amount_myr" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "payment" ADD COLUMN "total_with_sst_myr" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Update existing invoices to calculate SST based on amount_due_myr
UPDATE "invoice" SET 
  sst_amount_myr = ROUND(amount_due_myr * 0.08, 2),
  total_with_sst_myr = ROUND(amount_due_myr * 1.08, 2)
WHERE sst_amount_myr = 0 AND amount_due_myr > 0;

-- Update existing payments to calculate SST based on amount_myr
UPDATE "payment" SET 
  sst_amount_myr = ROUND(amount_myr * 0.08, 2),
  total_with_sst_myr = ROUND(amount_myr * 1.08, 2)
WHERE sst_amount_myr = 0 AND amount_myr > 0;
