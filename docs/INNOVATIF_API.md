# Innovatif eKYC Gateway API Documentation

**Provider:** MyNasional eKYC Sdn Bhd (f.k.a. Innov8tif Solutions Sdn Bhd)  
**API Version:** 2.7  
**Last Updated:** January 2026  

---

## 1. Overview

The eKYC Gateway API enables identity verification through Innovatif's (Xendity) eKYC web platform. Clients create a transaction to obtain a unique onboarding URL, which end-users open to complete the KYC process.

### Integration Options

1. **Webhook-based (Recommended)**: Provide a callback URL to receive status updates automatically when KYC is completed or expires.
2. **Polling-based**: Periodically call the Get Status API to check transaction status.

### High-Level Flow

```
1. Client creates transaction → Receives onboarding URL
2. End-user opens URL → Completes KYC steps
3. On completion/expiry → Innovatif sends webhook OR client polls status
4. Client processes result → Proceeds with business logic
```

---

## 2. Authentication & Security

### Required Credentials

| Item | Description |
|------|-------------|
| `api_key` | 32-character API key provided by Innovatif |
| `package_name` | Equivalent to API username, provided by Innovatif |
| `md5_key` (Security Key) | Used for signature generation |
| `ciphertext` | AES-256-CBC IV (base64 encoded: `MTIzNDU2Nzg5MDEy` = "123456789012") |

### Environment Variables

```bash
INNOVATIF_API_KEY=your_api_key
INNOVATIF_PACKAGE_NAME=your_package_name
INNOVATIF_MD5_KEY=m4X12dM8GeYGYl1gLXO8PaZTERGG9bVt
INNOVATIF_CIPHERTEXT=MTIzNDU2Nzg5MDEy
INNOVATIF_BASE_URL=https://staging.ekyc.xendity.com/v1/gateway
```

### Base URLs

| Environment | URL |
|-------------|-----|
| Staging/UAT | `https://staging.ekyc.xendity.com/v1/gateway/` |
| Production | `https://staging.ekyc.xendity.com/v1/gateway/` |

---

## 3. Signature Generation

Every request must include a security signature generated as follows:

```
source_string = api_key + md5_key + package_name + ref_id + md5_key + request_time
signature = base64(md5(source_string))
```

### Example (JavaScript)

```javascript
const crypto = require('crypto');

function generateSignature(apiKey, md5Key, packageName, refId, requestTime) {
  const source = apiKey + md5Key + packageName + refId + md5Key + requestTime;
  const md5Hash = crypto.createHash('md5').update(source).digest();
  return md5Hash.toString('base64');
}
```

### Example (PHP)

```php
$source = $api_key . $md5key . $package_name . $ref_id . $md5key . $request_time;
$signature = base64_encode(md5($source, true));
```

---

## 4. Request Encryption

All request bodies must be encrypted using AES-256-CBC before sending.

### Encryption Parameters

| Parameter | Value |
|-----------|-------|
| Algorithm | AES-256-CBC |
| IV | `ciphertext` (base64 decoded → "123456789012") |
| Key | `(ciphertext_decoded + api_key).substring(0, 32)` |

### Encryption Process

1. Convert request body to JSON string
2. Encrypt using AES-256-CBC with the derived key and IV
3. Base64 encode the encrypted data
4. Send as: `{ "api_key": "...", "data": "<encrypted_base64>" }`

### JavaScript Example

```javascript
const CryptoJS = require('crypto-js');

function encryptRequest(body, apiKey, cipherKey) {
  const iv = CryptoJS.enc.Utf8.parse(atob(cipherKey)); // "123456789012"
  const key = CryptoJS.enc.Utf8.parse((atob(cipherKey) + apiKey).substring(0, 32));
  
  const encrypted = CryptoJS.AES.encrypt(
    JSON.stringify(body),
    key,
    { iv: iv }
  ).toString();
  
  return { api_key: apiKey, data: encrypted };
}
```

### Node.js Example

```javascript
const crypto = require('crypto');

function encryptRequest(body, apiKey, ciphertext) {
  const ivBuffer = Buffer.from(ciphertext, 'base64');
  const keySource = ivBuffer.toString() + apiKey;
  const key = Buffer.from(keySource.substring(0, 32));
  
  const cipher = crypto.createCipheriv('aes-256-cbc', key, ivBuffer);
  let encrypted = cipher.update(JSON.stringify(body), 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  return { api_key: apiKey, data: encrypted.toString('base64') };
}
```

---

## 5. API Endpoints

### 5.1 Create Transaction

Creates a new eKYC onboarding transaction and returns the verification URL.

**Endpoint:** `POST {base_url}/create-transaction`

