# TrueStack Client API Documentation

This document describes the API endpoints that TrueStack clients use to integrate KYC functionality into their applications.

## Base URL

- **Production**: `https://api.truestack.my`
- **Local Development**: `http://localhost:3001`

## Authentication

All API requests require authentication via API key in the `Authorization` header:

```
Authorization: Bearer <api_key>
```

API keys are generated per-client in the TrueStack Admin portal under Client > API Keys.

---

## Endpoints

### Create KYC Session

Creates a new KYC verification session for an end-user.

```
POST /api/v1/kyc/sessions
```

#### Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | Bearer token with client API key |
| `Content-Type` | Yes | `application/json` |

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `document_name` | string | **Yes** | Full name as it appears on the identity document |
| `document_number` | string | **Yes** | Identity document number (e.g., MyKad number, passport number) |
| `webhook_url` | string | **Yes** | URL to receive webhook on completion. Must be a valid HTTP/HTTPS URL. |
| `document_type` | string | No | Type of document. Default: `"1"` (MyKad). See Document Types below. |
| `platform` | string | No | End-user's platform. Default: `"Web"`. See Platform Values below. |
| `redirect_url` | string | No | Custom URL to redirect users after KYC completion. If provided, this URL is passed to Innovatif as the `response_url`. If not provided, users are redirected to TrueStack's status page (`/r/{session_id}`). |
| `metadata` | object | No | Custom key-value pairs to associate with the session. Returned in webhooks. |

**Note:** The `success_url` and `fail_url` fields are stored for reference but are legacy fields. Use `redirect_url` for custom redirects.

#### Document Types

| Value | Document Type |
|-------|---------------|
| `1` | MyKad (Malaysian IC) |
| `2` | Passport |

#### Platform Values

| Value | Description |
|-------|-------------|
| `Web` | Desktop or mobile web browser (default) |
| `iOS` | Native iOS application |
| `Android` | Native Android application |

**Note:** Setting the correct platform ensures optimal user experience. For mobile apps using WebView, use `"Web"` but ensure the WebView's user-agent is set to Chrome.

#### Example Request

```bash
curl -X POST https://api.truestack.my/api/v1/kyc/sessions \
  -H "Authorization: Bearer ts_live_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "document_name": "Ahmad bin Abdullah",
    "document_number": "901234-56-7890",
    "webhook_url": "https://yourapp.com/webhooks/kyc",
    "document_type": "1",
    "platform": "Web",
    "metadata": {
      "user_id": "usr_12345",
      "application_id": "app_67890"
    }
  }'
```

#### Success Response

**Status: 201 Created**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "onboarding_url": "https://ekyc.innovatif.com/onboarding/abc123",
  "expires_at": "2026-01-29T12:00:00.000Z",
  "status": "pending"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Unique session identifier. Use this to track the session status. |
| `onboarding_url` | string | URL to redirect the end-user to complete KYC verification. |
| `expires_at` | string (ISO 8601) | When the session expires (24 hours from creation). |
| `status` | string | Initial status, always `"pending"`. |

#### Error Responses

**Status: 400 Bad Request**

Missing required fields:

```json
{
  "error": "BAD_REQUEST",
  "message": "document_name and document_number are required"
}
```

Missing webhook URL:

```json
{
  "error": "BAD_REQUEST",
  "message": "webhook_url is required"
}
```

Invalid webhook URL format:

```json
{
  "error": "BAD_REQUEST",
  "message": "webhook_url must be a valid HTTP/HTTPS URL"
}
```

**Status: 401 Unauthorized**

Invalid or missing API key:

```json
{
  "error": "UNAUTHORIZED",
  "message": "Invalid API key"
}
```

**Status: 402 Payment Required**

Insufficient credits (only if overdraft is disabled):

```json
{
  "error": "INSUFFICIENT_CREDITS",
  "message": "Client credit balance exhausted",
  "balance": 0.5
}
```

**Status: 502 Bad Gateway**

KYC provider error:

