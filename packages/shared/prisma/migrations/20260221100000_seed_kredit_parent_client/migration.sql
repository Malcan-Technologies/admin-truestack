-- Ensure TrueStack Kredit parent client exists (required for Kredit webhook integration).
-- Idempotent: inserts if missing, updates client_type/client_source if present.
INSERT INTO client (
  id,
  name,
  code,
  client_type,
  client_source,
  contact_email,
  contact_phone,
  company_registration,
  status,
  notes,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  'TrueStack Kredit',
  'TRUESTACK_KREDIT',
  'parent',
  'truestack_kredit',
  'kredit@truestack.my',
  '-',
  '-',
  'active',
  'Parent client for TrueStack Kredit tenants. Each Kredit tenant is a child client.',
  NOW(),
  NOW()
)
ON CONFLICT (code) DO UPDATE SET
  client_type = EXCLUDED.client_type,
  client_source = EXCLUDED.client_source,
  name = EXCLUDED.name,
  updated_at = NOW();
