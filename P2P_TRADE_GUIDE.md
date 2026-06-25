# CanViet Exchange - P2P Trade Platform Documentation

## Overview

This guide explains how the **P2P Trade model** works, enabling direct transactions between users and admins with real-time chat and payment proof verification using Amazon S3 storage.

---

## Architecture & Flow

### **1. P2P Trade Workflow**

```
User Creates Request
    ↓
[Displays Available Admins (AdminProfile)] ← GET /api/admins
    ↓
Admin Claims Request
    ↓
[Shows Chat & Payment Proof Upload UI] ← P2P Trade View
    ↓
User Uploads Payment Proof (→ S3)
    ↓
Admin Verifies Proof & Sends Chat Message
    ↓
Request Status: pending_payment → payment_received → completed
```

---

## Database Schemas

### **1. AdminProfile Model**
Stores public-facing admin information for P2P trading:

```javascript
{
  userId: ObjectId,                    // Reference to User (admin)
  displayName: String,                 // e.g., "Thanh Nguyen"
  bio: String,                         // e.g., "Verified P2P trader, 5+ years experience"
  avatar: String,                      // S3 URL to profile picture
  successfulTransfers: Number,         // e.g., 542
  totalVolume: Number,                 // e.g., 250000 (in CAD)
  averageRating: Number,               // 1-5 stars
  responseTimeHours: Number,           // e.g., 2 hours average
  isAvailable: Boolean,                // Online status
  availabilitySchedule: Object,        // { monday: {start, end}, ... }
  minTradeAmount: Number,              // e.g., 50 CAD
  maxTradeAmount: Number,              // e.g., 10000 CAD
  verificationBadge: String,           // 'none', 'verified', 'elite'
  email: String,                       // Hidden from public
  phone: String                        // Hidden from public
}
```

### **2. RequestChat Model**
Real-time messaging between user and assigned admin:

```javascript
{
  requestId: ObjectId,                 // Link to Request
  senderId: ObjectId,                  // User or Admin
  senderRole: String,                  // 'user' or 'admin'
  senderName: String,                  // Snapshot at message time
  message: String,                     // Message content (max 5000 chars)
  attachment: String,                  // S3 URL (optional)
  attachmentType: String,              // 'image', 'document', null
  isEdited: Boolean,                   // Can edit within 5 minutes
  editedAt: Date,
  readAt: Date,                        // For read receipts (Phase 5)
  createdAt: Date
}
```

### **3. PaymentProof Model**
Tracks payment evidence (receipts, bank transfer confirmations, etc.):

```javascript
{
  requestId: ObjectId,                 // Reference to Request
  userId: ObjectId,                    // User who uploaded
  s3Key: String,                       // S3 file key (unique)
  s3Url: String,                       // Public CloudFront/S3 URL
  fileName: String,                    // Original file name
  fileSize: Number,                    // In bytes
  mimeType: String,                    // 'image/png', 'application/pdf', etc
  proofType: String,                   // 'bank_transfer', 'e_transfer', 'card_payment', 'crypto_receipt'
  description: String,                 // e.g., "E-transfer sent to admin's account"
  verificationStatus: String,          // 'pending', 'verified', 'rejected'
  verifiedBy: ObjectId,                // Admin who verified
  verificationNotes: String,           // "Confirmed on bank portal"
  verifiedAt: Date,
  uploadedAt: Date (indexed)
}
```

### **4. Updated Request Model**
New fields for P2P trade:

```javascript
{
  // ... existing fields ...
  
  // P2P assignment
  assignedAdmin: ObjectId,             // Admin handling this trade
  
  // Payment tracking
  paymentStatus: String,               // 'pending_payment', 'payment_received', 'processing', 'completed'
  
  // ... rest of fields ...
}
```

---

## API Endpoints

### **Admin Profile APIs**

#### **1. List Available Admins**
```http
GET /api/admins?available=true&limit=10&skip=0
```
**Use Case:** Display admin list to user when creating transfer