```json
{
  "error": "GATEWAY_ERROR",
  "message": "Failed to initiate KYC session"
}
```

---

### Get Session Status

Retrieves the current status of a KYC session from TrueStack's database.

```
GET /api/v1/kyc/sessions/:id
```

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | The session ID returned when creating the session |

#### Example Request

```bash
curl -X GET https://api.truestack.my/api/v1/kyc/sessions/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer ts_live_abc123..."
```

#### Success Response

**Status: 200 OK**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "result": "approved",
  "document_name": "Ahmad bin Abdullah",
  "document_number": "901234-56-7890",
  "document_type": "1",
  "metadata": {
    "user_id": "usr_12345"
  },
  "created_at": "2026-01-28T10:00:00.000Z",
  "updated_at": "2026-01-28T10:05:00.000Z",
  "ocr_result": {
    "name": "AHMAD BIN ABDULLAH",
    "id_number": "901234567890",
    "address": "123 JALAN EXAMPLE, 50000 KUALA LUMPUR"
  },
  "documents": {
    "front_document": "https://api.truestack.my/api/v1/kyc/sessions/.../documents/front_document",
    "back_document": "https://api.truestack.my/api/v1/kyc/sessions/.../documents/back_document",
    "face_image": "https://api.truestack.my/api/v1/kyc/sessions/.../documents/face_image",
    "best_frame": "https://api.truestack.my/api/v1/kyc/sessions/.../documents/best_frame"
  }
}
```

**Note:** `ocr_result` and `documents` are only included when session status is `completed`.

---

### Refresh Session Status

Fetches the latest status directly from the KYC provider (Innovatif) and updates our database. Use this when webhooks are delayed or if you need to verify the current status.

```
POST /api/v1/kyc/sessions/:id
```

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | The session ID returned when creating the session |

#### Example Request

```bash
curl -X POST https://api.truestack.my/api/v1/kyc/sessions/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer ts_live_abc123..."
```

#### Success Response

**Status: 200 OK**

When status was refreshed from provider (includes OCR data, verification results, and S3 image URLs):

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "ref_id": "DEMO_CLI_mkxl2qbq_52c0732a",
  "status": "completed",
  "result": "approved",
  "reject_message": null,
  "refreshed": true,
  
  "document": {
    "full_name": "AHMAD BIN ABDULLAH",
    "id_number": "901234-56-7890",
    "id_number_back": "901234-56-7890-04-01",
    "address": "123 JALAN EXAMPLE, 50000 KUALA LUMPUR",
    "gender": "LELAKI"
  },
  
  "verification": {
    "document_valid": true,
    "name_match": true,
    "id_match": true,
    "front_back_match": true,
    "landmark_valid": true,
    "face_match": true,
    "face_match_score": 95,
    "liveness_passed": true
  },
  
  "images": {
    "front_document": "https://bucket.s3.ap-southeast-5.amazonaws.com/kyc/.../front_document.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=3600&X-Amz-Signature=...",
    "back_document": "https://bucket.s3.ap-southeast-5.amazonaws.com/kyc/.../back_document.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=3600&X-Amz-Signature=...",
    "face_image": "https://bucket.s3.ap-southeast-5.amazonaws.com/kyc/.../face_image.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=3600&X-Amz-Signature=...",
    "best_frame": "https://bucket.s3.ap-southeast-5.amazonaws.com/kyc/.../best_frame.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=3600&X-Amz-Signature=..."
  },
  
  "_raw": {
    "innovatif_status": "2",
    "step1": { ... },
    "step2": { ... }
  }
}
```

#### Response Fields

