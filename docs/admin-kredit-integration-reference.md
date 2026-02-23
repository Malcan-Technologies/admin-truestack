# Admin ↔ Kredit Integration Reference

A reference for integrating data reads and writes between **TrueStack Admin** (admin-truestack / TrueIdentity) and **TrueStack Kredit** (truestack_kredit). Use this when adding new cross-platform flows.

---

## Architecture Overview

```
┌─────────────────────────────────┐         ┌─────────────────────────────────┐
│   TrueStack Admin               │         │   TrueStack Kredit               │
│   (admin-truestack)             │         │   (truestack_kredit)             │
│                                 │         │                                 │
│   • TrueIdentity (KYC)          │◄───────►│   • Tenants, Borrowers, Loans     │
│   • Client / Billing            │         │   • Subscription billing        │
│   • Kredit admin proxy UI      │         │   • Internal admin APIs          │
└─────────────────────────────────┘         └─────────────────────────────────┘
         │                                              │
         │  PostgreSQL (trueidentity)                    │  PostgreSQL (kredit)
         │  client.kredit_tenant_id ←───────────────────│  tenant.id (cuid)
         │  client.tenant_slug                          │  tenant.slug
         └──────────────────────────────────────────────┘
```

**Key identifiers for linking:**
- Admin `client.kredit_tenant_id` = Kredit `tenant.id` (cuid)
- Admin `client.tenant_slug` = Kredit `tenant.slug` (display)

---

## Data Flow Directions

### Kredit → Admin (Inbound)

| Flow | Endpoint | Auth | Purpose |
|------|----------|------|---------|
| Verification request | `POST /api/webhooks/kredit/verification-request` | HMAC (`x-kredit-signature`) | Create KYC session |
| Tenant created | `POST /api/webhooks/kredit/tenant-created` | HMAC | Pre-create tenant client |
| Subscription payment request | `POST /api/webhooks/kredit/subscription-payment-request` | HMAC | Tenant clicked "I've Made the Transfer" |

### Admin → Kredit (Outbound)

| Flow | Target | Auth | Purpose |
|------|--------|------|---------|
| KYC status callback | `webhook_url` from verification | HMAC (`x-trueidentity-signature`) | Session lifecycle events |
| Payment recorded | Client `webhook_url` or `{KREDIT_BACKEND_URL}/payment` | HMAC | Billing period marked paid |
| Subscription payment decision | `decision_webhook_url` or `/api/webhooks/kredit/subscription-payment-decision` | HMAC | Approve/reject pending payment |

### Admin reads from Kredit (Proxy)

| Flow | Admin API | Kredit Internal API | Auth |
|------|-----------|---------------------|------|
| Overview (tenants, metrics) | `GET /api/admin/truestack-kredit/overview` | `GET /api/internal/kredit/admin/overview` | Bearer `KREDIT_INTERNAL_SECRET` |
| Tenants table | `GET /api/admin/truestack-kredit/tenants` | `GET /api/internal/kredit/admin/tenants` | Bearer `KREDIT_INTERNAL_SECRET` |
| Borrowers table | `GET /api/admin/truestack-kredit/borrowers` | `GET /api/internal/kredit/admin/borrowers` | Bearer `KREDIT_INTERNAL_SECRET` |
| Loans table | `GET /api/admin/truestack-kredit/loans` | `GET /api/internal/kredit/admin/loans` | Bearer `KREDIT_INTERNAL_SECRET` |

### Kredit reads from Admin

| Flow | Admin API | Auth | Purpose |
|------|-----------|------|---------|
| Usage / billing | `GET /api/internal/kredit/usage?tenant_id=...` | Bearer `KREDIT_INTERNAL_SECRET` or `INTERNAL_API_KEY` | Verification count, credits |

---

## Authentication Patterns

### 1. HMAC (Webhooks)

**Inbound (Kredit → Admin):**
- Headers: `x-kredit-signature`, `x-kredit-timestamp`
- Payload: `{timestamp}.{rawBody}` (timestamp in **milliseconds**)
- Secret: `KREDIT_WEBHOOK_SECRET` (same value in both platforms)
- Encoding: Base64 or hex

**Outbound (Admin → Kredit):**
- Headers: `x-trueidentity-signature`, `x-trueidentity-timestamp`
- Secret: `TRUEIDENTITY_WEBHOOK_SECRET` or `KREDIT_WEBHOOK_SECRET`
- Kredit verifies with `config.trueIdentity.callbackWebhookSecret`

### 2. Bearer Token (Internal APIs)

