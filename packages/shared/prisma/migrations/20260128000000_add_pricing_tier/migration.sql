-- Add Pricing Tier table for volume-based pricing per client
CREATE TABLE pricing_tier (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES client(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES product(id),
    tier_name TEXT NOT NULL,
    min_volume INT NOT NULL,
    max_volume INT,
    price_per_unit DECIMAL(10,4) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(client_id, product_id, min_volume)
);

CREATE INDEX idx_pricing_tier_client_product ON pricing_tier(client_id, product_id);

-- Add Demo Webhook storage table for demo page
CREATE TABLE demo_webhook (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    event TEXT NOT NULL,
    payload JSONB NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_demo_webhook_session ON demo_webhook(session_id);

-- Add comment for documentation
COMMENT ON TABLE pricing_tier IS 'Volume-based pricing tiers per client per product';
COMMENT ON TABLE demo_webhook IS 'Stores webhook payloads for demo page display';
