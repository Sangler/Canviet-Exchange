# Shufti Pro KYC Integration

## Overview
Complete integration with Shufti Pro API for KYC/AML verification in the CanViet Exchange platform.

## Configuration

### Environment Variables (.env)
```env
SHUFTI_CLIENT_ID=e400544149e47b70664d815854888faf5cc09447cf976cb9744e808277a150b4
SHUFTI_SECRET_KEY=SbdVvcdkkW36zsBftxbaSHiNJMvO6ILM
```

## API Endpoints

### 1. Create Verification Request
**Endpoint:** `POST /api/kyc/create-verification`  
**Auth:** Required (Bearer token)  
**Description:** Creates a new verification request with Shufti Pro and returns verification URL

**Request:**
```bash
curl -X POST http://localhost:5000/api/kyc/create-verification \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "ok": true,
  "kycStatus": "pending",
  "verificationUrl": "https://app.shuftipro.com/process/verification/...",
  "reference": "cvx-USER_ID-TIMESTAMP",
  "message": "Verification request created successfully"
}
```

**Shufti Pro Request Payload:**
- `reference`: Unique ID format `cvx-{userId}-{timestamp}`
- `callback_url`: Webhook endpoint for status updates
- `email`: User's email
- `country`: CA (Canada)
- `verification_mode`: "any" (on-site or off-site)
- **Services:**
  - `face`: Face verification
  - `document`: ID verification (passport, driver's license, ID card)
  - `address`: Address verification (utility bill, bank statement)

### 2. Check KYC Status
**Endpoint:** `GET /api/kyc/status`  
**Auth:** Required (Bearer token)  
**Description:** Returns current KYC status, optionally checks with Shufti API

**Response:**
```json
{
  "ok": true,
  "kycStatus": "verified|pending|rejected|not_started",
  "message": "Status message",
  "declinedReason": "Reason if declined"
}
```

### 3. Update KYC Status (Testing/Admin)
**Endpoint:** `POST /api/kyc/update-status`  
**Auth:** Required (Bearer token)  
**Description:** Manually update KYC status for testing

**Request:**
```json
{
  "status": "verified|pending|rejected"
}
```

### 4. Shufti Pro Webhook
**Endpoint:** `POST /api/kyc/webhook/shufti`  
**Auth:** None (signature validated)  
**Description:** Receives callbacks from Shufti Pro with verification results

**Webhook Events:**
- `verification.accepted`: KYC approved → User status set to "verified"
- `verification.declined`: KYC rejected → User status set to "rejected"
- `request.pending`: Verification in progress → User status set to "pending"

**Security:**
- Validates webhook signature using SHA256
- Format: `hash('sha256', response + hash('sha256', secret_key))`
- Signature sent in `Signature` header

## Database Schema Updates

### User Model
Added fields to `backend/src/models/User.js`:

```javascript
{
  KYCStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  KYCReference: { type: String }, // Shufti Pro reference ID (format: cvx-userId-timestamp)
  KYCDeclinedReason: { type: String }, // Reason if verification declined
}
```

## Frontend Integration

### Transfer Flow (transfers.tsx)
When user clicks "Submit Transfer":

1. **Check KYC Status:**
   ```javascript
   const kycResponse = await fetch('http://localhost:5000/api/kyc/status', {
     headers: { 'Authorization': `Bearer ${token}` }
   });
   ```

2. **If Not Verified:**
   - Show confirmation dialog
   - Call `/api/kyc/create-verification`
   - Open verification URL in new tab
   - User completes verification on Shufti Pro
   - Webhook updates user status
   - User returns and can submit transfer

3. **If Verified:**
   - Proceed with transfer submission

## Implementation Details

### Authentication
Uses HTTP Basic Auth with Shufti Pro:
```javascript
const auth = `${SHUFTI_CLIENT_ID}:${SHUFTI_SECRET_KEY}`;
const encoded = Buffer.from(auth).toString('base64');
headers: { 'Authorization': `Basic ${encoded}` }
```

### Signature Validation
For webhooks (accounts created after March 15, 2023):
```javascript
const hashedSecret = crypto.createHash('sha256').update(SECRET_KEY).digest('hex');
const signature = crypto.createHash('sha256')
  .update(responseBody + hashedSecret)
  .digest('hex');
```

### Reference ID Format
`cvx-{userId}-{timestamp}`
- `cvx`: Prefix for CanViet Exchange
- `userId`: MongoDB ObjectId
- `timestamp`: Date.now()

Example: `cvx-507f1f77bcf86cd799439011-1699999999999`

## Testing

### 1. Create Verification (Postman/cURL)
```bash
curl -X POST http://localhost:5000/api/kyc/create-verification \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 2. Simulate Webhook (Testing)
```bash
curl -X POST http://localhost:5000/api/kyc/webhook/shufti \
  -H "Content-Type: application/json" \
  -H "Signature: CALCULATED_SIGNATURE" \
  -d '{
    "reference": "cvx-USER_ID-TIMESTAMP",
    "event": "verification.accepted",
    "verification_result": "verified"
  }'
```

### 3. Manual Status Update (Dev/Testing)
```bash
curl -X POST http://localhost:5000/api/kyc/update-status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "verified"}'
```

## Shufti Pro Dashboard
- **Backoffice:** https://backoffice.shuftipro.com/
- **API Keys:** Settings → API Keys
- **Test Environment:** Use test credentials for development
- **Webhooks:** Configure callback URL in dashboard

## Error Handling

### Common Errors
1. **401 Unauthorized:** Invalid credentials
2. **400 Bad Request:** Missing/invalid parameters
3. **404 Not Found:** User not found
4. **500 Internal Server Error:** API/database error

### Logging
All operations logged with `[Shufti]` prefix:
- `[Shufti] API error:` - API call failures
- `[Shufti Webhook] Received:` - Webhook callbacks
- `[Shufti] Signature validation error:` - Invalid signatures

## Security Considerations

1. **Webhook Signature:** Always validated before processing
2. **Reference Format:** Validated to prevent injection attacks
3. **User Lookup:** Verified before status updates
4. **HTTPS Only:** Use HTTPS in production for callbacks
5. **Secrets:** Never expose client ID/secret key in frontend

## Production Checklist

- [ ] Update callback URL to production domain
- [ ] Enable HTTPS for webhook endpoint
- [ ] Configure production Shufti Pro credentials
- [ ] Test webhook signature validation
- [ ] Set up monitoring for failed verifications
- [ ] Configure email notifications for KYC status changes
- [ ] Add rate limiting to verification creation
- [ ] Implement admin dashboard for KYC review
- [ ] Set up logging/analytics for verification flow

## Support

- **Shufti Pro Docs:** https://developers.shuftipro.com/
- **API Reference:** https://developers.shuftipro.com/docs/verification_endpoints/requests
- **Support:** Contact Shufti Pro support team