**Response:**
```json
{
  "ok": true,
  "admins": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "displayName": "Thanh Nguyen",
      "bio": "Verified trader, 5+ years",
      "avatar": "https://cdn.example.com/admin-1.jpg",
      "successfulTransfers": 542,
      "averageRating": 4.9,
      "responseTimeHours": 2,
      "isAvailable": true,
      "verificationBadge": "elite"
    }
  ],
  "pagination": { "total": 8, "limit": 10, "skip": 0 }
}
```

#### **2. Get Admin Details**
```http
GET /api/admins/:adminId
```

#### **3. Update Own Admin Profile** (Admin only)
```http
PATCH /api/admins/me/profile
```
**Body:**
```json
{
  "displayName": "Thanh Nguyen",
  "bio": "Based in Toronto, 5+ years remittance experience",
  "avatar": "https://s3.amazonaws.com/...",
  "minTradeAmount": 50,
  "maxTradeAmount": 10000,
  "responseTimeHours": 2,
  "isAvailable": true,
  "availabilitySchedule": {
    "monday": { "start": "09:00", "end": "21:00" },
    "tuesday": { "start": "09:00", "end": "21:00" },
    "saturday": { "start": "10:00", "end": "23:00" }
  }
}
```

#### **4. Claim a Request** (Admin only)
```http
PATCH /api/admins/:requestId/claim
```
**Use Case:** Admin accepts a transfer and becomes the counterparty

#### **5. Get Assigned Admin Info** (User view)
```http
GET /api/admins/:requestId/details
```
**Response:**
```json
{
  "ok": true,
  "admin": {
    "_id": "507f1f77bcf86cd799439011",
    "displayName": "Thanh Nguyen",
    "avatar": "https://...",
    "successfulTransfers": 542,
    "averageRating": 4.9,
    "responseTimeHours": 2
  }
}
```

---

### **Chat APIs**

#### **1. Get Chat Messages**
```http
GET /api/chats/:requestId?limit=50&skip=0
```
**Response:**
```json
{
  "ok": true,
  "messages": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "requestId": "507f1f77bcf86cd799439011",
      "senderId": "507f1f77bcf86cd799439013",
      "senderRole": "admin",
      "senderName": "Thanh Nguyen",
      "message": "Hi! I'm ready to receive the payment. Transfer to this account: ...",
      "attachment": null,
      "isEdited": false,
      "readAt": "2026-03-30T12:34:56Z",
      "createdAt": "2026-03-30T12:30:00Z"
    },
    {
      "_id": "507f1f77bcf86cd799439014",
      "requestId": "507f1f77bcf86cd799439011",
      "senderId": "507f1f77bcf86cd799439015",
      "senderRole": "user",
      "senderName": "John Doe",
      "message": "Got it! Sending $100 CAD now",
      "attachment": "https://s3.amazonaws.com/proof-123.png",
      "attachmentType": "image",
      "isEdited": false,
      "readAt": null,
      "createdAt": "2026-03-30T12:35:00Z"
    }
  ],
  "pagination": { "total": 12, "limit": 50, "skip": 0, "hasMore": false }
}
```

#### **2. Send a Message**
```http
POST /api/chats/:requestId
```
**Body:**
```json
{
  "message": "Payment sent! Transfer reference: P12345",
  "attachment": "https://s3.amazonaws.com/proof-123.png",
  "attachmentType": "image"
}
```

#### **3. Edit Message** (within 5 minutes)
```http
PATCH /api/chats/:messageId
```
**Body:**
```json
{
  "message": "Updated: Payment sent to the bank account ..."
}
```

#### **4. Delete Message**
```http
DELETE /api/chats/:messageId
```

---

### **Payment Proof APIs**

