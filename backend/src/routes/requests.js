const router = require('express').Router();
const Request = require('../models/Requests');
const authMiddleware = require('../middleware/auth');
const { transferLimiter } = require('../middleware/rateLimit');
const { requireAdmin } = require('../middleware/roles');
const crypto = require('crypto');
const Stripe = require('stripe');
const emailSvc = require('../services/email');
const fs = require('fs');
const path = require('path');

// --- FX helper (copied logic from routes/fx.js to keep local calculation) ---
const https = require('https');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (r) => {
      if (r.statusCode && r.statusCode >= 400) {
        return reject(new Error('Status ' + r.statusCode));
      }
      let data = '';
      r.on('data', (chunk) => (data += chunk));
      r.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Fetch USDC/CAD from Coinbase using native fetch (Node 18+)
async function fetchUsdcCadFromCoinbase() {
  const url = 'https://api.coinbase.com/v2/prices/USDC-CAD/spot';
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return Number(data.data.amount);
  } catch (err) {
    return null;
  }
}

// Fetch USDC/USD peg from Coinbase to account for market fluctuation
async function fetchUsdcUsdFromCoinbase() {
  const url = 'https://api.coinbase.com/v2/prices/USDC-USD/spot';
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return Number(data.data.amount);
  } catch (err) {
    return null;
  }
}

// Fetch USD/VND from exchange rate APIs
async function fetchUsdVnd() {
  const apiKey = process.env.EXCHANGE_API_KEY;
  const candidates = [];
  if (apiKey) {
    candidates.push({ url: `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`, source: 'exchangerate-api.com', type: 'conversion_rates' });
  }
  candidates.push({ url: 'https://open.er-api.com/v6/latest/USD', source: 'open.er-api.com', type: 'rates' });

  for (const c of candidates) {
    try {
      const j = await fetchJson(c.url);
      if (c.type === 'conversion_rates' && j?.conversion_rates?.VND) return { rate: Number(j.conversion_rates.VND), fetchedAt: j.time_last_update_utc, source: c.url };
      if (c.type === 'rates' && j?.rates?.VND) return { rate: Number(j.rates.VND), fetchedAt: j.time_last_update_utc, source: c.url };
    } catch (e) {
      continue;
    }
  }
  return null;
}

async function computeCadVndRates() {
  const cadPerUsdc = await fetchUsdcCadFromCoinbase();
  const usdcUsdPeg = await fetchUsdcUsdFromCoinbase();
  const usdVndData = await fetchUsdVnd();
  if (!cadPerUsdc || !usdcUsdPeg || !usdVndData) return null;
  const cadPerUsd = cadPerUsdc * usdcUsdPeg;
  const cadToVnd = usdVndData.rate / cadPerUsd;
  const addMargin = Number(process.env.ADD_MARGIN_RATE || 50);
  const withMargin = cadToVnd + addMargin;
  return {
    cadPerUsdc,
    usdcUsdPeg,
    cadPerUsd,
    usdVnd: usdVndData.rate,
    baseRate: cadToVnd,
    margin: addMargin,
    rateWithMargin: Math.round(withMargin),
    fetchedAt: usdVndData.fetchedAt || new Date().toISOString()
  };
}
// --- end fx helper ---

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

// GET /api/requests - Get user's transfer history (or all requests for admin)
// Query params: status, limit, skip
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, limit = 50, skip = 0 } = req.query;

    // Build query filter
    const filter = {};
    
    // If authenticated, filter by the authenticated user's ID (unless admin)
    const authenticatedUserId = req.user?.id;
    const userRole = req.auth?.role;
    
    // Admin can see all requests; regular users only see their own
    if (userRole !== 'admin') filter.userId = authenticatedUserId;
    
    // If status is provided, validate and filter by status
    const VALID_STATUSES = ['pending', 'approved', 'reject', 'completed'];
    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ ok: false, message: 'Invalid status value' });
      }
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
    return res.status(500).json({
      ok: false,
      message: 'Failed to retrieve transfer history',
      error: err.message
    });
  }
});

