-- TrueIdentity MVP Database Schema
-- Version: 1.0
-- Created: 2026-01-27

-- ============================================
-- BetterAuth Tables (Admin Users)
-- ============================================

-- Admin users (BetterAuth managed)
CREATE TABLE "user" (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    email_verified BOOLEAN DEFAULT FALSE NOT NULL,
    image TEXT,
    role TEXT NOT NULL DEFAULT 'ops', -- super_admin, ops, finance
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Admin sessions
CREATE TABLE session (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Admin accounts (for email/password auth)
CREATE TABLE account (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    access_token_expires_at TIMESTAMPTZ,
    refresh_token_expires_at TIMESTAMPTZ,
    scope TEXT,
    id_token TEXT,
    password TEXT, -- hashed password
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- BetterAuth verification tokens
CREATE TABLE verification (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- Products Table (Extensible for future products)
-- ============================================

CREATE TABLE product (
    id TEXT PRIMARY KEY,           -- 'true_identity', 'true_payments', etc.
    name TEXT NOT NULL,            -- 'TrueIdentity'
    description TEXT,
    key_prefix TEXT NOT NULL UNIQUE, -- 'ti' for TrueIdentity, 'tp' for TruePayments
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Seed initial product
INSERT INTO product (id, name, description, key_prefix) VALUES
    ('true_identity', 'TrueIdentity', 'B2B e-KYC verification service', 'ti');

-- ============================================
-- Clients (B2B Customers)
-- ============================================

CREATE TABLE client (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,     -- e.g., 'ACME' (used in ref_id generation)
    contact_email TEXT,
    contact_phone TEXT,
    company_registration TEXT,     -- SSM number
    status TEXT NOT NULL DEFAULT 'active', -- active, suspended
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by TEXT REFERENCES "user"(id)
);

-- ============================================
-- Client API Keys (per product, supports rotation)
-- ============================================

CREATE TABLE client_api_key (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES client(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES product(id),
    -- Key format: {prefix}_{env}_{random} e.g., ti_live_abc123xyz789
    api_key_hash TEXT NOT NULL,              -- SHA256 hash for fast validation
    api_key_encrypted TEXT NOT NULL,         -- AES-GCM encrypted full key (for admin reveal)
    api_key_prefix TEXT NOT NULL,            -- 'ti_live_abc1' for display
    api_key_suffix TEXT NOT NULL,            -- last 4 chars for display
    environment TEXT NOT NULL DEFAULT 'live', -- 'live' or 'test'
    status TEXT NOT NULL DEFAULT 'active',   -- active, revoked
    revoked_at TIMESTAMPTZ,
    revoked_by TEXT REFERENCES "user"(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by TEXT REFERENCES "user"(id)
);

-- Partial unique index: only one active key per client/product/environment
CREATE UNIQUE INDEX idx_client_api_key_unique_active 
ON client_api_key (client_id, product_id, environment) 
WHERE status = 'active';

-- ============================================
-- Client Product Settings (per product configuration)
-- ============================================

CREATE TABLE client_product_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES client(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES product(id),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    -- TrueIdentity specific settings
    webhook_url TEXT,
    success_url TEXT,
    fail_url TEXT,
    allow_overdraft BOOLEAN DEFAULT FALSE,
    -- Generic settings JSON for future products
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(client_id, product_id)
);

-- ============================================
-- Credit Ledger (Prepaid wallet, per product)
-- ============================================

CREATE TABLE credit_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES client(id),
    product_id TEXT NOT NULL REFERENCES product(id),
    amount INTEGER NOT NULL,       -- positive = credit, negative = debit
    balance_after INTEGER NOT NULL,
    type TEXT NOT NULL,            -- topup, usage, adjustment, refund
    reference_id UUID,             -- kyc_session_id for usage
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by TEXT REFERENCES "user"(id)
);

-- ============================================
-- KYC Sessions (TrueIdentity specific)
-- ============================================

CREATE TABLE kyc_session (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES client(id),
    ref_id TEXT NOT NULL UNIQUE,   -- our generated ref for Innovatif
    innovatif_onboarding_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, expired
    result TEXT,                   -- approved, rejected, null
    reject_message TEXT,
    document_name TEXT NOT NULL,
    document_number TEXT NOT NULL,
    document_type TEXT DEFAULT '1', -- 1=MyKad, etc.
    platform TEXT DEFAULT 'Web',
    -- Client-provided URLs (override defaults)
    success_url TEXT,
    fail_url TEXT,
    -- Client metadata (returned in webhook)
    metadata JSONB DEFAULT '{}',
    -- Innovatif response data (without images)
    innovatif_response JSONB,
    -- S3 document paths (populated from webhook)
    s3_front_document TEXT,        -- e.g., 'kyc/{client_id}/{session_id}/front_document.jpg'
    s3_back_document TEXT,
    s3_face_image TEXT,
    s3_best_frame TEXT,
    -- Client webhook delivery tracking
    webhook_delivered BOOLEAN DEFAULT FALSE,
    webhook_delivered_at TIMESTAMPTZ,
    webhook_attempts INTEGER DEFAULT 0,
    webhook_last_error TEXT,
    -- Timestamps
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- Webhook Delivery Log (for idempotency)
-- ============================================

CREATE TABLE webhook_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kyc_session_id UUID NOT NULL REFERENCES kyc_session(id),
    source TEXT NOT NULL,          -- innovatif_callback, manual_retry
    payload_hash TEXT NOT NULL,    -- SHA256 of payload for deduplication
    processed BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- Indexes
-- ============================================

-- BetterAuth indexes
CREATE INDEX idx_session_user_id ON session(user_id);
CREATE INDEX idx_session_token ON session(token);
CREATE INDEX idx_session_expires ON session(expires_at);
CREATE INDEX idx_account_user_id ON account(user_id);
CREATE INDEX idx_verification_identifier ON verification(identifier);

-- Client indexes
CREATE INDEX idx_client_code ON client(code);
CREATE INDEX idx_client_status ON client(status);

-- API key indexes
CREATE INDEX idx_client_api_key_client ON client_api_key(client_id);
CREATE INDEX idx_client_api_key_hash ON client_api_key(api_key_hash);
CREATE INDEX idx_client_api_key_prefix ON client_api_key(api_key_prefix);

-- Client product config indexes
CREATE INDEX idx_client_product_config ON client_product_config(client_id, product_id);

-- Credit ledger indexes
CREATE INDEX idx_credit_ledger_client ON credit_ledger(client_id, product_id);
CREATE INDEX idx_credit_ledger_created ON credit_ledger(created_at);

-- KYC session indexes
CREATE INDEX idx_kyc_session_client_id ON kyc_session(client_id);
CREATE INDEX idx_kyc_session_ref_id ON kyc_session(ref_id);
CREATE INDEX idx_kyc_session_innovatif_id ON kyc_session(innovatif_onboarding_id);
CREATE INDEX idx_kyc_session_status ON kyc_session(status);
CREATE INDEX idx_kyc_session_created ON kyc_session(created_at);

-- Webhook log indexes
CREATE INDEX idx_webhook_log_session ON webhook_log(kyc_session_id);
CREATE INDEX idx_webhook_log_payload_hash ON webhook_log(payload_hash);

-- ============================================
-- Updated At Trigger Function
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "user"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_session_updated_at BEFORE UPDATE ON session
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_account_updated_at BEFORE UPDATE ON account
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_verification_updated_at BEFORE UPDATE ON verification
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_updated_at BEFORE UPDATE ON client
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_product_config_updated_at BEFORE UPDATE ON client_product_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kyc_session_updated_at BEFORE UPDATE ON kyc_session
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