#### **1. Get S3 Upload URL** (Direct browser upload)
```http
POST /api/payment-proofs/:requestId/upload-url
```
**Body:**
```json
{
  "fileName": "bank-transfer-receipt.png",
  "fileType": "image/png"
}
```
**Response:**
```json
{
  "ok": true,
  "uploadUrl": "https://s3.amazonaws.com/..?X-Amz-Algorithm=...",
  "s3Key": "payment-proofs/507f1f77bcf86cd799439011/507f1f77bcf86cd799439015/1711801800000_bank-receipt.png",
  "publicUrl": "https://cdn.example.com/payment-proofs/.../bank-receipt.png",
  "expiresIn": 3600
}
```

**Frontend Usage (Direct S3 Upload):**
```javascript
// 1. Get presigned URL from backend
const response = await fetch('/api/payment-proofs/:requestId/upload-url', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fileName: file.name,
    fileType: file.type
  })
});

const { uploadUrl, s3Key, publicUrl } = await response.json();

// 2. Upload directly to S3 using presigned URL
await fetch(uploadUrl, {
  method: 'PUT',
  headers: { 'Content-Type': file.type },
  body: file
});

// 3. Register proof in database
await fetch('/api/payment-proofs/:requestId', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    s3Key,
    s3Url: publicUrl,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
    proofType: 'e_transfer',
    description: 'E-transfer sent successfully'
  })
});
```

#### **2. Register Payment Proof**
```http
POST /api/payment-proofs/:requestId
```
**Body:**
```json
{
  "s3Key": "payment-proofs/507f1f77bcf86cd799439011/507f1f77bcf86cd799439015/proof.png",
  "s3Url": "https://cdn.example.com/payment-proofs/.../proof.png",
  "fileName": "bank-transfer-receipt.png",
  "fileSize": 245670,
  "mimeType": "image/png",
  "proofType": "bank_transfer",
  "description": "E-transfer sent to admin's account on March 30"
}
```

#### **3. Get All Proofs for Request**
```http
GET /api/payment-proofs/:requestId
```
**Response:**
```json
{
  "ok": true,
  "proofs": [
    {
      "_id": "507f1f77bcf86cd799439016",
      "requestId": "507f1f77bcf86cd799439011",
      "userId": "507f1f77bcf86cd799439015",
      "s3Url": "https://cdn.example.com/...",
      "fileName": "receipt.png",
      "fileSize": 245670,
      "mimeType": "image/png",
      "proofType": "e_transfer",
      "description": "E-transfer confirmation",
      "verificationStatus": "pending",
      "verifiedBy": null,
      "uploadedAt": "2026-03-30T12:35:00Z"
    }
  ]
}
```

#### **4. Verify/Reject Proof** (Admin only)
```http
PATCH /api/payment-proofs/:proofId/verify
```
**Body:**
```json
{
  "verificationStatus": "verified",
  "notes": "Confirmed on RBC portal, amount matches expected"
}
```

#### **5. Delete Proof** (Admin only)
```http
DELETE /api/payment-proofs/:proofId
```
Removes from S3 and database

---

## AWS S3 Configuration

### **Setup Instructions**

1. **Create S3 Bucket:**
   ```bash
   aws s3 mb s3://canviet-exchange-uploads --region us-east-1
   ```

2. **Create IAM User for backend access:**
   ```bash
   # Get AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
   ```

3. **Add to `.env`:**
   ```env
   AWS_ACCESS_KEY_ID=AKIA...
   AWS_SECRET_ACCESS_KEY=...
   AWS_S3_BUCKET=canviet-exchange-uploads
   AWS_REGION=us-east-1
   AWS_S3_BASE_URL=https://canviet-exchange-uploads.s3.amazonaws.com
   ```

4. **Install AWS SDK:**
   ```bash
   npm install aws-sdk
   ```

