# 🚀 Quick Start Guide - Testing the Referral System

## Step 1: Restart Your Servers

### Backend:
```powershell
cd backend
npm run dev
```

### Frontend:
```powershell
cd frontend
npm run dev
```

---

## Step 2: Test Basic Functionality

### Test 1: Check Auto-Generated Referral Code
1. Create a new user account via `/register`
2. Log in and go to `/referral`
3. ✅ You should see your unique 10-character referral code
4. ✅ Copy the share link

### Test 2: Validate Referral Code (API)
```powershell
# Test in browser or Postman:
GET http://localhost:4000/api/auth/referral/validate/ABC1234567

# Replace ABC1234567 with an actual code from Step 1
```

Expected response:
```json
{
  "valid": true,
  "referrer": {
    "firstName": "John",
    "lastName": "Doe"
  },
  "message": "You'll be referred by John Doe"
}
```

---

## Step 3: Test Registration with Referral

1. **Get a referral link** from User A (created in Step 1)
   - Example: `http://localhost:3000/register?ref=ABC1234567`

2. **Open in incognito/private window** (important!)

3. **Start typing in the referral code field**:
   - ✅ After 10 characters, should show: "✓ You'll be referred by John Doe"
   - ❌ Invalid code should show: "✗ Invalid referral code"

4. **Complete registration** as User B

5. **Check the database** (or use MongoDB Compass):
   ```javascript
   // User B should have:
   {
     "referredBy": ObjectId("..."), // User A's ID
     ...
   }
   
   // User A should have:
   {
     "referrals": [ObjectId("...")], // User B's ID
     ...
   }
   ```

---

## Step 4: Test Google OAuth with Referral

1. **Log out** completely

2. **Visit**: `http://localhost:3000/login?ref=ABC1234567`
   - Replace with actual referral code

3. **Click "Continue with Google"**

4. **Complete Google sign-in**

5. **Check sessionStorage** (before OAuth completes):
   - Open DevTools → Application → Session Storage
   - Should see: `pendingReferral: "ABC1234567"`

6. **After OAuth completes**:
   - `pendingReferral` should be removed
   - New user should be linked to referrer

---

## Step 5: Test Point Rewards

1. **User B (referred user) completes KYC verification**:
   - Go through the full KYC flow
   - Upload documents
   - Wait for verification (or use test mode)

2. **Check User A's points**:
   - User A visits `/referral`
   - ✅ Should see **+100 points** in "Points Earned"
   - ✅ User B should appear in the referrals table with "Verified" badge

---

## Step 6: Test Referral Dashboard

1. **Navigate to `/referral`** as User A

2. **Check all sections**:
   - ✅ Referral code displays clearly
   - ✅ Share link is copyable
   - ✅ "Total Referrals" shows correct count
   - ✅ "Verified Users" shows count of KYC-verified referrals
   - ✅ "Points Earned" shows 100 × verified count
   - ✅ Referrals table shows all referred users

3. **Test copy button**:
   - Click "Copy Link"
   - ✅ Should change to "Copied!" with checkmark
   - ✅ Should revert after 2 seconds
   - ✅ Paste in new tab to verify link works

---

## Common Issues & Solutions

### Issue 1: "pendingReferral not clearing after OAuth"
**Solution**: Check oauth-callback.tsx has the sessionStorage.removeItem code

