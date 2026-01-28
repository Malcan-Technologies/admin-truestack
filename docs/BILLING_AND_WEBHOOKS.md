# Billing & Webhook Flow

This document explains how billing, webhooks, and the KYC session lifecycle work between our clients, TrueStack, and Innovatif.

## System Overview

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │      │                 │
│  Client's App   │◄────►│    TrueStack    │◄────►│    Innovatif    │
│  (Your Client)  │      │   (Our API)     │      │  (KYC Provider) │
│                 │      │                 │      │                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

## Key Components

| Component | Description |
|-----------|-------------|
| **Client** | Our customer who integrates with TrueStack API |
| **TrueStack API** | Our backend that manages sessions, billing, and webhooks |
| **Innovatif** | Third-party eKYC provider that performs the actual verification |
| **End User** | The person completing the KYC verification |

---

## Complete KYC Session Flow

### Phase 1: Session Creation

```
┌──────────────┐                    ┌──────────────┐                    ┌──────────────┐
│   Client     │                    │  TrueStack   │                    │  Innovatif   │
│    App       │                    │    API       │                    │              │
└──────┬───────┘                    └──────┬───────┘                    └──────┬───────┘
       │                                   │                                   │
       │  1. POST /api/v1/kyc/sessions     │                                   │
       │   (with API key + user details)   │                                   │
       │──────────────────────────────────►│                                   │
       │                                   │                                   │
       │                                   │  2. Validate API key              │
       │                                   │  3. Check credit balance          │
       │                                   │     (must have enough for         │
       │                                   │      1 session at current tier)   │
       │                                   │                                   │
       │                                   │  4. Create session record         │
       │                                   │     (status: pending)             │
       │                                   │                                   │
       │                                   │  5. POST /v1/gateway              │
       │                                   │     (encrypted request)           │
       │                                   │──────────────────────────────────►│
       │                                   │                                   │
       │                                   │  6. Return onboarding URL         │
       │                                   │◄──────────────────────────────────│
       │                                   │                                   │
       │  7. Return session details        │                                   │
       │     + onboarding_url              │                                   │
       │◄──────────────────────────────────│                                   │
       │                                   │                                   │
```

**Important:** No credits are deducted at this stage. Billing only happens on completion.

### Phase 2: User Verification

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Client     │     │   End User   │     │  TrueStack   │     │  Innovatif   │
│    App       │     │   Browser    │     │    API       │     │              │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │                    │
       │  1. Redirect to    │                    │                    │
       │     onboarding_url │                    │                    │
       │───────────────────►│                    │                    │
       │                    │                    │                    │
       │                    │  2. User lands on Innovatif             │
       │                    │──────────────────────────────────────────►
       │                    │                    │                    │
       │                    │  3. User completes verification:        │
       │                    │     - Upload ID document                │
       │                    │     - Take selfie                       │
       │                    │     - Liveness check                    │
       │                    │◄────────────────────────────────────────►
       │                    │                    │                    │
       │                    │  4. Innovatif redirects to              │
       │                    │     response_url with status            │
       │                    │◄─────────────────────────────────────────
       │                    │                    │                    │
       │                    │  5. User sees completion page           │
       │                    │     (core.truestack.my/r/{session_id})  │
       │                    │                    │                    │
```

### Phase 3: Webhook & Billing

```
┌──────────────┐                    ┌──────────────┐                    ┌──────────────┐
│   Client     │                    │  TrueStack   │                    │  Innovatif   │
│  Webhook     │                    │    API       │                    │              │
└──────┬───────┘                    └──────┬───────┘                    └──────┬───────┘
       │                                   │                                   │
       │                                   │  1. POST /api/internal/webhooks/  │
       │                                   │     innovatif/ekyc                │
       │                                   │     (encrypted callback)          │
       │                                   │◄──────────────────────────────────│
       │                                   │                                   │
       │                                   │  2. Decrypt & validate payload    │
       │                                   │                                   │
       │                                   │  3. Update session status         │
       │                                   │     (completed/expired)           │
       │                                   │                                   │
       │                                   │  4. Upload images to S3           │
       │                                   │                                   │
       │                                   │  5. BILLING: Deduct credits       │
       │                                   │     based on pricing tier         │
       │                                   │     (see Billing section below)   │
       │                                   │                                   │
       │  6. POST to client webhook_url    │                                   │
       │     with session results          │                                   │
       │◄──────────────────────────────────│                                   │
       │                                   │                                   │
       │  7. Client processes result       │                                   │
       │     (approve/reject user)         │                                   │
       │                                   │                                   │
