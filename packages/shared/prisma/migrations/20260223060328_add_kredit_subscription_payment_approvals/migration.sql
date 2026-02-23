-- CreateTable
CREATE TABLE "kredit_subscription_payment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "request_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "tenant_slug" TEXT,
    "tenant_name" TEXT,
    "client_id" UUID,
    "plan" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "amount_myr" DECIMAL(12,2) NOT NULL,
    "payment_reference" TEXT NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL,
    "requested_add_ons" JSONB NOT NULL DEFAULT '[]',
    "decision_webhook_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rejection_reason" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "decided_by" TEXT,
    "decision_webhook_delivered" BOOLEAN NOT NULL DEFAULT false,
    "decision_webhook_attempts" INTEGER NOT NULL DEFAULT 0,
    "decision_webhook_delivered_at" TIMESTAMP(3),
    "decision_webhook_last_error" TEXT,
    "raw_payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kredit_subscription_payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kredit_subscription_payment_request_id_key" ON "kredit_subscription_payment"("request_id");

-- CreateIndex
CREATE INDEX "kredit_subscription_payment_status_requested_at_idx" ON "kredit_subscription_payment"("status", "requested_at");

-- CreateIndex
CREATE INDEX "kredit_subscription_payment_tenant_id_idx" ON "kredit_subscription_payment"("tenant_id");

-- CreateIndex
CREATE INDEX "kredit_subscription_payment_client_id_idx" ON "kredit_subscription_payment"("client_id");

-- AddForeignKey
ALTER TABLE "kredit_subscription_payment" ADD CONSTRAINT "kredit_subscription_payment_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
