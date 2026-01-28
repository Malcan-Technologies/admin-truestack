-- Migration: Fix Pricing Tier Volumes to be 1-indexed
-- Session numbers should start from 1, not 0
-- e.g., Tier 1 (sessions 1-3), Tier 2 (sessions 4-6), etc.
--
-- Previously tiers were 0-indexed:
--   Tier 1: min=0, max=2 (sessions 0,1,2 - but session 0 doesn't exist!)
--   Tier 2: min=3, max=5
--
-- After this migration, tiers are 1-indexed:
--   Tier 1: min=1, max=3 (sessions 1,2,3)
--   Tier 2: min=4, max=6 (sessions 4,5,6)

-- Increment all min_volume by 1 to make them 1-indexed
UPDATE "pricing_tier" 
SET "min_volume" = "min_volume" + 1;

-- Increment all max_volume by 1 (where not null) to make them 1-indexed
UPDATE "pricing_tier" 
SET "max_volume" = "max_volume" + 1
WHERE "max_volume" IS NOT NULL;

-- Add comments documenting the 1-based session numbering
COMMENT ON COLUMN "pricing_tier"."min_volume" IS 'Minimum session number for this tier (1-indexed, e.g., 1 = first session)';
COMMENT ON COLUMN "pricing_tier"."max_volume" IS 'Maximum session number for this tier (1-indexed, NULL = unlimited)';
