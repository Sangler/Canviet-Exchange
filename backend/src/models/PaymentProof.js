const mongoose = require('mongoose');

const PaymentProofSchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Request',
      required: true,
      unique: false, // Allow multiple proofs per request
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    
    // S3 file info
    s3Key: {
      type: String,
      required: true,
      unique: true // Prevent duplicate uploads
    },
    s3Url: {
      type: String,
      required: true // Full CDN URL for easy client access
    },
    s3Bucket: {
      type: String,
      default: () => process.env.AWS_S3_BUCKET || 'canviet-exchange-uploads'
    },
    
    // File metadata
    fileName: String,
    fileSize: Number, // bytes
    mimeType: {
      type: String,
      enum: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
      required: true
    },
    
    // Proof metadata
    proofType: {
      type: String,
      enum: ['bank_transfer', 'e_transfer', 'card_payment', 'crypto_receipt', 'other'],
      required: true
    },
    description: {
      type: String,
      maxlength: 500,
      trim: true
    },
    
    // Verification status
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending'
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    verificationNotes: {
      type: String,
      maxlength: 1000
    },
    verifiedAt: Date,
    
    // Audit trail
    uploadedAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  { timestamps: true }
);

// Index for retrieving all proofs for a request
PaymentProofSchema.index({ requestId: 1, uploadedAt: -1 });

module.exports = mongoose.model('PaymentProof', PaymentProofSchema);
