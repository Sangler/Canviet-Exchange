# Shufti Pro KYC Callback Configuration

## Overview
After successful KYC verification, users are automatically redirected back to your application to complete their transfer submission.

## Flow
1. User fills transfer form → clicks Submit
2. System detects KYC not verified → prompts user
3. User confirms and is redirected to Shufti Pro for verification
4. After KYC completion → Shufti redirects to `/kyc-callback`
5. Callback page checks KYC status and displays success message
6. User redirected back to `/transfers` at step 3 with success notification
7. User reviews details (card info not saved for security) and submits transfer
8. User redirected to receipt page

## Shufti Pro Dashboard Configuration

### Step 1: Add Redirect URL
1. Login to https://backoffice.shuftipro.com/
2. Navigate to **Settings → Redirect URLs**
3. Click **Add Domain**
4. Add your domain(s):
   - **For localhost (development)**: `localhost`
   - **For production**: `yourdomain.com` (without http://, https://, or www)
   - **Example**: If your site is `https://www.canvietexchange.com`, add: `canvietexchange.com`
5. Click **Save**

### Step 2: Configure Webhook (Optional but Recommended)
Webhooks provide real-time server-side status updates.

1. Navigate to **Settings → Webhooks**
2. Click **Add Webhook**
3. Enter webhook URL:
   - **For production**: `https://yourdomain.com/api/kyc/webhook`
4. Select events to receive:
   - ✅ `verification.accepted`
   - ✅ `verification.declined`
   - ✅ `request.pending`
5. Click **Save**

**Note for Local Development**: Webhooks require a publicly accessible URL. For local testing, you can:
- Deploy to a staging environment
- Use the Shufti dashboard's test mode
- Skip webhook testing and rely on the status check endpoint instead

### Step 3: Environment Variables
Ensure these are set in your backend `.env`:

```env
# Shufti Pro credentials
SHUFTI_CLIENT_ID=your_client_id_here
SHUFTI_SECRET_KEY=your_secret_key_here

# Frontend URL for redirect
FRONTEND_URL=http://localhost:3000  # For development
# FRONTEND_URL=https://yourdomain.com  # For production
```

## Testing the Flow

### Local Development
1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Navigate to `http://localhost:3000/transfers`
4. Fill out the transfer form
5. Click **Submit Transfer**
6. System will detect unverified KYC and prompt
7. Click **OK** to start verification
8. Complete KYC in Shufti Pro window
9. After completion, you'll be redirected to `http://localhost:3000/kyc-callback`
10. Success message displayed, then redirected to `/transfers` at step 3
11. Green success banner appears: "Identity Verified!"
12. Complete payment details and submit transfer
13. Redirected to receipt page

### Troubleshooting

**Issue**: "Redirect URL not whitelisted" error from Shufti
- **Solution**: Ensure you've added the domain (without protocol) in Shufti dashboard
- For localhost, add exactly: `localhost`
- For production, add without www: `yourdomain.com`

**Issue**: User redirected but no success notification
- **Solution**: Check browser console for errors
- Verify URL parameter `kycSuccess=true` is present during redirect
- Ensure router.query is being read correctly

**Issue**: Webhook not receiving calls (Production only)
- **Solution**: 
  - Verify webhook URL is publicly accessible via HTTPS
  - Check Shufti dashboard webhook logs
  - Ensure signature validation is working (check backend logs)
  - For local development, webhooks are not required - the status check endpoint is sufficient

## Security Notes
1. **Never expose** `SHUFTI_SECRET_KEY` in frontend code
2. **Always validate** webhook signatures on the backend
3. **Card details are never stored** in localStorage for security
4. **Use HTTPS** in production for all URLs
5. **User must re-enter payment details** after KYC for security compliance

## API Endpoints

### Check KYC Status
```http
GET /api/kyc/status
Authorization: Bearer {token}
```

### Create Verification
```http
POST /api/kyc/create-verification
Authorization: Bearer {token}
```

### Webhook (Called by Shufti)
```http
POST /api/kyc/webhook
Headers:
  Signature: {calculated_signature}
Body: {verification_result}
```

## Frontend Pages

- `/transfers` - Main transfer form with KYC check and success notification
- `/kyc-callback` - Handles post-verification redirect and displays status
- `/transfers/receipt/{hash}` - Receipt page after successful submission

## Success Notifications

After successful KYC verification, users will see:
1. **Callback page**: "✅ Identity Verified! Redirecting you back to complete your transfer..."
2. **Transfers page**: Green banner at top: "Identity Verified! Your KYC verification is complete. Please review your transfer details and submit."
3. **Submit button**: Shows checkmark icon and "(Verified)" badge when at step 4