// GET /api/requests/receipt/:hash - Get request by receipt hash
// IMPORTANT: This route MUST be before /:id route to avoid conflict
router.get('/receipt/:hash', async (req, res) => {
  try {
    const { hash } = req.params;

    // Optional auth: accept HttpOnly cookie `access_token` first, fall back to Authorization header.
    // This allows the public receipt page to show full details to owners/admins when the
    // client stored the JWT in an HttpOnly cookie (cookie-parser is enabled in app.js).
    let viewer = null;
    try {
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET;
      // Prefer cookie-held token
      const cookieToken = req.cookies && req.cookies.access_token;
      if (cookieToken) {
        try {
          viewer = jwt.verify(cookieToken, JWT_SECRET);
        } catch (_) {
          viewer = null;
        }
      } else {
        const auth = req.headers['authorization'] || '';
        const [scheme, token] = auth.split(' ');
        if (scheme && scheme.toLowerCase() === 'bearer' && token) {
          try { viewer = jwt.verify(token, JWT_SECRET); } catch (_) { viewer = null; }
        }
      }
    } catch (e) {
      viewer = null;
    }

    const userRole = viewer?.role;
    const authenticatedUserId = viewer?.sub || viewer?.id || viewer?.userId;

    // For receipt lookup we allow searching the collection so that:
    // - Owners and admins receive full details.
    // - Any other viewer (authenticated non-owner or public guest) can lookup the receipt
    //   and will receive a redacted public view. This intentionally permits non-owner
    //   authenticated users to view the redacted version as requested.
    // IMPORTANT: scanning the full collection can be slow at scale. Recommended improvement:
    // add a `receiptHash` field to the `Request` model, populate it at creation, and add an index
    // so lookups can be performed with `findOne({ receiptHash: hash })` instead of scanning.
    const query = {};

    const requests = await Request.find(query).select('-sendingMethod.cardNumber -sendingMethod.cardName').lean();
    
    let matchedRequest = null;
    for (const request of requests) {
      if (!request.referenceID) {
        continue;
      }
      
      const computedHash = crypto.createHash('sha256')
        .update(request.referenceID)
        .digest('hex')
        .substring(0, 24);
      
      
      if (computedHash === hash) {
        matchedRequest = request;
        break;
      }
    }

    if (!matchedRequest) {
      return res.status(404).json({
        ok: false,
        message: 'Receipt not found'
      });
    }

    // Determine whether viewer can see full details: owner or admin
    const ownerId = matchedRequest.userId ? String(matchedRequest.userId) : '';
    const viewerIdStr = authenticatedUserId ? String(authenticatedUserId) : '';
    const isOwner = viewerIdStr && ownerId === viewerIdStr;
    const isAdmin = userRole === 'admin';

    if (isOwner || isAdmin) {
      return res.json({ ok: true, request: matchedRequest });
    }

    // Public view: redact sensitive fields per product policy
    const redacted = JSON.parse(JSON.stringify(matchedRequest));

    // Remove payment-related details
    delete redacted.paymentIntentId;
    delete redacted.paymentStatus;

    // Remove or mask sender bank details
    if (redacted.sendingMethod && redacted.sendingMethod.bankTransfer) {
      delete redacted.sendingMethod.bankTransfer.institutionNumber;
      delete redacted.sendingMethod.bankTransfer.transitNumber;
      delete redacted.sendingMethod.bankTransfer.accountNumber;
    }

    // Remove recipient account numbers but keep holder name
    if (redacted.recipientBank) {
      delete redacted.recipientBank.accountNumber;
      if (redacted.recipientBank.recipientPhone) delete redacted.recipientBank.recipientPhone;
    }

    // Remove phone numbers for both sender/user
    if (redacted.userPhone) delete redacted.userPhone;

    // Mask emails (show first and last character before @ with '***' in middle)
    function maskEmail(e) {
      if (!e || typeof e !== 'string') return '';
      const parts = e.split('@');
      if (parts.length < 2) return '';
      const local = parts[0];
      const domain = parts.slice(1).join('@');
      if (local.length <= 2) return `${local[0]}***@${domain}`;
      return `${local[0]}***${local[local.length-1]}@${domain}`;
    }

    if (redacted.userEmail) redacted.userEmail = maskEmail(redacted.userEmail);
    if (redacted.sendingMethod && redacted.sendingMethod.email) redacted.sendingMethod.email = maskEmail(redacted.sendingMethod.email);

    return res.json({ ok: true, request: redacted });

  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: 'Failed to retrieve receipt',
      error: err.message
    });
  }
});

