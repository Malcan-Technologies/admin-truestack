-- Tenant billing period for Kredit payment tracking

CREATE TABLE IF NOT EXISTS "tenant_billing_period" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "client_id" UUID NOT NULL REFERENCES "client"("id") ON DELETE CASCADE,
  "period_start" DATE NOT NULL,
  "period_end" DATE NOT NULL,
  "verification_count" INT NOT NULL DEFAULT 0,
  "usage_amount_myr" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "payment_status" TEXT NOT NULL DEFAULT 'pending',
  "paid_at" TIMESTAMP,
  "paid_amount_myr" DECIMAL(10,2),
  "webhook_delivered" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE("client_id", "period_start")
);

CREATE INDEX IF NOT EXISTS "tenant_billing_period_client_id_idx" ON "tenant_billing_period" ("client_id");