**Admin → Kredit:**
- Header: `Authorization: Bearer {KREDIT_INTERNAL_SECRET}`
- Fallback: `INTERNAL_API_KEY`
- Kredit checks: `config.trueIdentity.kreditInternalSecret`

**Kredit → Admin:**
- Header: `Authorization: Bearer {KREDIT_INTERNAL_SECRET}` or `INTERNAL_API_KEY`

---

## Environment Variables & Secrets

### Admin (admin-truestack)

| Variable | Purpose |
|----------|---------|
| `KREDIT_BACKEND_URL` | Kredit backend base URL (e.g. `https://kredit-api.example.com`) |
| `KREDIT_INTERNAL_SECRET` | Bearer auth for calling Kredit internal APIs |
| `KREDIT_WEBHOOK_SECRET` | Verify inbound Kredit webhooks; sign outbound callbacks |
| `TRUEIDENTITY_WEBHOOK_SECRET` | Alternative for signing outbound webhooks |

### Kredit (truestack_kredit)

| Variable | Purpose |
|----------|---------|
| `TRUESTACK_ADMIN_URL` / `trueidentity_admin_base_url` | Admin base URL for webhooks |
| `KREDIT_INTERNAL_SECRET` / `kredit_internal_secret` | Bearer auth for internal APIs; verify Admin callbacks |
| `KREDIT_WEBHOOK_SECRET` / `kredit_webhook_secret` | Sign outbound webhooks to Admin |
| `TRUEIDENTITY_WEBHOOK_SECRET` / `trueidentity_webhook_secret` | Verify inbound Admin webhooks |

**Shared secrets must match:**
- `KREDIT_WEBHOOK_SECRET` (Admin) = `kredit_webhook_secret` (Kredit)
- `KREDIT_INTERNAL_SECRET` (Admin) = `kredit_internal_secret` (Kredit)
- `TRUEIDENTITY_WEBHOOK_SECRET` (Admin) = `trueidentity_webhook_secret` (Kredit)

---

## Storage & Tables

### Admin (client, kredit_subscription_payment)

- `client`: Tenant representation; `kredit_tenant_id`, `tenant_slug` link to Kredit
- `kredit_subscription_payment`: Pending subscription payment approvals from Kredit

### Kredit

- `tenant`, `borrower`, `loan`, etc.: Core domain data
- `SubscriptionPaymentRequest`: Pending payment requests (before webhook to Admin)
- `TrueIdentityWebhookEvent`: Idempotency for Admin callbacks

---

## Adding a New Integration

### Checklist: New Kredit → Admin webhook

1. **Admin:** Add route under `app/api/webhooks/kredit/`
2. **Admin:** Use `verifyKreditWebhookSignature()` from `@truestack/shared/hmac-webhook`
3. **Admin:** Validate `x-kredit-signature`, `x-kredit-timestamp`
4. **Kredit:** Add webhook client; use `signRequestBody()` from `trueidentity/signature`
5. **Kredit:** Set `TRUESTACK_ADMIN_URL` + `KREDIT_WEBHOOK_SECRET`
6. **Both:** Document in `kredit-integration-contracts.md`

### Checklist: New Admin → Kredit webhook

1. **Admin:** Use `signOutboundWebhook()` from `@truestack/shared/hmac-webhook`
2. **Admin:** Add headers `x-trueidentity-signature`, `x-trueidentity-timestamp`, `X-TrueStack-Event`
3. **Kredit:** Add route; use `verifyCallbackSignature()` from `trueidentity/signature`
4. **Kredit:** Use `config.trueIdentity.callbackWebhookSecret`
5. **Both:** Document event payload in `kredit-integration-contracts.md`

### Checklist: Admin reads from Kredit (new internal API)

1. **Kredit:** Add route under `/api/internal/kredit/admin/`
2. **Kredit:** Protect with Bearer `config.trueIdentity.kreditInternalSecret`
3. **Admin:** Add proxy route under `/api/admin/truestack-kredit/`
4. **Admin:** Use `callKreditAdminApi()` from `lib/kredit-admin-client`
5. **Admin:** Require `KREDIT_BACKEND_URL` and `KREDIT_INTERNAL_SECRET`

### Checklist: Kredit reads from Admin

1. **Admin:** Add route under `/api/internal/kredit/`
2. **Admin:** Protect with Bearer `KREDIT_INTERNAL_SECRET` or `INTERNAL_API_KEY`
3. **Kredit:** Use `adminUsageClient` or similar; pass `Authorization: Bearer {secret}`

---

## Related Docs

- [kredit-integration-contracts.md](./kredit-integration-contracts.md) – Detailed API and webhook contracts
- **truestack_kredit:** `docs/kredit-status-webhook-document-images.md` – Document image payloads in status webhook