| Field | Description |
|-------|-------------|
| `id` | TrueStack session UUID |
| `ref_id` | Your reference ID for this session |
| `status` | Session status: `pending`, `processing`, `completed`, `expired` |
| `result` | Verification result: `approved`, `rejected`, or `null` if pending |
| `reject_message` | Reason for rejection (if applicable) |
| `refreshed` | Whether status was updated from provider |
| **document** | |
| `document.full_name` | Full name extracted via OCR |
| `document.id_number` | ID number from front of document |
| `document.id_number_back` | ID number from back of document |
| `document.address` | Address extracted from document |
| `document.gender` | Gender from document |
| **verification** | |
| `verification.document_valid` | Document passed all verification checks |
| `verification.name_match` | Name matches what was provided |
| `verification.id_match` | ID number matches what was provided |
| `verification.front_back_match` | Front and back ID numbers match |
| `verification.landmark_valid` | Document landmarks are valid (anti-fraud) |
| `verification.face_match` | Face matches the ID photo |
| `verification.face_match_score` | Face match confidence (0-100) |
| `verification.liveness_passed` | User passed liveness detection |
| **images** | Pre-signed S3 URLs (valid for 1 hour) |
| `images.front_document` | Pre-signed URL to front of ID document |
| `images.back_document` | Pre-signed URL to back of ID document |
| `images.face_image` | Pre-signed URL to cropped face from ID |
| `images.best_frame` | Pre-signed URL to best frame from liveness check |
| **_raw** | |
| `_raw` | Raw provider response (for debugging) |

> **Note:** Image URLs are pre-signed and expire after 1 hour. If you need to access images after the URLs have expired, call this endpoint again to receive fresh pre-signed URLs. No additional credit charge will be applied for subsequent status checks on already-billed sessions.

When session is already finalized (no refresh needed):

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "result": "approved",
  "message": "Session already finalized",
  "refreshed": false
}
```

When provider is unreachable:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "result": null,
  "refreshed": false,
  "error": "Failed to fetch status from provider"
}
```

#### Use Cases

- **Webhook not received**: If your webhook endpoint didn't receive a notification, call this to check if the session completed.
- **Status verification**: Before taking action based on webhook data, verify the status is accurate.
- **Polling fallback**: If webhooks are blocked by your firewall, poll this endpoint periodically.

**Note:** Avoid calling this endpoint repeatedly in a tight loop. The provider may rate-limit requests. Recommended polling interval: 10-30 seconds.

---

## Integration Flow

1. **Create Session**: Call `POST /api/v1/kyc/sessions` with user details
2. **Redirect User**: Send the end-user to the `onboarding_url` returned
3. **User Completes KYC**: User takes photos of ID and performs liveness check
4. **Webhook Notification**: TrueStack sends a webhook to your configured endpoint
5. **(Optional) Refresh Status**: Call `POST /api/v1/kyc/sessions/:id` if webhook is delayed
6. **Get Full Details**: Call `GET /api/v1/kyc/sessions/:id` to retrieve OCR data and documents

### Sequence Diagram

```
┌──────────┐     ┌──────────────┐     ┌───────────┐     ┌───────────┐
│  Client  │     │  TrueStack   │     │ Innovatif │     │  End User │
│   App    │     │     API      │     │   eKYC    │     │           │
└────┬─────┘     └──────┬───────┘     └─────┬─────┘     └─────┬─────┘
     │                  │                   │                 │
     │ POST /api/v1/kyc/sessions             │                 │
     │─────────────────>│                   │                 │
     │                  │ Create Transaction│                 │
     │                  │──────────────────>│                 │
     │                  │    onboarding_url │                 │
     │                  │<──────────────────│                 │
     │  { id, onboarding_url }              │                 │
     │<─────────────────│                   │                 │
     │                  │                   │                 │
     │ Redirect user to onboarding_url      │                 │
     │──────────────────────────────────────────────────────> │
     │                  │                   │                 │
     │                  │                   │  Complete KYC   │
     │                  │                   │<────────────────│
     │                  │                   │                 │
     │                  │     Webhook       │                 │
     │                  │<──────────────────│                 │
     │    Webhook       │                   │                 │
     │<─────────────────│                   │                 │
     │                  │                   │                 │
     │                  │                   │ Redirect to     │
     │                  │                   │ success/fail_url│
     │                  │                   │────────────────>│
     │                  │                   │                 │
```

---

## Webhooks

When a KYC session is completed (approved or rejected), TrueStack sends a webhook to your configured endpoint.