5. **S3 Bucket Policy** (allow public read):
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::canviet-exchange-uploads/payment-proofs/*"
       }
     ]
   }
   ```

6. **CloudFront Configuration** (optional, for faster CDN delivery):
   - Create CloudFront distribution pointing to S3 bucket
   - Add `CLOUDFRONT_DOMAIN=d123.cloudfront.net` to `.env`

---

## File Storage Structure

**S3 Folder Organization:**
```
canviet-exchange-uploads/
├── payment-proofs/
│   ├── 507f1f77bcf86cd799439011/  (requestId)
│   │   ├── 507f1f77bcf86cd799439015/  (userId)
│   │   │   ├── 1711801800000_bank-transfer.png
│   │   │   ├── 1711802100000_e-transfer.png
│   │   │   └── 1711802400000_receipt.pdf
│   │   ├── ...
```

**Key Format:**
```
payment-proofs/{requestId}/{userId}/{timestamp}_{fileName}
```

---

## Frontend Implementation Example

### **Display Admin List & Select**
```jsx
// Get available admins
const admins = await fetch('/api/admins?available=true&limit=10').then(r => r.json());

// Show list of admins with profiles
admins.forEach(admin => {
  console.log(`
    Admin: ${admin.displayName}
    Rating: ${admin.averageRating}⭐
    Successful Trades: ${admin.successfulTransfers}
    Response Time: ${admin.responseTimeHours}h
    Badge: ${admin.verificationBadge}
  `);
});

// User selects admin and creates request with assignedAdmin field
const request = await fetch('/api/requests', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amountSent: 100,
    currencyFrom: 'CAD',
    currencyTo: 'VND',
    sendingMethod: { type: 'e-transfer' },
    recipientBank: { ... },
    preferredAdmin: '507f1f77bcf86cd799439011'  // (optional)
  })
});
```

### **Real-time Chat UI**
```jsx
// Fetch chat messages
const chat = await fetch(`/api/chats/${requestId}`).then(r => r.json());

// Display messages
chat.messages.forEach(msg => {
  console.log(`
    [${msg.createdAt}] ${msg.senderName} (${msg.senderRole}):
    ${msg.message}
    ${msg.attachment ? '📎 Attachment: ' + msg.attachment : ''}
    ${msg.isEdited ? '(edited)' : ''}
  `);
});

// Send message with optional image upload
const newMsg = await fetch(`/api/chats/${requestId}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Payment proof attached',
    attachment: 'https://...',
    attachmentType: 'image'
  })
});
```

### **Upload Payment Proof Directly to S3**
```jsx
async function uploadPaymentProof(file) {
  // Step 1: Get presigned URL
  const urlResponse = await fetch(`/api/payment-proofs/${requestId}/upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type
    })
  });
  
  const { uploadUrl, s3Key, publicUrl } = await urlResponse.json();
  
  // Step 2: Upload to S3
  await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file
  });
  
  // Step 3: Register in database
  await fetch(`/api/payment-proofs/${requestId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      s3Key,
      s3Url: publicUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      proofType: 'e_transfer',
      description: file.name
    })
  });
  
  console.log('✅ Proof uploaded and registered');
}
```

---

## Security Considerations

☑ **Presigned URLs** expire in 1 hour
☑ **S3 files** organized by requestId & userId for access control
☑ **Authorization checks** on all endpoints (user can only see their own chat/proofs)
☑ **File type validation** (JPEG, PNG, WebP, PDF only)
☑ **File size limits** (10 MB max)
☑ **CloudFront signing** for additional CDN security (Phase 5)

---

## Future Enhancements (Phase 5)

- ✅ Socket.io for real-time chat & read receipts
- ✅ Video call integration between user & admin
- ✅ Automated proof verification (AI/ML image analysis)
- ✅ Admin rating system based on trades
- ✅ Automated dispute resolution system
- ✅ Transaction insurance for protection
- ✅ Mobile app native file uploads

---

## Troubleshooting

**Q: Upload fails with 403 Forbidden**
A: Check S3 bucket policy allows public PUTs via presigned URLs

**Q: Chat messages not appearing**
A: Verify `requestId` is valid and user has authorization

**Q: S3 file not accessible from browser**
A: Ensure CloudFront or S3 bucket has public read policy

**Q: Admin profile not showing**
A: Create AdminProfile record first via `PATCH /api/admins/me/profile`

---

This architecture enables a **transparent, trust-based P2P remittance marketplace** while maintaining full audit trails and admin oversight.
