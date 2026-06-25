const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');
const PaymentProof = require('../models/PaymentProof');
const Request = require('../models/Requests');
const s3Service = require('../services/s3');
const multer = require('multer');

// In-memory storage for multer (small files only)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and PDF allowed.'));
    }
  }
});

/**
 * POST /api/payment-proofs/:requestId/upload-url
 * Get a presigned URL for direct browser upload to S3
 * Body: { fileName: string, fileType: 'image/jpeg' | 'image/png' | etc }
 */
router.post('/:requestId/upload-url', authMiddleware, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { fileName, fileType } = req.body;

    if (!fileName || !fileType) {
      return res.status(400).json({ ok: false, message: 'fileName and fileType required' });
    }

    // Verify user owns this request
    const request = await Request.findById(requestId).select('userId');
    if (!request) {
      return res.status(404).json({ ok: false, message: 'Request not found' });
    }

    const userRole = req.auth?.role;
    const requestOwnerId = String(request.userId);
    const currentUserId = String(req.user?.id || req.auth?.userId);

    if (userRole !== 'admin' && requestOwnerId !== currentUserId) {
      return res.status(403).json({ ok: false, message: 'Unauthorized' });
    }

    // Generate presigned URL
    const uploadInfo = await s3Service.getUploadSignedUrl(fileName, fileType, requestId, currentUserId);

    return res.json({
      ok: true,
      uploadUrl: uploadInfo.uploadUrl,
      s3Key: uploadInfo.s3Key,
      publicUrl: uploadInfo.publicUrl,
      expiresIn: uploadInfo.expires
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

/**
 * POST /api/payment-proofs/:requestId
 * Register a payment proof in the database (after S3 upload)
 * Body: { s3Key: string, s3Url: string, fileName: string, fileSize: number, mimeType: string, 
 *         proofType: 'bank_transfer'|'e_transfer'|'card_payment'|'crypto_receipt'|'other',
 *         description?: string }
 */
router.post('/:requestId', authMiddleware, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { s3Key, s3Url, fileName, fileSize, mimeType, proofType, description } = req.body;

    if (!s3Key || !s3Url || !proofType) {
      return res.status(400).json({ ok: false, message: 'Missing required fields' });
    }

    // Verify request exists
    const request = await Request.findById(requestId).select('userId');
    if (!request) {
      return res.status(404).json({ ok: false, message: 'Request not found' });
    }

    const userRole = req.auth?.role;
    const requestOwnerId = String(request.userId);
    const currentUserId = String(req.user?.id || req.auth?.userId);

    if (userRole !== 'admin' && requestOwnerId !== currentUserId) {
      return res.status(403).json({ ok: false, message: 'Unauthorized' });
    }

    // Check for duplicate proofs (same s3Key)
    const existingProof = await PaymentProof.findOne({ s3Key });
    if (existingProof) {
      return res.status(400).json({ ok: false, message: 'Proof already registered' });
    }

    // Create payment proof record
    const proof = new PaymentProof({
      requestId,
      userId: currentUserId,
      s3Key,
      s3Url,
      fileName,
      fileSize,
      mimeType,
      proofType,
      description,
      verificationStatus: 'pending'
    });

    await proof.save();

    return res.status(201).json({
      ok: true,
      proof
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

/**
 * GET /api/payment-proofs/:requestId - Get all proofs for a request
 */
router.get('/:requestId', authMiddleware, async (req, res) => {
  try {
    const { requestId } = req.params;

    // Verify access
    const request = await Request.findById(requestId).select('userId');
    if (!request) {
      return res.status(404).json({ ok: false, message: 'Request not found' });
    }

    const userRole = req.auth?.role;
    const requestOwnerId = String(request.userId);
    const currentUserId = String(req.user?.id || req.auth?.userId);

    if (userRole !== 'admin' && requestOwnerId !== currentUserId) {
      return res.status(403).json({ ok: false, message: 'Unauthorized' });
    }

    const proofs = await PaymentProof.find({ requestId })
      .sort({ uploadedAt: -1 })
      .select('-__v')
      .lean();

    return res.json({
      ok: true,
      proofs
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

/**
 * PATCH /api/payment-proofs/:proofId/verify - Verify/reject a proof (admin only)
 * Body: { verificationStatus: 'verified' | 'rejected', notes?: string }
 */
router.patch('/:proofId/verify', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { proofId } = req.params;
    const { verificationStatus, notes } = req.body;

    if (!['verified', 'rejected'].includes(verificationStatus)) {
      return res.status(400).json({ ok: false, message: 'Invalid status' });
    }

    const proof = await PaymentProof.findByIdAndUpdate(
      proofId,
      {
        verificationStatus,
        verifiedBy: req.user?.id || req.auth?.userId,
        verificationNotes: notes || '',
        verifiedAt: new Date()
      },
      { new: true }
    );

    if (!proof) {
      return res.status(404).json({ ok: false, message: 'Proof not found' });
    }

    return res.json({ ok: true, proof });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

/**
 * DELETE /api/payment-proofs/:proofId - Delete a proof and remove from S3 (admin only)
 */
router.delete('/:proofId', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { proofId } = req.params;

    const proof = await PaymentProof.findById(proofId);
    if (!proof) {
      return res.status(404).json({ ok: false, message: 'Proof not found' });
    }

    // Delete from S3
    try {
      await s3Service.deleteFromS3(proof.s3Key);
    } catch (s3Err) {
      // Log but don't block deletion
      console.error('Failed to delete from S3:', s3Err.message);
    }

    // Delete from DB
    await PaymentProof.deleteOne({ _id: proofId });

    return res.json({ ok: true, message: 'Proof deleted' });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
