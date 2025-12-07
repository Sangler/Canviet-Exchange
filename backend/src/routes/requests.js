const router = require('express').Router();
const Request = require('../models/Requests');
const authMiddleware = require('../middleware/auth');
const logger = require('../utils/logger');
const crypto = require('crypto');
const Stripe = require('stripe');
const emailSvc = require('../services/email');

// Small helper to escape HTML when injecting user-provided strings into templates
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Format a number with commas as thousands separators. Accepts number or numeric string.
function formatNumber(value) {
  if (value === null || typeof value === 'undefined' || value === '') return '';
  // Remove existing commas, then parse
  const cleaned = String(value).replace(/,/g, '');
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return String(value);
  return n.toLocaleString('en-US');
}

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

// GET /api/requests - Get user's transfer history (or all requests for admin)
// Query params: status, limit, skip
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { status, limit = 50, skip = 0 } = req.query;

    // Build query filter
    const filter = {};
    
    // If authenticated, filter by the authenticated user's ID (unless admin)
    const authenticatedUserId = req.auth?.sub || req.auth?.id;
    const userRole = req.auth?.role;
    
    // Admin can see all requests; regular users only see their own
    if (authenticatedUserId && userRole !== 'admin') {
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
    logger.info(`[Requests] Retrieved ${requests.length} requests for ${userRole === 'admin' ? 'admin (all users)' : `user ${authenticatedUserId || 'guest'}`}`);

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
      , paymentIntentId
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

    // If a paymentIntentId is provided (card payments), verify the PaymentIntent with Stripe
    let verifiedPaymentIntent = null;
    if (paymentIntentId) {
      try {
        if (!process.env.STRIPE_SECRET_KEY) {
          logger.error('[Requests] STRIPE_SECRET_KEY is not configured on server');
          return res.status(500).json({ ok: false, message: 'Payment configuration error' });
        }
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (!intent) {
          return res.status(400).json({ ok: false, message: 'Invalid payment intent' });
        }

        // Require succeeded status
        if (intent.status !== 'succeeded') {
          return res.status(400).json({ ok: false, message: 'Payment not completed', paymentStatus: intent.status });
        }

        // If amounts/currencies were provided, validate them to avoid mismatches
        try {
          if (typeof amountSent !== 'undefined' && currencyFrom) {
            // Compute expected total cents: principal + transfer fee + tax on fee
            const TRANSFER_FEE_CAD = 150; // must match payments.js
            const TAX_RATE = 0.13;
            const principalCents = Math.round(Number(amountSent) * 100);
            const feeCents = Math.round(TRANSFER_FEE_CAD * 100);
            const taxCents = Math.round(feeCents * TAX_RATE);
            const expectedCents = principalCents + feeCents + taxCents;

            if (Number.isFinite(expectedCents) && intent.amount !== expectedCents) {
              logger.warn('[Requests] PaymentIntent amount mismatch', { intentAmount: intent.amount, expectedCents });
              return res.status(400).json({ ok: false, message: 'Payment amount mismatch' });
            }
            if (intent.currency && String(intent.currency).toLowerCase() !== String(currencyFrom).toLowerCase()) {
              logger.warn('[Requests] PaymentIntent currency mismatch', { intentCurrency: intent.currency, currencyFrom });
              return res.status(400).json({ ok: false, message: 'Payment currency mismatch' });
            }
          }
        } catch (vErr) {
          logger.warn('[Requests] Error validating PaymentIntent amounts', vErr.message);
        }

        verifiedPaymentIntent = intent;
      } catch (stripeErr) {
        logger.error('[Requests] Error retrieving PaymentIntent:', stripeErr.message || stripeErr);
        return res.status(400).json({ ok: false, message: 'Failed to verify payment' });
      }
    }

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
      status: 'pending',
      // If verifiedPaymentIntent exists, store its id and mark succeeded
      paymentIntentId: verifiedPaymentIntent ? String(verifiedPaymentIntent.id) : undefined,
      paymentStatus: verifiedPaymentIntent ? 'succeeded' : undefined
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

    // If status changed to completed, notify the user by email
    if (status === 'completed') {
      try {
        // Fetch user details if possible for name
        let userFirst = '';
        let userLast = '';
        try {
          const User = require('../models/User');
          const u = await User.findById(updatedRequest.userId).select('firstName lastName email');
          if (u) {
            userFirst = u.firstName || '';
            userLast = u.lastName || '';
          }
        } catch (uErr) {
          logger.warn('[Requests] Could not load user for email notification', uErr.message);
        }

        const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
        
        // Format completed time as readable date/time
        const completedDate = updatedRequest.completedAt || new Date();
        const completedTime = completedDate.toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short'
        });

        const amountSent = updatedRequest.amountSent != null ? String(updatedRequest.amountSent) : '';
        const amountReceived = updatedRequest.amountReceived != null ? String(updatedRequest.amountReceived) : '';
        const paymentMethod = (updatedRequest.sendingMethod && updatedRequest.sendingMethod.type) ? updatedRequest.sendingMethod.type : (updatedRequest.sendingMethod ? JSON.stringify(updatedRequest.sendingMethod) : '');

        const userFullName = `${(userFirst || '').trim()} ${(userLast || '').trim()}`.trim();

        const ref = updatedRequest.referenceID ? `${updatedRequest.referenceID}` : '';

        // Compute receipt hash for a direct receipt link
        let receiptHash = '';
        try {
          if (updatedRequest.referenceID) {
            receiptHash = crypto.createHash('sha256').update(String(updatedRequest.referenceID)).digest('hex').substring(0, 24);
          }
        } catch (rhErr) {
          logger.warn('[Requests] Could not compute receipt hash', rhErr && rhErr.message);
        }
        const receiptUrl = receiptHash && frontendUrl ? `${frontendUrl}/transfers/receipt/${receiptHash}` : '';

        const subject = 'Your Transaction Status: The money sent to Vietnam is now Completed!';

        const html = `
          <div style="font-family: Arial, sans-serif; color: #1f2937; line-height:1.4;">
            <h2 style="font-size:20px;">Hello ${escapeHtml(userFullName || '')}</h2>
            <p>We have just delivered your money to the recipient safely. Your transfer is now <strong>completed</strong>. If your money is not delivered, please let us know <a href="${frontendUrl}/general/help">here</a>.</p>

            <h3>Payment details</h3>
            <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:12px;">
              <tr><td style="padding:4px 8px;"><strong>Reference:</strong></td><td style="padding:4px 8px;">${escapeHtml(ref)}</td></tr>
              <tr><td style="padding:4px 8px;"><strong>Completed time:</strong></td><td style="padding:4px 8px;">${escapeHtml(completedTime)}</td></tr>
              <tr><td style="padding:4px 8px;"><strong>Amount Sent:</strong></td><td style="padding:4px 8px;">${escapeHtml(amountSent)} CAD</td></tr>
              <tr><td style="padding:4px 8px;"><strong>Amount Received:</strong></td><td style="padding:4px 8px;">${escapeHtml(formatNumber(amountReceived))} VND</td></tr>
              <tr><td style="padding:4px 8px;"><strong>Payment method:</strong></td><td style="padding:4px 8px;">${escapeHtml(paymentMethod)}</td></tr>
              <tr><td style="padding:4px 8px;"><strong>Status:</strong></td><td style="padding:4px 8px;">Completed</td></tr>
            </table>

            ${receiptUrl ? `<div style="text-align:center; margin:12px 0;"><a href="${receiptUrl}" style="background:#1e3a8a;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block;">View / Download Receipt</a></div>` : ''}

            <hr style="border:none;border-top:1px solid #e5e7eb;margin:12px 0;" />

            <h3>Thông báo</h3>
            <p>Xin chào ${escapeHtml(userFullName || '')},</p>
            <p>Chúng tôi vừa chuyển tiền đến người nhận an toàn. Giao dịch của bạn đã <strong>hoàn thành</strong>. Nếu tiền chưa được nhận, vui lòng liên hệ với chúng tôi <a href="${frontendUrl}/general/help">tại đây</a>.</p>

            <h4>Chi tiết thanh toán</h4>
            <table cellpadding="0" cellspacing="0" border="0">
              <tr><td style="padding:4px 8px;"><strong>Thời gian hoàn thành:</strong></td><td style="padding:4px 8px;">${escapeHtml(completedTime)}</td></tr>
              <tr><td style="padding:4px 8px;"><strong>Số tiền gửi:</strong></td><td style="padding:4px 8px;">${escapeHtml(amountSent)} CAD</td></tr>
              <tr><td style="padding:4px 8px;"><strong>Số tiền nhận:</strong></td><td style="padding:4px 8px;">${escapeHtml(formatNumber(amountReceived))} VND</td></tr>
              <tr><td style="padding:4px 8px;"><strong>Phương thức thanh toán:</strong></td><td style="padding:4px 8px;">${escapeHtml(paymentMethod)}</td></tr>
              <tr><td style="padding:4px 8px;"><strong>Trạng thái:</strong></td><td style="padding:4px 8px;">Hoàn thành</td></tr>
            </table>

            <div style="margin-top:18px; font-size:12px; color:#6b7280;">
              <p>CanViet Exchange<br/>1234 Demo Street, Toronto, ON, Canada<br/>Phone: +1 416-555-0100<br/><a href="${frontendUrl}">${frontendUrl}</a></p>
            </div>
          </div>
        `;

        const text = `Hello ${userFullName}\n\nWe have just delivered your money to the recipient safely. Your transfer is now completed. If your money is not delivered, please let us know: ${frontendUrl}/general/help\n\nPayment details:\nCompleted time: ${completedTime}\nAmount Sent: ${amountSent} CAD\nAmount Received: ${formatNumber(amountReceived)} VND\nPayment method: ${paymentMethod}\nStatus: Completed\n\n---\nVietnamese:\nXin chào ${userFullName},\nChúng tôi vừa chuyển tiền đến người nhận an toàn. Giao dịch của bạn đã hoàn thành. Nếu tiền chưa được nhận, vui lòng liên hệ với chúng tôi tại: ${frontendUrl}/general/help`;

        // Send email from services inbox to the user (no CC by default)
        try {
          await emailSvc.sendMail({
            from: process.env.EMAIL_USER || process.env.CANVIETEXCHANGE_EMAIL_USER || undefined,
            to: updatedRequest.userEmail,
            subject,
            text,
            html
          });
        } catch (mailErr) {
          logger.error('[Requests] Failed to send completion email:', mailErr && mailErr.message);
        }
      } catch (notifyErr) {
        logger.error('[Requests] Error preparing completion notification:', notifyErr && notifyErr.message);
      }
    }

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
