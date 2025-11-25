const router = require('express').Router();
const Request = require('../models/Requests');
const authMiddleware = require('../middleware/auth');
const logger = require('../utils/logger');
const crypto = require('crypto');

// Optional auth middleware - doesn't reject if no token
const optionalAuth = (req, res, next) => {
  try {
    const auth = req.headers['authorization'];
    const [scheme, token] = auth.split(' ');
    if (scheme && scheme.toLowerCase() === 'bearer' && token) {
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET;
      const decoded = jwt.verify(token, JWT_SECRET);
      req.auth = decoded;
    }
  } catch (err) {
    // Token invalid or expired, log-out!
    logger.warn('[Auth] Invalid or expired token, user should be log-out!');
  }
  return next();
};

// GET /api/requests - Get user's transfer history
// Query params: status, limit, skip
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { status, limit = 50, skip = 0 } = req.query;

    // Build query filter
    const filter = {};
    
    // If authenticated, filter by the authenticated user's ID
    const authenticatedUserId = req.auth?.sub || req.auth?.id;
    if (authenticatedUserId) {
      filter.userId = authenticatedUserId;
    }
    
    // If status is provided, filter by status
    if (status) {
      filter.status = status;
    }

    // Get total count for pagination
    const total = await Request.countDocuments(filter);

    // Fetch requests with pagination, sorted by most recent first
    const requests = await Request.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .select('-sendingMethod.cardNumber -sendingMethod.cardName') // Exclude sensitive card data
      .lean();

    // Compute receiptHash for each request (if referenceID present) so clients don't need to compute it
    const requestsWithHash = requests.map(r => {
      if (r.referenceID) {
        try {
          r.receiptHash = crypto.createHash('sha256').update(String(r.referenceID)).digest('hex').substring(0, 24);
        } catch (err) {
          // fallback - don't block response
          r.receiptHash = null;
        }
      } else {
        r.receiptHash = null;
      }
      return r;
    });
    logger.info(`[Requests] Retrieved ${requests.length} requests for user ${authenticatedUserId || 'all'}`);

    return res.json({
      ok: true,
      requests: requestsWithHash,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: parseInt(skip) + requests.length < total
      }
    });

  } catch (err) {
    logger.error('[Requests] Error fetching requests:', err.message);
    return res.status(500).json({
      ok: false,
      message: 'Failed to retrieve transfer history',
      error: err.message
    });
  }
});

// GET /api/requests/receipt/:hash - Get request by receipt hash
// IMPORTANT: This route MUST be before /:id route to avoid conflict
router.get('/receipt/:hash', optionalAuth, async (req, res) => {
  try {
    const { hash } = req.params;

    logger.info(`[Requests] Looking for receipt with hash: ${hash}`);

    // Find all requests and check which one matches the hash
    const requests = await Request.find().select('-sendingMethod.cardNumber -sendingMethod.cardName').lean();
    
    logger.info(`[Requests] Found ${requests.length} total requests in database`);
    
    let matchedRequest = null;
    for (const request of requests) {
      if (!request.referenceID) {
        logger.warn(`[Requests] Request ${request._id} has no referenceID, skipping...`);
        continue;
      }
      
      const computedHash = crypto.createHash('sha256')
        .update(request.referenceID)
        .digest('hex')
        .substring(0, 24);
      
      
      if (computedHash === hash) {
        matchedRequest = request;
        logger.info(`[Requests] Found matching request!`);
        break;
      }
    }

    if (!matchedRequest) {
      logger.warn(`[Requests] Receipt not found for hash: ${hash}`);
      return res.status(404).json({
        ok: false,
        message: 'Receipt not found'
      });
    }

    logger.info(`[Requests] Retrieved receipt for reference ${matchedRequest.referenceID}`);

    return res.json({
      ok: true,
      request: matchedRequest
    });

  } catch (err) {
    logger.error('[Requests] Error fetching receipt:', err);
    logger.error('[Requests] Error stack:', err.stack);
    return res.status(500).json({
      ok: false,
      message: 'Failed to retrieve receipt',
      error: err.message
    });
  }
});