```

---

## Billing System

### When Billing Occurs

Credits are **only deducted when a KYC session completes** (either approved or rejected). This means:

| Scenario | Billed? |
|----------|---------|
| Session created but user never starts | ❌ No |
| Session created but user abandons | ❌ No |
| Session expires before completion | ❌ No |
| Session completed - user approved | ✅ Yes |
| Session completed - user rejected | ✅ Yes |
| Innovatif API error during creation | ❌ No |

### Tiered Pricing

Each client can have volume-based pricing tiers:

```
┌─────────────────────────────────────────────────────────────┐
│                    Example Pricing Tiers                     │
├─────────────────┬─────────────────┬─────────────────────────┤
│     Tier        │   Volume/Month  │   Price per Session     │
├─────────────────┼─────────────────┼─────────────────────────┤
│   Tier 1        │   0 - 100       │   5.00 credits          │
│   Tier 2        │   101 - 500     │   4.00 credits          │
│   Tier 3        │   501 - 1000    │   3.50 credits          │
│   Tier 4        │   1001+         │   3.00 credits          │
└─────────────────┴─────────────────┴─────────────────────────┘
```

### Billing Calculation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Billing Calculation                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Session completes (approved/rejected)                        │
│                    │                                             │
│                    ▼                                             │
│  2. Check if already billed (billed = false?)                    │
│                    │                                             │
│                    ▼                                             │
│  3. Count client's billed sessions this month                    │
│     SELECT COUNT(*) FROM kyc_session                             │
│     WHERE client_id = ? AND billed = true                        │
│     AND created_at >= start_of_month                             │
│                    │                                             │
│                    ▼                                             │
│  4. Find applicable pricing tier                                 │
│     SELECT price_per_unit FROM pricing_tier                      │
│     WHERE min_volume <= (usage + 1)                              │
│     AND (max_volume IS NULL OR max_volume >= usage + 1)          │
│                    │                                             │
│                    ▼                                             │
│  5. Deduct credits from balance                                  │
│     INSERT INTO credit_ledger (amount = -price_per_unit)         │
│                    │                                             │
│                    ▼                                             │
│  6. Mark session as billed = true                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Credit Ledger

All credit transactions are recorded in the `credit_ledger` table:

| Type | Description | Amount |
|------|-------------|--------|
| `topup` | Admin adds credits | +100.00 |
| `included` | Initial/promotional credits | +10.00 |
| `usage` | KYC session billed | -5.00 |
| `refund` | Credit refund | +5.00 |
| `adjustment` | Manual adjustment | ±X.XX |

Example ledger:
```
┌────────────┬──────────┬─────────────────────────────────────────┬─────────┬─────────┐
│    Date    │   Type   │              Description                │ Amount  │ Balance │
├────────────┼──────────┼─────────────────────────────────────────┼─────────┼─────────┤
│ 2026-01-15 │ included │ Initial demo credits                    │ +10.00  │ 10.00   │
│ 2026-01-20 │ topup    │ Credit top-up                           │ +100.00 │ 110.00  │
│ 2026-01-21 │ usage    │ KYC session approved (Tier 1: 5 credits)│ -5.00   │ 105.00  │
│ 2026-01-21 │ usage    │ KYC session rejected (Tier 1: 5 credits)│ -5.00   │ 100.00  │
│ 2026-01-22 │ usage    │ KYC session approved (Tier 1: 5 credits)│ -5.00   │ 95.00   │
└────────────┴──────────┴─────────────────────────────────────────┴─────────┴─────────┘
```

---

## Webhook Payloads

### Innovatif → TrueStack (Internal)

Innovatif sends an encrypted webhook to our internal endpoint:

```
POST /api/internal/webhooks/innovatif/ekyc
Content-Type: application/json

{
  "data": "<encrypted_payload>"
}
```

Decrypted payload contains:
- `ref_id`: Our session reference
- `onboarding_id`: Innovatif's ID
- `status`: "completed", "expired", "failed"
- `result`: "PASS", "FAIL"
- `name`, `id_number`, `address`, etc. (OCR data)
- `front_document`, `face_image` (base64 images)

### TrueStack → Client (External)

We send a webhook to the client's configured `webhook_url`:

```
POST {client_webhook_url}
Content-Type: application/json
X-TrueStack-Event: kyc.session.completed

{
  "event": "kyc.session.completed",
  "session_id": "uuid",
  "ref_id": "client_ref_123",
  "status": "completed",
  "result": "approved",
  "document_name": "JOHN DOE",
  "document_number": "900101-14-5566",
  "metadata": { ... },
  "timestamp": "2026-01-28T10:30:00Z"
}
```

---

## Session States

```
                    ┌─────────┐
                    │ pending │ ◄── Session created, waiting for user
                    └────┬────┘
                         │
                         │ User starts verification
                         ▼
                  ┌────────────┐
                  │ processing │ ◄── User is completing KYC
                  └─────┬──────┘
                        │
           ┌────────────┼────────────┐
           │            │            │
           ▼            ▼            ▼
     ┌───────────┐ ┌─────────┐ ┌─────────┐
     │ completed │ │ expired │ │ expired │
     │ (approved)│ │(rejected)│ │(timeout)│
     └───────────┘ └─────────┘ └─────────┘
           │            │            │
           │            │            │
           ▼            ▼            │
       ┌───────┐    ┌───────┐        │
       │BILLED │    │BILLED │        │ Not billed
       └───────┘    └───────┘        │ (no completion)
```

---

## API Key Authentication

All client requests must include their API key:

```
POST /api/v1/kyc/sessions
Authorization: Bearer ti_live_abc123...
Content-Type: application/json

{
  "document_name": "JOHN DOE",
  "document_number": "900101145566",
  "document_type": "1"
}
```

The API key:
1. Identifies the client
2. Determines which product (TrueIdentity)
3. Links to the client's credit balance
4. Associates with the client's pricing tiers

---

## Security Considerations

1. **Encrypted Communication**: All Innovatif requests/responses use AES-256-CBC encryption
2. **Signature Verification**: Webhooks include MD5 signatures for verification
3. **API Key Hashing**: Client API keys are hashed (bcrypt) and encrypted at rest
4. **Idempotency**: Webhook processing uses payload hashing to prevent duplicate billing
5. **Advisory Locks**: Credit deductions use PostgreSQL advisory locks to prevent race conditions

---

## Demo Mode

The admin portal includes a demo page (`/demo/trueidentity`) that:
- Creates a `DEMO_CLIENT` with test credentials
- Simulates the full webhook flow
- Stores demo webhooks in `demo_webhook` table
- Shows billing/ledger in real-time

**Note:** In local development, Innovatif webhooks cannot reach `localhost`. The demo shows the redirect status instead.
