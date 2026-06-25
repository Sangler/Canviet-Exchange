const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');
const RequestChat = require('../models/RequestChat');
const Request = require('../models/Requests');
const User = require('../models/User');

/**
 * GET /api/chats/:requestId - Get all messages for a transfer request
 * Query params: limit=50, skip=0
 */
router.get('/:requestId', authMiddleware, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    // Verify user has access to this request
    const request = await Request.findById(requestId).select('userId');
    if (!request) {
      return res.status(404).json({ ok: false, message: 'Request not found' });
    }

    const userRole = req.auth?.role;
    const requestOwnerId = String(request.userId);
    const currentUserId = String(req.user?.id || req.auth?.userId);

    // Only owner or admin can view chat
    if (userRole !== 'admin' && requestOwnerId !== currentUserId) {
      return res.status(403).json({ ok: false, message: 'Unauthorized' });
    }

    // Fetch messages, sorted newest first
    const messages = await RequestChat.find({ requestId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    const total = await RequestChat.countDocuments({ requestId });

    // Mark messages as read for current user
    await RequestChat.updateMany(
      { requestId, senderId: { $ne: currentUserId }, readAt: null },
      { readAt: new Date() }
    );

    return res.json({
      ok: true,
      messages: messages.reverse(), // Return oldest first for UI
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: parseInt(skip) + messages.length < total
      }
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

/**
 * POST /api/chats/:requestId - Send a new message
 * Body: { message: string, attachment?: string (S3 URL), attachmentType?: 'image'|'document' }
 */
router.post('/:requestId', authMiddleware, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { message, attachment, attachmentType } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ ok: false, message: 'Message cannot be empty' });
    }

    // Verify user has access to this request
    const request = await Request.findById(requestId).select('userId');
    if (!request) {
      return res.status(404).json({ ok: false, message: 'Request not found' });
    }

    const userRole = req.auth?.role;
    const requestOwnerId = String(request.userId);
    const currentUserId = String(req.user?.id || req.auth?.userId);

    // Only owner or admin can send message
    if (userRole !== 'admin' && requestOwnerId !== currentUserId) {
      return res.status(403).json({ ok: false, message: 'Unauthorized' });
    }

    // Get sender info
    const user = await User.findById(currentUserId).select('firstName lastName email');
    const senderName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'User';

    // Create message
    const newMessage = new RequestChat({
      requestId,
      senderId: currentUserId,
      senderRole: userRole === 'admin' ? 'admin' : 'user',
      senderName,
      senderEmail: user?.email,
      message: message.trim(),
      ...(attachment && { attachment, attachmentType })
    });

    await newMessage.save();

    return res.status(201).json({
      ok: true,
      message: newMessage
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

/**
 * PATCH /api/chats/:messageId - Edit a message (only by sender, within 5 mins)
 * Body: { message: string }
 */
router.patch('/:messageId', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ ok: false, message: 'Message cannot be empty' });
    }

    const msg = await RequestChat.findById(messageId);
    if (!msg) {
      return res.status(404).json({ ok: false, message: 'Message not found' });
    }

    // Only sender can edit
    if (String(msg.senderId) !== String(req.user?.id || req.auth?.userId)) {
      return res.status(403).json({ ok: false, message: 'Unauthorized' });
    }

    // Only editable within 5 minutes
    const timeSinceCreation = (Date.now() - msg.createdAt.getTime()) / 1000 / 60;
    if (timeSinceCreation > 5) {
      return res.status(400).json({ ok: false, message: 'Can only edit messages within 5 minutes' });
    }

    msg.message = message.trim();
    msg.isEdited = true;
    msg.editedAt = new Date();
    await msg.save();

    return res.json({ ok: true, message: msg });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

/**
 * DELETE /api/chats/:messageId - Delete a message (only by sender or admin)
 */
router.delete('/:messageId', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;

    const msg = await RequestChat.findById(messageId);
    if (!msg) {
      return res.status(404).json({ ok: false, message: 'Message not found' });
    }

    const userRole = req.auth?.role;
    const currentUserId = String(req.user?.id || req.auth?.userId);

    // Only sender or admin can delete
    if (userRole !== 'admin' && String(msg.senderId) !== currentUserId) {
      return res.status(403).json({ ok: false, message: 'Unauthorized' });
    }

    await RequestChat.deleteOne({ _id: messageId });

    return res.json({ ok: true, message: 'Message deleted' });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
