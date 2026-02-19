-- Add client hierarchy and source fields for TrueStack Kredit integration

-- Add new columns with defaults for existing rows
ALTER TABLE "client" ADD COLUMN IF NOT EXISTS "client_type" TEXT NOT NULL DEFAULT 'direct';
ALTER TABLE "client" ADD COLUMN IF NOT EXISTS "client_source" TEXT NOT NULL DEFAULT 'api';
ALTER TABLE "client" ADD COLUMN IF NOT EXISTS "parent_client_id" UUID;
ALTER TABLE "client" ADD COLUMN IF NOT EXISTS "tenant_slug" TEXT;

-- Add unique constraint on tenant_slug (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS "client_tenant_slug_key" ON "client" ("tenant_slug") WHERE "tenant_slug" IS NOT NULL;

-- Add foreign key for parent_client_id
ALTER TABLE "client" ADD CONSTRAINT "client_parent_client_id_fkey" 
  FOREIGN KEY ("parent_client_id") REFERENCES "client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add indexes for filtering and lookups
CREATE INDEX IF NOT EXISTS "client_client_source_idx" ON "client" ("client_source");
CREATE INDEX IF NOT EXISTS "client_parent_client_id_idx" ON "client" ("parent_client_id");
CREATE INDEX IF NOT EXISTS "client_tenant_slug_idx" ON "client" ("tenant_slug") WHERE "tenant_slug" IS NOT NULL;