### Issue 2: "Referral code not auto-generating"
**Solution**: 
- Check User model pre-save hook is present
- Restart backend server
- Create a new user (existing users won't retroactively get codes)

### Issue 3: "Points not awarded after KYC"
**Solution**: 
- Check kycController.js has the point reward code in both:
  - Status polling handler (~line 620)
  - Webhook handler (~line 1035)
- Verify the referredBy relationship exists in database

### Issue 4: "Validation endpoint returns 404"
**Solution**: 
- Check auth.js routes file has the new route
- Restart backend
- Verify URL: `/api/auth/referral/validate/:code`

### Issue 5: "Can't see Referral Program in menu"
**Solution**:
- Check _nav.js has the new menu item
- Verify you're logged in as a regular user (not admin)
- Refresh the page

---

## Database Queries for Testing

### Check User's Referral Code
```javascript
db.users.findOne({ email: "test@example.com" }, { referralCode: 1, referrals: 1, referredBy: 1, points: 1 })
```

### Find All Users Who Used a Specific Code
```javascript
const referrer = db.users.findOne({ referralCode: "ABC1234567" })
db.users.find({ referredBy: referrer._id })
```

### Check Point Totals
```javascript
db.users.find({ points: { $gt: 0 } }, { firstName: 1, lastName: 1, points: 1, referrals: 1 })
```

---

## Expected File Changes Summary

**Backend (5 files modified):**
- ✅ `backend/src/controllers/authController.js` - Added validateReferralCode
- ✅ `backend/src/controllers/usersController.js` - Added getReferralStats
- ✅ `backend/src/controllers/kycController.js` - Added point rewards (2 locations)
- ✅ `backend/src/routes/auth.js` - Added validation route
- ✅ `backend/src/routes/users.js` - Added stats route

**Frontend (8 files modified/created):**
- ✅ `frontend/pages/login.tsx` - Referral capture & OAuth integration
- ✅ `frontend/pages/register.tsx` - Real-time validation
- ✅ `frontend/pages/oauth-callback.tsx` - SessionStorage cleanup
- ✅ `frontend/components/ReferralDashboard.tsx` - **NEW FILE**
- ✅ `frontend/pages/referral.tsx` - **NEW FILE**
- ✅ `frontend/_nav.js` - Added menu item
- ✅ `frontend/styles/globals.css` - Added styles

**Documentation:**
- ✅ `REFERRAL_SYSTEM_IMPLEMENTATION.md` - Full documentation
- ✅ `REFERRAL_QUICK_START.md` - This file

---

## Testing Checklist

Use this checklist to verify everything works:

- [ ] New users get auto-generated referral codes
- [ ] Validation API returns correct responses
- [ ] Register page shows real-time validation
- [ ] Valid code shows referrer's name
- [ ] Invalid code shows error message
- [ ] Registration with referral links users correctly
- [ ] Google OAuth preserves referral code via state param
- [ ] SessionStorage cleared after OAuth
- [ ] Referral dashboard loads without errors
- [ ] Copy button works and provides feedback
- [ ] Stats show correct counts
- [ ] Referrals table displays all referred users
- [ ] Points awarded when referred user verifies KYC
- [ ] Navigation menu shows "Referral Program" (users only)
- [ ] Self-referral is prevented
- [ ] Duplicate linking is prevented

---

## Quick Demo Script

**For presentations or testing:**

1. **Show referral dashboard** (User A)
   - "Here's my unique referral code and shareable link"

2. **Copy and share link**
   - "I can easily copy this link to share with friends"

3. **Open in new window** (incognito)
   - "When my friend visits this link..."

4. **Show validation** (User B registration)
   - "They see my name immediately"
   - "Real-time validation ensures code is correct"

5. **Complete registration**
   - "They complete their account setup"

6. **Show updated dashboard** (User A)
   - "I can see my friend in my referrals list"
   - "Once they verify KYC, I'll earn 100 points"

7. **Simulate KYC completion**
   - "After verification, points update automatically"

---

## Support & Debugging

**Enable verbose logging:**
```javascript
// In backend controllers, add:
console.log('Referral validation:', { code, referrer });
console.log('Points awarded:', { referrer: user.referredBy, points: 100 });
```

**Check frontend console:**
- Open DevTools → Console
- Look for validation API calls
- Check sessionStorage state

**Test API endpoints directly:**
```powershell
# PowerShell examples:
Invoke-RestMethod -Uri "http://localhost:4000/api/auth/referral/validate/ABC1234567" -Method Get

# With authentication:
$token = "your-jwt-token"
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri "http://localhost:4000/api/users/referral/stats" -Headers $headers -Method Get
```

---

**🎉 Happy Testing!**

Your referral system is fully implemented and ready to generate viral growth for CanViet Exchange!
