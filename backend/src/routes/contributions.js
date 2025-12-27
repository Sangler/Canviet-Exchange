const express = require('express');
const router = express.Router();
const Contribution = require('../models/Contributions');
const User = require('../models/User');
const auth = require('../middleware/auth');
const emailSvc = require('../services/email');

/**
 * POST /api/contributions
 * Submit a new contribution/feedback
 * Requires authentication, email verification, and phone verification
 */
router.post('/', auth, async (req, res) => {
  try {
    // Support both legacy req.user.id and req.auth.sub/userId
    const userId = (req.user && req.user.id) || (req.auth && (req.auth.sub || req.auth.userId || req.auth.id));
    const { title, content } = req.body;

    // Validation
    if (!title || !content) {
      return res.status(400).json({
        ok: false,
        message: 'Title and content are required'
      });
    }

    if (title.length > 300) {
      return res.status(400).json({
        ok: false,
        message: 'Title must be 300 characters or less'
      });
    }

    if (content.length > 1000) {
      return res.status(400).json({
        ok: false,
        message: 'Content must be 1000 characters or less'
      });
    }

    // Fetch user to verify email and phone, and get user details
    const user = await User.findById(userId).select('firstName lastName email emailVerified phoneVerified');
    
    if (!user) {
      return res.status(404).json({
        ok: false,
        message: 'User not found'
      });
    }

    // Check email verification
    if (!user.emailVerified) {
      return res.status(403).json({
        ok: false,
        message: 'Email verification required. Please verify your email before submitting feedback.'
      });
    }

    // Check phone verification
    if (!user.phoneVerified) {
      return res.status(403).json({
        ok: false,
        message: 'Phone verification required. Please verify your phone number before submitting feedback.'
      });
    }

    // Create contribution
    const contribution = new Contribution({
      userId: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      userEmail: user.email,
      title: title.trim(),
      content: content.trim()
    });

    await contribution.save();

    // Notify services inbox (best-effort). CC configured in email service (defaults to ttsang2811@gmail.com)
    try {
      emailSvc.notifyNewPendingRequest({
        type: 'Contribution',
        userId: user._id.toString(),
        userEmail: user.email,
        summary: contribution.title,
        payload: contribution.toJSON()
      }).catch(err => console.error('[email] notifyNewPendingRequest error', err && err.message));
    } catch (e) {
      // console.error('[email] notify failed', e && e.message);
    }

    res.status(201).json({
      ok: true,
      message: 'Your feedback has been submitted successfully. Thank you!',
      contribution: {
        id: contribution._id,
        title: contribution.title,
        createdAt: contribution.createdAt
      }
    });

  } catch (error) {
    // console.error('Error creating contribution:', error);
    res.status(500).json({
      ok: false,
      message: 'Server error while submitting feedback. Please try again later.'
    });
  }
});

/**
 * GET /api/contributions/my
 * Get current user's contributions
 * Requires authentication
 */
router.get('/my', auth, async (req, res) => {
  try {
    const userId = (req.user && req.user.id) || (req.auth && (req.auth.sub || req.auth.userId || req.auth.id));
    
    const contributions = await Contribution.find({ userId })
      .sort({ createdAt: -1 })
      .select('title content createdAt')
      .limit(50);

    res.json({
      ok: true,
      contributions
    });

  } catch (error) {
    // console.error('Error fetching contributions:', error);
    res.status(500).json({
      ok: false,
      message: 'Server error while fetching contributions'
    });
  }
});

/**
 * GET /api/contributions (Admin only)
 * Get all contributions
 * Requires admin authentication
 */
router.get('/', auth, async (req, res) => {
  try {
    // Check if user is admin
    const subject = (req.user && req.user.id) || (req.auth && (req.auth.sub || req.auth.userId || req.auth.id));
    const user = await User.findById(subject).select('role');
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        ok: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const contributions = await Contribution.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'email role');

    const total = await Contribution.countDocuments();

    res.json({
      ok: true,
      contributions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    // console.error('Error fetching all contributions:', error);
    res.status(500).json({
      ok: false,
      message: 'Server error while fetching contributions'
    });
  }
});

module.exports = router;