#### Request Body (before encryption)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `api_key` | String | Yes | API key (32 chars) |
| `package_name` | String | Yes | Package name (255 chars) |
| `ref_id` | String | Yes | Unique transaction ID from client (32 chars) |
| `document_name` | String | Yes | Full name as per ID document (100 chars) |
| `document_number` | String | Yes | ID number, format: 000000112222 (14 chars) |
| `document_type` | String | No | Document type code (default: "1" = MyKad) |
| `platform` | String | Yes | "Web", "iOS", or "Android" |
| `signature` | String | Yes | Security signature |
| `response_url` | String | Yes | Redirect URL after completion |
| `backend_url` | String | No | Webhook URL for status updates |
| `callback_mode` | String | Yes | "0" = None, "1" = Summary, "2" = Detail |
| `response_mode` | String | No | "0" = No queries, "1" = With queries in redirect |
| `request_time` | String | Yes | Format: "YYYY-MM-DD HH:mm:ss" |
| `remark` | String | No | Client remarks (200 chars) |

#### Document Types

| Code | Document |
|------|----------|
| 1 | MyKad (default) |
| 2 | MyTentera |
| 3 | Passport |
| 4 | MyKid |
| 5 | MyPR |
| 6 | MyKas |
| 7 | PH PRC |
| 8 | PH Driving |
| 9 | PH SSS |
| 10 | PH UMID |
| 11 | PH Voter ID |
| 12 | PH National ID |
| 13 | PH Postal ID |
| 14 | Cambodia ID |

#### Response

| Field | Type | Description |
|-------|------|-------------|
| `api_key` | String | As per request |
| `package_name` | String | As per request |
| `ref_id` | String | Prepended with user prefix for uniqueness |
| `onboarding_id` | String | Unique onboarding transaction ID |
| `onboarding_url` | String | URL for user to complete KYC |
| `expired_at` | Timestamp | Expiry time of the URL (default: 300 minutes) |
| `error_code` | String | Error code if failed |

---

### 5.2 Get Status

Retrieves the status and details of a KYC transaction.

**Endpoint:** `POST {base_url}/get-status`

#### Request Body (before encryption)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `api_key` | String | Yes | API key |
| `package_name` | String | Yes | Package name |
| `ref_id` | String | Yes | Transaction ref_id (from create response) |
| `onboarding_id` | String | Yes | Onboarding ID from create response |
| `platform` | String | Yes | "Web", "iOS", or "Android" |
| `signature` | String | Yes | Security signature |
| `request_time` | String | Yes | Format: "YYYY-MM-DD HH:mm:ss" |
| `mode` | Integer | Yes | 1 = Summary (recommended), 2 = Detail with images |

---

## 6. Response Fields

### Status Codes

| Code | Status |
|------|--------|
| 0 | URL Not Opened |
| 1 | Processing |
| 2 | Completed |
| 3 | Expired |

### Result Codes

| Code | Result |
|------|--------|
| 0 | Rejected |
| 1 | Approved |
| 2 | Not Available |

### Response Structure (Summary Mode)

```json
{
  "success": true,
  "data": {
    "api_key": "...",
    "package_name": "...",
    "ref_id": "...",
    "mode": 1,
    "onboarding_id": "...",
    "request_time": "...",
    "signature": "...",
    "status": 2,
    "result": 1,
    "reject_message": null,
    "step1": {
      "status": true,
      "ocr_result": {
        "full_name": "FULL NAME HERE",
        "front_document_number": "000000-00-0000",
        "address": "ADDRESS",
        "gender": "MALE",
        "back_document_number": "000000-00-0000-03-01"
      },
      "text_similarity_result": {
        "name_similarity_status": true,
        "document_number_similarity_status": true,
        "front_back_number_similarity_status": true
      },
      "landmark_status": {
        "landmark_is_valid": true,
        "labelcheck_result": true,
        "materialcheck_result": true
      },
      "attempt": 2,
      "updated_at": 15913221
    },
    "step2": {
      "status": true,
      "is_identical": true,
      "percentage": "80.99",
      "attempt": 2,
      "updated_at": 15913221
    }
  }
}
```

### Response Structure (Detail Mode)

Detail mode includes all summary fields plus:

- `front_document_image`: Base64 encoded front ID image
- `back_document_image`: Base64 encoded back ID image
- `face_image`: Base64 encoded face image from ID
- `best_frame`: Base64 encoded best frame from liveness check
- Full landmark breakdown (individual landmark checks)
- Similarity scores (not just status)

---

## 7. Webhook Handling

### Trigger Points

Webhooks are sent when:
- Transaction is **completed** (approved or rejected)
- Transaction **expires** before completion

### Webhook Payload

Same structure as Get Status API response, sent to the `backend_url` specified during transaction creation.

### Recommended Security Controls

1. Validate `ref_id` and `onboarding_id` against your database
2. Verify the signature matches your generated signature
3. Implement idempotency to handle duplicate webhooks

### Webhook Payload Example

```json
{
  "api_key": "...",
  "data": "<encrypted_payload>"
}
```

