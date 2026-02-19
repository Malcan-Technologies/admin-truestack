# Phase 2 – Kredit Integration Summary

## Implemented

### 1. Auto-create tenant client on first paid event

**Endpoint:** `POST /api/webhooks/kredit/tenant-created`

- Kredit calls this when a tenant pays for the first time (Core + TrueIdentity).
- Admin creates the tenant client under the TrueStack Kredit parent.
- **Idempotent:** If tenant already exists (by `tenant_slug` or `code`), returns existing client.
- HMAC verification same as verification-request (`x-kredit-signature`, `x-kredit-timestamp`).
- Creates `client_product_config` (TrueIdentity enabled, allow overdraft) and default pricing tier (40 credits = RM 4).

**Request body:** `tenant_id` (required), `tenant_name`, `contact_email`, `contact_phone`, `company_registration`, `webhook_url`, `metadata`

### 2. Usage page parent→tenant breakdown

- **KYC Usage API** (`/api/admin/kyc-usage`): Returns `clientSource`, `clientType`, `parentClientId`, `parentClientName`, `tenantSlug` for each client.
- **Usage page:** Shows Source column (API vs Kredit), parent linkage for tenants (← Parent Name), and visual grouping (indent + border for Kredit tenants).

### 3. Integration tests

- **Usage calculation:** `packages/shared/lib/kredit-usage.test.ts` – 5 tests for `computeUsageFromVerificationCount` (RM 4 per verification = 40 credits).
- **HMAC:** Existing 9 tests in `hmac-webhook.test.ts`.
- **Shared utility:** `computeUsageFromVerificationCount()` used by `/api/internal/kredit/usage`.

### 4. Contract docs

- Added **Tenant Created Webhook** section to `docs/kredit-integration-contracts.md`.

## Kredit integration flow (Phase 2)

1. Tenant registers and subscribes (Core + TrueIdentity) in Kredit.
2. Kredit receives first payment → calls `POST /api/webhooks/kredit/tenant-created` with tenant details.
3. Admin creates tenant client (or returns existing if idempotent).
4. Tenant can now receive verification requests via `POST /api/webhooks/kredit/verification-request`.
5. Usage is tracked per tenant; Kredit queries `/api/internal/kredit/usage` for billing.
6. Admin marks as paid → signed payment webhook to Kredit.