// GET /api/requests/:id - Get specific request by ID
router.get('/:id', authMiddleware, async (req, res) => {
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

    // Enforce ownership for non-admin users
    const userRole = req.auth?.role;
    const authenticatedUserId = req.user?.id;
    const ownerId = request.userId ? String(request.userId) : '';
    if (userRole !== 'admin' && ownerId !== String(authenticatedUserId)) {
      // Return 404 to avoid leaking existence of other users' requests
      return res.status(404).json({ ok: false, message: 'Transfer request not found' });
    }

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
    return res.status(500).json({
      ok: false,
      message: 'Failed to retrieve transfer request',
      error: err.message
    });
  }
});

// POST /api/requests - Create new transfer request
router.post('/', authMiddleware, transferLimiter, async (req, res) => {
  try {
    const {
      userId: bodyUserId,
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
      termAndServiceAccepted,
      paymentIntentId,
      // New options: remove transfer fee or add +100 VND exchange rate
      removeFee = false,
      buffExchangeRate = false
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
              return res.status(400).json({ ok: false, message: 'Payment amount mismatch' });
            }
            if (intent.currency && String(intent.currency).toLowerCase() !== String(currencyFrom).toLowerCase()) {
              return res.status(400).json({ ok: false, message: 'Payment currency mismatch' });
            }
          }
        } catch (vErr) {
        }

        verifiedPaymentIntent = intent;
      } catch (stripeErr) {
        return res.status(400).json({ ok: false, message: 'Failed to verify payment' });
      }
    }

    // Use authenticated user id when available to prevent spoofing
    const userId = req.user?.id || bodyUserId;

    // Validate user points for requested perks (1 point each)
    try {
      const User = require('../models/User');
      const u = await User.findById(userId).select('points');
      const cost = (removeFee ? 1 : 0) + (buffExchangeRate ? 1 : 0);
      if (cost > 0) {
        const currentPoints = (u && typeof u.points === 'number') ? u.points : 0;
        if (currentPoints < cost) {
          return res.status(400).json({ ok: false, message: 'Insufficient points for selected options' });
        }
      }
    } catch (ptErr) {
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
      // User-selected perks paid by points
      removeFee: !!removeFee,
      buffExchangeRate: !!buffExchangeRate,
      sendingMethod: normalizedSendingMethod,
      recipientBank,
      termAndServiceAccepted,
      status: 'pending',
      // If verifiedPaymentIntent exists, store its id and mark succeeded
      paymentIntentId: verifiedPaymentIntent ? String(verifiedPaymentIntent.id) : undefined,
      paymentStatus: verifiedPaymentIntent ? 'succeeded' : undefined
    });

    await newRequest.save();

    // Build bookkeeper entry (best-effort, do not block request on failure)
    (async () => {
      try {
        const fx = await computeCadVndRates();
        const bookDir = path.join(__dirname, '..', '..', 'bookkeepers');
        await fs.promises.mkdir(bookDir, { recursive: true });
        const now = new Date();
        const filename = `${now.toISOString().replace(/[:.]/g, '-')}_bookkeeper.json`;
        const filePath = path.join(bookDir, filename);

        const entry = {
          timestamp: now.toISOString(),
          userId: userId || null,
          exchange: fx ? {
            rateAtTime: fx.rateWithMargin,
            cadPerUsdc: fx.cadPerUsdc,
            usdcUsdPeg: fx.usdcUsdPeg,
            cadPerUsd: fx.cadPerUsd,
            usdVnd: fx.usdVnd,
            baseRate: fx.baseRate,
            margin: fx.margin,
            fetchedAt: fx.fetchedAt
          } : null,
          amountSentCAD: amountSent,
          amountToVND: amountReceived,
          paymentMethod: normalizedSendingMethod || sendingMethod || null,
          requestId: newRequest._id ? String(newRequest._id) : undefined,
          referenceID: referenceNumber
        };

        await fs.promises.writeFile(filePath, JSON.stringify(entry, null, 2), 'utf8');
      } catch (bkErr) {
        // swallow errors - bookkeeper is best-effort
      }
    })();

    return res.status(201).json({
      ok: true,
      message: 'Transfer request submitted successfully',
      request: newRequest,
      receiptHash: receiptHash // Hash for receipt URL
    });

  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: 'Failed to create transfer request',
      error: err.message
    });
  }
});