After decryption, the payload follows the Get Status response format.

---

## 8. OCR Fields by Document Type

### MyKad (Type 1)

| Field | Description |
|-------|-------------|
| `full_name` | Name from front IC |
| `front_document_number` | IC number (000000-00-0000) |
| `address` | Full address |
| `gender` | MALE/FEMALE |
| `back_document_number` | Back IC number with version |

### Passport (Type 3)

| Field | Description |
|-------|-------------|
| `full_name` | Passport holder name |
| `front_document_number` | Passport number |
| `gender` | MALE/FEMALE |
| `date_of_birth` | YYYY-MM-DD |
| `date_of_expiry` | YYYY-MM-DD |
| `nationality` | 3-letter code |

### MyKid (Type 4)

Includes all MyKad fields plus:
- `birth_registration_no`
- `state_of_birth`
- `date_of_birth`
- `mother_name`
- `mother_id_number`

---

## 9. Error Codes

| Code | Message |
|------|---------|
| 100 | Missing Parameter |
| 101 | Invalid API Key |
| 102 | Invalid Package Name |
| 103 | Invalid Ref ID |
| 104 | Invalid Security Token (signature) |
| 105 | Service not available, please try again later |
| 400 | Bad request. Encrypt Failed |
| 401 | Invalid Credential |
| 5xx | Internal Server Error |

### Reject Messages

| Message |
|---------|
| Consent accepted |
| OCR preview update completed |
| Exceed maximum number of retries |
| Step 1 passed |
| OCR failed |
| Session expired and onboarding process not finished |
| Step 2 passed |
| Step 2 failed |
| EKYC onboarding process successful |

---

## 10. Landmark Detection (MyKad)

Step 1 performs document authenticity checks via landmark detection:

### Front IC Landmarks

- `kad_pengenalan_malaysia` - Header text
- `mykad_logo` - MyKad logo
- `malaysia_flag` - Malaysia flag
- `id_number` - IC number presence
- `customer_name` - Name field
- `address` - Address field
- `msc_logo` - MSC logo
- `hibiscus_logo` - Hibiscus flower
- `photo_image` - Photo presence
- `citizenship_indicator` - Citizenship marker
- `gender_indicator` - Gender marker
- `religion_indicator` - Religion marker

### Back IC Landmarks

- `the_coat_of_arms_of` - Coat of arms
- `klcc_tower` - KLCC tower image
- `king_crown` - Crown symbol
- `ketua_pengarah` - Director signature
- `id_number_back` - IC number on back
- `touch_n_go_logo` - Touch 'n Go logo
- `atm_logo` - ATM logo
- `chip_logo` - Chip logo
- `serial_number` - Serial number
- `security_chip` - Security chip
- `signature` - Signature field
- `malaysia_word` - "Malaysia" text

### Additional Checks

- `front_document_color_check` - Color verification
- `back_document_color_check` - Color verification
- `version_check` - "64K" or "80K"
- `photo_ghost_comparable` - Ghost image comparison
- `labelcheck_result` - Label verification
- `materialcheck_result` - Material verification

---

## 11. Facial Recognition (Step 2)

| Field | Description |
|-------|-------------|
| `status` | Whether step 2 was completed |
| `is_identical` | Face match result (true/false) |
| `percentage` | Match percentage (e.g., "80.99") |
| `best_frame` | Base64 encoded best frame (detail mode only) |
| `attempt` | Number of attempts |

The face is compared between:
1. Photo on the ID document
2. Live selfie/video captured during verification

---

## 12. Compatible Devices

| Platform | Supported Browsers |
|----------|-------------------|
| iOS | Safari, Google Chrome |
| Android | Google Chrome, non-WebView browsers |

**Note:** For WebView, set the user-agent to Chrome.

---

## 13. Our Implementation

### Files

- `packages/shared/lib/innovatif.ts` - Encryption, decryption, API calls
- `apps/backend/app/api/internal/webhooks/innovatif/ekyc/route.ts` - Webhook handler

### Key Functions

```typescript
// Generate signature
generateSignature(refId: string, requestTime: string): string

// Encrypt request body
encryptRequest(body: object): string

// Decrypt response
decryptResponse(encryptedData: string): unknown

// Create transaction
createInnovatifTransaction(params, backendUrl): Promise<{onboardingId, onboardingUrl}>

// Get transaction status
getInnovatifTransactionStatus(refId): Promise<{status, result, data}>
```

---

## References

- Original API Documentation: `docs/MYN-eKYC_TrueStack_eKYC Gateway API Doc_20250520_v2.7.pdf`
- Trial Credentials: `docs/MYN-eKYC_TrueStack_eKYC Gateway Trial_20260119_v1.0.pdf`
- PHP Example: `docs/info_request_gateway.php`
- JavaScript Examples: `docs/JS_Encrypt.html`, `docs/JS_Sample.html`
