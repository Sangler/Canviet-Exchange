const router = require('express').Router();
const Request = require('../models/Requests');
const authMiddleware = require('../middleware/auth');
const logger = require('../utils/logger');

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
// Query params: userId, status, limit, skip
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { userId, status, limit = 50, skip = 0 } = req.query;

    // Build query filter
    const filter = {};
    
    // If userId is provided, filter by userId
    if (userId) {
      filter.userId = userId;
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

    logger.info(`[Requests] Retrieved ${requests.length} requests for user ${userId || 'all'}`);

    return res.json({
      ok: true,
      requests,
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
      currencyFrom,
      currencyTo,
      transferFee,
      sendingMethod,
      recipientBank,
      termAndServiceAccepted
    } = req.body;

    // Validate required fields
    if (!userId || !userEmail || !amountSent || !amountReceived || !sendingMethod || !recipientBank || !termAndServiceAccepted) {
      return res.status(400).json({
        ok: false,
        message: 'Missing required fields'
      });
    }

    // Create new request
    const newRequest = new Request({
      userId,
      userEmail,
      userPhone,
      amountSent,
      amountReceived,
      currencyFrom: currencyFrom || 'CAD',
      currencyTo: currencyTo || 'VND',
      transferFee: transferFee || 0,
      sendingMethod,
      recipientBank,
      termAndServiceAccepted,
      status: 'pending'
    });

    await newRequest.save();

    logger.info(`[Requests] Created new transfer request ${newRequest._id} for user ${userId}`);

    return res.status(201).json({
      ok: true,
      message: 'Transfer request submitted successfully',
      request: newRequest
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
