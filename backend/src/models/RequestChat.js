const mongoose = require('mongoose');

const RequestChatSchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Request',
      required: true,
      index: true
    },
    // Sender info
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    senderRole: {
      type: String,
      enum: ['user', 'admin'],
      required: true
    },
    senderName: String, // Snapshot of name at time of message
    senderEmail: String, // Snapshot of email
    
    // Message content
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000
    },
    
    // Optional attachment (e.g., payment proof image URL from S3)
    attachment: {
      type: String, // S3 URL or file key
      default: null
    },
    attachmentType: {
      type: String,
      enum: ['image', 'document', null],
      default: null
    },
    
    // Message status
    isEdited: {
      type: Boolean,
      default: false
    },
    editedAt: Date,
    
    // Read receipt
    readAt: Date,
    
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  { timestamps: true }
);

// Index for fast lookup of chats for a specific request
RequestChatSchema.index({ requestId: 1, createdAt: -1 });

module.exports = mongoose.model('RequestChat', RequestChatSchema);
