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

### Credit System

TrueStack uses a credit-based billing system:

| Conversion | Value |
|------------|-------|
| **10 credits** | **RM 1.00** |
| 1 credit | RM 0.10 |
| 100 credits | RM 10.00 |
| 1,000 credits | RM 100.00 |

When clients top up, they purchase credits. When KYC sessions complete, credits are deducted based on the configured pricing tier.

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

Each client can have volume-based pricing tiers configured in **credits per session**:

```
┌───────────────────────────────────────────────────────────────────────────┐
│                         Example Pricing Tiers                              │
├─────────────────┬─────────────────┬─────────────────┬─────────────────────┤
│     Tier        │   Volume/Month  │   Credits/KYC   │   MYR Equivalent    │
├─────────────────┼─────────────────┼─────────────────┼─────────────────────┤
│   Tier 1        │   0 - 100       │   50 credits    │   RM 5.00           │
│   Tier 2        │   101 - 500     │   45 credits    │   RM 4.50           │
│   Tier 3        │   501 - 1000    │   40 credits    │   RM 4.00           │
│   Tier 4        │   1001+         │   35 credits    │   RM 3.50           │
└─────────────────┴─────────────────┴─────────────────┴─────────────────────┘
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

All credit transactions are recorded in the `credit_ledger` table. Amounts are stored as **integer credits**:

| Type | Description | Amount (credits) | MYR Equivalent |
|------|-------------|------------------|----------------|
| `topup` | Admin adds credits | +1,000 | RM 100 |
| `included` | Initial/promotional credits | +100 | RM 10 |
| `usage` | KYC session billed | -50 | RM 5 |
| `refund` | Credit refund | +50 | RM 5 |
| `adjustment` | Manual adjustment | ±X | ±X/10 |

Example ledger:
```
┌────────────┬──────────┬──────────────────────────────────────────────┬─────────┬─────────┐
│    Date    │   Type   │              Description                     │ Amount  │ Balance │
├────────────┼──────────┼──────────────────────────────────────────────┼─────────┼─────────┤
│ 2026-01-15 │ included │ Initial demo credits                         │ +100    │ 100     │
│ 2026-01-20 │ topup    │ Credit top-up (RM 100)                       │ +1000   │ 1100    │
│ 2026-01-21 │ usage    │ KYC session approved (Tier 1: 50 credits)    │ -50     │ 1050    │
│ 2026-01-21 │ usage    │ KYC session rejected (Tier 1: 50 credits)    │ -50     │ 1000    │
│ 2026-01-22 │ usage    │ KYC session approved (Tier 1: 50 credits)    │ -50     │ 950     │
└────────────┴──────────┴──────────────────────────────────────────────┴─────────┴─────────┘
```

**Note:** Balance of 950 credits = RM 95.00

---

## Webhook Architecture

TrueStack acts as a **middleware layer** between Innovatif and our clients. There are two separate webhook flows:

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│  Innovatif   │────────►│  TrueStack   │────────►│   Client's   │
│  (Provider)  │         │  (Our API)   │         │   Webhook    │
└──────────────┘         └──────────────┘         └──────────────┘
       │                        │                        │
       │  backend_url           │  webhook_url           │
       │  (always our endpoint) │  (client's endpoint)   │
       │                        │                        │
```

### URL Configuration

| URL Parameter | Set By | Purpose | Value |
|---------------|--------|---------|-------|
| `backend_url` | TrueStack (hardcoded) | Innovatif → TrueStack webhook | `{API_URL}/api/internal/webhooks/innovatif/ekyc` |
| `response_url` | TrueStack (hardcoded) | User redirect after KYC | `{CORE_URL}/r/{session_id}` |
| `webhook_url` | Client (**required per request**) | TrueStack → Client webhook | Client's webhook endpoint |

### Innovatif API Parameters (Hardcoded)

When TrueStack creates a transaction with Innovatif, we set these values:

