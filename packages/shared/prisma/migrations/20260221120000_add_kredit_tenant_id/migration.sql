-- Add kredit_tenant_id for backend-only lookup (tenant_id from Kredit).
-- tenant_slug = slug (display); kredit_tenant_id = id (API matching).
ALTER TABLE "client" ADD COLUMN IF NOT EXISTS "kredit_tenant_id" TEXT;

-- Unique index for lookup (partial: only non-null)
CREATE UNIQUE INDEX IF NOT EXISTS "client_kredit_tenant_id_key" 
  ON "client" ("kredit_tenant_id") WHERE "kredit_tenant_id" IS NOT NULL;

-- Backfill existing truestack_kredit tenants: they stored id in tenant_slug
UPDATE "client"
SET 
  "kredit_tenant_id" = "tenant_slug",
  "code" = 'TK_' || UPPER(REGEXP_REPLACE(COALESCE("tenant_slug", ''), '[^a-zA-Z0-9_-]', '_', 'g'))
WHERE "client_source" = 'truestack_kredit' 
  AND "client_type" = 'tenant' 
  AND "tenant_slug" IS NOT NULL
  AND "kredit_tenant_id" IS NULL;