// GET /api/requests/:id - Get specific request by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const request = await Request.findById(id)
      .select('-sendingMethod.cardNumber -sendingMethod.cardName')
      .lean();

    if (!request) {
      return res.status(404).json({
        ok: false,
        message: 'Transfer request not found'
      });
    }

    logger.info(`[Requests] Retrieved request ${id}`);

    // Add receiptHash if possible
    if (request && request.referenceID) {
      try {
        request.receiptHash = crypto.createHash('sha256').update(String(request.referenceID)).digest('hex').substring(0, 24);
      } catch (err) {
        request.receiptHash = null;
      }
    }

    return res.json({
      ok: true,
      request
    });

  } catch (err) {
    logger.error('[Requests] Error fetching request:', err.message);
    return res.status(500).json({
      ok: false,
      message: 'Failed to retrieve transfer request',
      error: err.message
    });
  }
});

// POST /api/requests - Create new transfer request
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      userId,
      userEmail,
      userPhone,
      amountSent,
      amountReceived,
      exchangeRate,
      currencyFrom,
      currencyTo,
      transferFee,
      sendingMethod,
      recipientBank,
      termAndServiceAccepted
    } = req.body;


    // Generate unique reference number (e.g., CVE20251109AB12CD34)
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14); // YYYYMMDDHHmmss
    const randomString = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 random chars
    const referenceNumber = `CVE${timestamp}${randomString}`;
    
    // Create SHA256 hash of reference number for receipt URL (24 characters)
    const receiptHash = crypto.createHash('sha256')
      .update(referenceNumber)
      .digest('hex')
      .substring(0, 24);

    // Create new request
    // Normalize sendingMethod.type to ensure consistent storage
    let normalizedSendingMethod = sendingMethod || {};
    try {
      const stype = (sendingMethod && sendingMethod.type) ? String(sendingMethod.type).trim() : '';
      const lower = stype.toLowerCase();
      // Treat common variants as EFT and store canonical 'EFT'
      if (lower === 'eft' || lower === 'e-transfer' || lower === 'etransfer' || lower === 'e_transfer') {
        normalizedSendingMethod = { ...sendingMethod, type: 'EFT' };
      } else {
        // Preserve original casing/value if it's already valid
        normalizedSendingMethod = { ...sendingMethod };
      }
    } catch (normErr) {
      normalizedSendingMethod = sendingMethod || {};
    }

    const newRequest = new Request({
      userId,
      userEmail,
      userPhone,
      referenceID: referenceNumber,
      amountSent,
      amountReceived,
      exchangeRate,
      currencyFrom: currencyFrom || 'CAD',
      currencyTo: currencyTo || 'VND',
      transferFee: transferFee || 0,
      sendingMethod: normalizedSendingMethod,
      recipientBank,
      termAndServiceAccepted,
      status: 'pending'
    });

    await newRequest.save();

    logger.info(`[Requests] Created new transfer request ${newRequest._id} with reference ${referenceNumber}`);

    return res.status(201).json({
      ok: true,
      message: 'Transfer request submitted successfully',
      request: newRequest,
      receiptHash: receiptHash // Hash for receipt URL
    });

  } catch (err) {
    logger.error('[Requests] Error creating request:', err.message);
    return res.status(500).json({
      ok: false,
      message: 'Failed to create transfer request',
      error: err.message
    });
  }
});

// PATCH /api/requests/:id/status - Update request status (admin only)
router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['pending', 'approved', 'reject', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        ok: false,
        message: 'Invalid requests!'
      });
    }

    const updatedRequest = await Request.findByIdAndUpdate(
      id,
      { 
        status,
        ...(status === 'completed' ? { completedAt: new Date() } : {})
      },
      { new: true }
    );

    if (!updatedRequest) {
      return res.status(404).json({
        ok: false,
        message: 'Transfer request not found'
      });
    }

    logger.info(`[Requests] Updated request ${id} status to ${status}`);

    return res.json({
      ok: true,
      message: 'Request status updated successfully',
      request: updatedRequest
    });

  } catch (err) {
    logger.error('[Requests] Error updating request status:', err.message);
    return res.status(500).json({
      ok: false,
      message: 'Failed to update request status',
      error: err.message
    });
  }
});

module.exports = router;