| Parameter | Value | Description |
|-----------|-------|-------------|
| `backend_url` | `{BETTER_AUTH_URL}/api/internal/webhooks/innovatif/ekyc` | Our webhook receiver (clients cannot change) |
| `response_url` | `{CORE_APP_URL}/r/{session_id}` | TrueStack's status page showing verification result |
| `callback_mode` | `"1"` | Summary mode - includes OCR data but not full images |
| `response_mode` | `"1"` | Include status params in redirect URL query string |

**Note:** Innovatif only supports a single `response_url`, so all users are redirected to TrueStack's status page (`/r/{session_id}`) which displays the verification result (success/failure) based on query parameters.

### Client Webhook Configuration

The `webhook_url` is **required** for every session creation request. This ensures clients always receive webhook notifications for their sessions.

```javascript
// webhook_url is REQUIRED
POST /api/v1/kyc/sessions
{
  "document_name": "John Doe",
  "document_number": "901234-56-7890",
  "webhook_url": "https://myapp.com/webhooks/kyc"  // Required - will reject if missing
}
```

**Validation Rules:**
- Must be provided in every request (no default/fallback)
- Must be a valid HTTP or HTTPS URL
- Request will be rejected with 400 error if missing or invalid format

### Webhook Payloads

#### Innovatif → TrueStack (Internal)

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
- `status`: 2 (completed), 3 (expired)
- `result`: 1 (approved), 0 (rejected)
- `step1.ocr_result`: OCR data (name, IC number, address, etc.)
- `step2`: Face match results
- Images (in detail mode): `front_document_image`, `back_document_image`, `face_image`, `best_frame`

#### TrueStack → Client (External)

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

### Webhook Delivery

| Field | Description |
|-------|-------------|
| `webhook_delivered` | Boolean - true if webhook was successfully delivered |
| `webhook_delivered_at` | Timestamp of successful delivery |
| `webhook_attempts` | Number of delivery attempts |
| `webhook_last_error` | Last error message if delivery failed |

Webhook delivery is attempted once. If no `webhook_url` is configured (neither at session nor client level), no webhook is sent.

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

The admin portal includes a demo page (`/demo/trueidentity`) that simulates a real client integration.

### Demo Client Setup

| Component | Value |
|-----------|-------|
| Client Code | `DEMO_CLIENT` |
| allow_overdraft | `true` (enabled by default) |

### Demo Session Request

When creating a session from the demo page, the request includes:

```javascript
{
  "document_name": "John Doe",
  "document_number": "901234567890",
  "document_type": "1",
  "webhook_url": "{API_URL}/api/demo/webhook",  // Points to our demo webhook receiver
  "metadata": { "demo": true }
}
```

Note: `webhook_url` is passed per-request (required by the API), pointing to the demo webhook receiver endpoint.

### Demo Webhook Flow

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│  Innovatif   │────────►│  TrueStack   │────────►│  Demo Webhook│
│              │         │  Webhook     │         │  Receiver    │
└──────────────┘         └──────────────┘         └──────────────┘
       │                        │                        │
       │                        │                        ▼
       │                        │              ┌──────────────────┐
       │                        │              │  demo_webhook    │
       │                        │              │  table (stores   │
       │                        │              │  for display)    │
       │                        │              └──────────────────┘
```

1. Demo page creates session with `webhook_url` pointing to `/api/demo/webhook`
2. Innovatif sends webhook to `/api/internal/webhooks/innovatif/ekyc`
3. TrueStack processes and forwards to the session's `webhook_url`
4. Demo webhook endpoint stores the webhook in `demo_webhook` table
5. Demo page polls and displays received webhooks

### Local Development Limitation

**Important:** In local development, Innovatif webhooks **cannot reach `localhost`**. This means:

- The demo page will show the redirect URL status instead of webhook data
- To test full webhook flow, deploy to a publicly accessible URL
- The demo page includes a note explaining this limitation

### Demo Features

- **API Key Display**: Shows the demo client's API key (can regenerate)
- **Credits Management**: Top-up credits for testing
- **Pricing Tiers**: View configured pricing tiers
- **Session Creation**: Create KYC sessions with form
- **Webhook Log**: View received webhooks (when publicly accessible)
- **Billing Tab**: View credit ledger showing deductions
- **Allow Overdraft**: Demo client allows negative balance by default