// PATCH /api/requests/:id/status - Update request status (admin only)
router.patch('/:id/status', authMiddleware, requireAdmin, async (req, res) => {
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

    let updatedRequest = await Request.findByIdAndUpdate(
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

      // Apply perks to the request when approved: remove fee and/or buff exchange rate
      if (status === 'approved') {
        try {
          const updates = {};
          if (updatedRequest.removeFee) {
            updates.transferFee = 0;
          }
          if (updatedRequest.buffExchangeRate) {
            const currentRate = Number(updatedRequest.exchangeRate || 0);
            const newRate = currentRate + 100; // add 100 VND per CAD
            updates.exchangeRate = newRate;
            // Recompute amountReceived if amountSent present
            if (typeof updatedRequest.amountSent === 'number') {
              updates.amountReceived = Math.round(Number(updatedRequest.amountSent) * newRate);
            }
          }
          if (Object.keys(updates).length > 0) {
            const updated = await Request.findByIdAndUpdate(id, updates, { new: true });
            if (updated) {
              // replace reference for downstream usage
              updatedRequest = updated;
            }
          }
        } catch (perkErr) {
        }
      }
    // If status changed to approved, notify the admin/services inbox for follow-up
    if (status === 'approved') {
      try {
        const ref = updatedRequest.referenceID || '';
        const summary = ref ? `Request ${ref} approved` : `Request ${updatedRequest._id} approved`;
        // Send admin notification (best-effort)
        emailSvc.notifyNewPendingRequest({
          type: 'Request Approved',
          userId: String(updatedRequest.userId || ''),
          userEmail: updatedRequest.userEmail || '',
          summary,
          payload: updatedRequest
        }).catch(err => {});
      } catch (notifyErr) {
      }
    }

    // If status changed to approved, also send brief notification to the user (if they accept transfer emails)
    if (status === 'approved') {
      try {
        let userReceiveEmails = true;
        let userEmailAddr = updatedRequest.userEmail || '';
        let userFull = '';
        try {
          const User = require('../models/User');
          const u = await User.findById(updatedRequest.userId).select('firstName lastName email receiveTransferEmails');
          if (u) {
            if (typeof u.receiveTransferEmails === 'boolean') userReceiveEmails = u.receiveTransferEmails;
            if (u.email) userEmailAddr = u.email;
            userFull = `${u.firstName || ''} ${u.lastName || ''}`.trim();
          }
        } catch (uErr) {
        }

        if (!userReceiveEmails) {
        } else if (userEmailAddr) {
          const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
          const ref = updatedRequest.referenceID ? `${updatedRequest.referenceID}` : '';
          const subject = ref ? `[Canviet Exchange] Transfer ${ref} — Funds received` : 'We have received your funds';

          // Build a receipt URL when possible (use receipt hash derived from referenceID)
          let receiptHash = '';
          try {
            if (updatedRequest.referenceID) {
              receiptHash = crypto.createHash('sha256').update(String(updatedRequest.referenceID)).digest('hex').substring(0, 24);
            }
          } catch (rhErr) {
          }
          const receiptUrl = receiptHash ? `${frontendUrl}/transfers/receipt/${receiptHash}` : `${frontendUrl}/transfers`;

          const text = `Hello ${userFull}\n\nWe have received your funds and will proceed to send them to the recipient. View transfer: ${receiptUrl}\n\n---\nVietnamese:\nXin chào ${userFull},\nChúng tôi đã nhận được tiền và sẽ tiến hành gửi đến người nhận. Xem giao dịch: ${receiptUrl}\n\nTo opt out of transfer completion emails, go to ${frontendUrl}/settings and turn off \"Receive transfer emails\" then save changes.`;

          const html = `
          <div style="font-family: Arial, sans-serif; color: #1f2937; line-height:1.5;">
            <div style="text-align:center; padding: 20px 0;">
              <img src="${emailSvc.LOGO_DATA_URI}" alt="CanViet Exchange" style="height: 60px;" />
            </div>
            <h2 style="font-size:18px; margin:0 0 12px;">Hi ${escapeHtml(userFull || '')},</h2>
            <p style="font-size:16px; margin:8px 0;">We have received your funds and will proceed to send them to the recipient.</p>
            <div style="text-align:center; margin:18px 0;">
              <a href="${receiptUrl}" style="background:#1e3a8a;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block;">View transfer</a>
            </div>
            <p style="font-size:14px; color:#6b7280; margin:8px 0;">Reference: <strong>${escapeHtml(ref)}</strong></p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />

            <!-- Vietnamese translation -->
            <h3 style="font-size:16px;margin:8px 0;">Xin chào ${escapeHtml(userFull || '')},</h3>
            <p style="font-size:14px; color:#1f2937;">Chúng tôi đã nhận được tiền và đang tiến hành gửi đến người nhận. Bạn có thể xem giao dịch tại <a href="${receiptUrl}">Xem giao dịch</a>.</p>

            <p style="margin:12px 0;font-size:12px;color:#6b7280;">Để không nhận email hoàn tất chuyển khoản, hãy vào <a href="${frontendUrl}/settings">${frontendUrl}/settings</a>, tắt "Nhận email chuyển khoản", sau đó lưu thay đổi.</p>
            <div style="margin-top:18px; font-size:12px; color:#6b7280;">
              <p>CanViet Exchange<br/>618 Edward Street N, Thunder Bay, ON, Canada<br/>Phone: +1 416-555-0100<br/><a href="${frontendUrl}">${frontendUrl}</a></p>
            </div>
            </div>
          `;

          try {
            await emailSvc.sendMail({
              from: process.env.EMAIL_USER || process.env.CANVIETEXCHANGE_EMAIL_USER || undefined,
              to: userEmailAddr,
              bcc: process.env.TRUSTPILOT_INVITE_EMAIL || 'canvietexchange.com+61a7cdf283@invite.trustpilot.com',
              subject,
              text,
              html
            });
          } catch (mailErr) {
          }
        }
      } catch (err) {
      }
    }
    // If status changed to completed, notify the user by email
    if (status === 'completed') {
      try {
        // Fetch user details if possible for name and email preferences
        let userFirst = '';
        let userLast = '';
        let userReceiveEmails = true; // default true
        let userEmailAddr = updatedRequest.userEmail || '';
        try {
          const User = require('../models/User');
          const u = await User.findById(updatedRequest.userId).select('firstName lastName email receiveTransferEmails');
          if (u) {
            userFirst = u.firstName || '';
            userLast = u.lastName || '';
            if (typeof u.receiveTransferEmails === 'boolean') userReceiveEmails = u.receiveTransferEmails;
            if (u.email) userEmailAddr = u.email;
          }
        } catch (uErr) {
        }

        const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
        const completedTime = (updatedRequest.completedAt || new Date()).toISOString();

        const amountSent = updatedRequest.amountSent != null ? String(updatedRequest.amountSent) : '';
        const amountReceived = updatedRequest.amountReceived != null ? String(updatedRequest.amountReceived) : '';
        const paymentMethod = (updatedRequest.sendingMethod && updatedRequest.sendingMethod.type) ? updatedRequest.sendingMethod.type : (updatedRequest.sendingMethod ? JSON.stringify(updatedRequest.sendingMethod) : '');

        const userFullName = `${(userFirst || '').trim()} ${(userLast || '').trim()}`.trim();

        // Compose a more specific subject and preheader for inbox preview
        const niceAmount = formatNumber(amountSent || amountReceived || '');
        const ref = updatedRequest.referenceID ? `${updatedRequest.referenceID}` : '';

        // Compute receipt hash for a direct receipt link
        let receiptHash = '';
        try {
          if (updatedRequest.referenceID) {
            receiptHash = crypto.createHash('sha256').update(String(updatedRequest.referenceID)).digest('hex').substring(0, 36);
          }
        } catch (rhErr) {
        }
        const receiptUrl = receiptHash && frontendUrl ? `${frontendUrl}/transfers/receipt/${receiptHash}` : '';
        const subject = ref ? `Transfer ${ref} — ${niceAmount} CAD — Completed` : `Your transfer is completed`;

        const preheader = ref
          ? `Transfer ${ref} for ${niceAmount} CAD has been completed.`
          : `Your transfer has been completed.`;

        const html = `
          <div style="font-family: Arial, sans-serif; color: #1f2937; line-height:1.4;">
            <!-- Preheader (hidden) -->
            <div style="display:none;max-height:0px;overflow:hidden;">${escapeHtml(preheader)}</div>
            <div style="text-align:center; padding: 20px 0;">
              <img src="${emailSvc.LOGO_DATA_URI}" alt="CanViet Exchange" style="height: 60px;" />
            </div>
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

            <!-- Trustpilot review CTA -->
            <div style="text-align:center; margin:16px 0;">
              <p style="margin:8px 0;">If you're happy with our service, please leave us a review on Trustpilot.</p>
              <p style="margin:8px 0;"><a href="https://www.trustpilot.com/review/canvietexchange.com" target="_blank" rel="noopener noreferrer" style="background:#00b67a;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block;">Leave a review on Trustpilot</a></p>
              <p style="margin:12px 0;font-size:12px;color:#6b7280;">To opt out of transfer completion emails, go to <a href="${frontendUrl}/settings">${frontendUrl}/settings</a>, turn off "Receive transfer emails", then save changes.</p>
            </div>

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

            <div style="text-align:center; margin:16px 0;">
              <p style="margin:8px 0;">Hãy để lại đánh giá trên Trustpilot nếu bạn hài lòng với dịch vụ.</p>
              <p style="margin:8px 0;"><a href="https://www.trustpilot.com/review/canvietexchange.com" target="_blank" rel="noopener noreferrer" style="background:#00b67a;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block;">Leave a review on Trustpilot</a></p>
              <p style="margin:12px 0;font-size:12px;color:#6b7280;">Để không nhận thêm Email thông báo về giao dịch, hãy vào <a href="${frontendUrl}/settings">${frontendUrl}/settings</a>, tắt "Nhận email thông báo giao dịch", sau đó lưu thay đổi.</p>
            </div>

            <div style="margin-top:18px; font-size:12px; color:#6b7280;">
              <p>CanViet Exchange<br/>618 Edward Street N, Thunder Bay, ON, Canada<br/>Phone: +1 416-555-0100<br/><a href="${frontendUrl}">${frontendUrl}</a></p>
            </div>
          </div>
        `;

        const text = `Hello ${userFullName}\n\nWe have just delivered your money to the recipient safely. Your transfer is now completed. If your money is not delivered, please let us know: ${frontendUrl}/general/help\n\nPayment details:\nCompleted time: ${completedTime}\nAmount Sent: ${amountSent} CAD\nAmount Received: ${formatNumber(amountReceived)} VND\nPayment method: ${paymentMethod}\nStatus: Completed\n\n---\nVietnamese:\nXin chào ${userFullName},\nChúng tôi vừa chuyển tiền đến người nhận an toàn. Giao dịch của bạn đã hoàn thành. Nếu tiền chưa được nhận, vui lòng liên hệ với chúng tôi tại: ${frontendUrl}/general/help`;

        // Respect user's preference: if they opted out of transfer emails, skip sending
        if (!userReceiveEmails) {
        } else {
          // Send email from services inbox to the user and BCC Trustpilot invite address (best-effort)
          try {
            await emailSvc.sendMail({
              from: process.env.EMAIL_USER || process.env.CANVIETEXCHANGE_EMAIL_USER || undefined,
              to: userEmailAddr,
              bcc: process.env.TRUSTPILOT_INVITE_EMAIL || 'canvietexchange.com+61a7cdf283@invite.trustpilot.com',
              subject,
              text,
              html
            });
          } catch (mailErr) {
          }
        }
      } catch (notifyErr) {
      }
    }

    return res.json({
      ok: true,
      message: 'Request status updated successfully',
      request: updatedRequest
    });

  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: 'Failed to update request status',
      error: err.message
    });
  }
});

module.exports = router;