### Webhook Payload

```json
{
  "event": "kyc.session.completed",
  "timestamp": "2026-01-28T15:30:00.000Z",
  "data": {
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "ref_id": "DEMO_CLI_mkxl2qbq_52c0732a",
    "status": "completed",
    "result": "approved",
    "document_name": "Ahmad bin Abdullah",
    "document_number": "901234-56-7890",
    "ocr_data": {
      "name": "AHMAD BIN ABDULLAH",
      "ic_number": "901234567890",
      "address": "123 JALAN EXAMPLE, 50000 KUALA LUMPUR",
      "gender": "LELAKI",
      "nationality": "WARGANEGARA",
      "date_of_birth": "1990-12-34"
    },
    "face_match_score": 0.95,
    "liveness_score": 0.98,
    "metadata": {
      "user_id": "usr_12345",
      "application_id": "app_67890"
    }
  }
}
```

### Webhook Events

| Event | Description |
|-------|-------------|
| `kyc.session.completed` | Session finished with a final result (approved/rejected) |
| `kyc.session.expired` | Session expired before completion |

### Session Results

| Result | Description |
|--------|-------------|
| `approved` | KYC verification passed |
| `rejected` | KYC verification failed |

### Webhook Security

Webhooks are sent as HTTP POST requests. Verify the webhook authenticity by:

1. Validating the source IP (if applicable)
2. Checking the `X-Webhook-Signature` header (HMAC-SHA256 of body using your API key)

---

## Session Status Values

| Status | Description |
|--------|-------------|
| `pending` | Session created, waiting for user to start |
| `processing` | User has started the KYC process |
| `completed` | KYC process finished (check `result` for outcome) |
| `expired` | Session expired before completion |

---

## Rate Limits

| Limit | Value |
|-------|-------|
| Requests per minute | 60 |
| Concurrent sessions per client | 100 |

---

## Best Practices

1. **Store the session ID**: Always store the returned `id` to correlate with webhook notifications
2. **Always provide webhook_url**: The `webhook_url` is required for every request
3. **Handle webhooks idempotently**: Webhooks may be retried; use `session_id` to deduplicate
4. **Use metadata**: Pass relevant identifiers in `metadata` to link sessions to your records
5. **Monitor credits**: Check your credit balance in the Admin portal; top-up before exhaustion

---

## SDK Examples

### JavaScript/TypeScript

```typescript
const response = await fetch('https://api.truestack.my/api/v1/kyc/sessions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    document_name: 'Ahmad bin Abdullah',
    document_number: '901234-56-7890',
    webhook_url: 'https://yourapp.com/webhooks/kyc',  // Required
    metadata: { user_id: 'usr_12345' },
  }),
});

const { id, onboarding_url } = await response.json();

// Redirect user to onboarding_url
window.location.href = onboarding_url;
```

### Python

```python
import requests

response = requests.post(
    'https://api.truestack.my/api/v1/kyc/sessions',
    headers={
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json',
    },
    json={
        'document_name': 'Ahmad bin Abdullah',
        'document_number': '901234-56-7890',
        'webhook_url': 'https://yourapp.com/webhooks/kyc',  # Required
        'metadata': {'user_id': 'usr_12345'},
    },
)

data = response.json()
session_id = data['id']
onboarding_url = data['onboarding_url']

# Redirect user to onboarding_url
```

### PHP

```php
$ch = curl_init('https://api.truestack.my/api/v1/kyc/sessions');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $apiKey,
    'Content-Type: application/json',
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'document_name' => 'Ahmad bin Abdullah',
    'document_number' => '901234-56-7890',
    'webhook_url' => 'https://yourapp.com/webhooks/kyc',  // Required
    'metadata' => ['user_id' => 'usr_12345'],
]));

$response = curl_exec($ch);
$data = json_decode($response, true);

$sessionId = $data['id'];
$onboardingUrl = $data['onboarding_url'];

// Redirect user to onboarding_url
header('Location: ' . $onboardingUrl);
```
