const mongoose = require('mongoose');

const contributionSchema = new mongoose.Schema({
  // Reference to the submitting user (if available)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    index: true
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  // Keep a copy of the email at submission time
  userEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },

  // Short title for the contribution/feedback
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 300
  },

  // Main content body
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  }

}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Index for fast recent queries by user
contributionSchema.index({ userId: 1, createdAt: -1 });
contributionSchema.index({ createdAt: -1 });

// Optional: include virtuals when converting to JSON
contributionSchema.set('toJSON', { virtuals: true });
contributionSchema.set('toObject', { virtuals: true });

const Contribution = mongoose.model('Contribution', contributionSchema);

module.exports = Contribution;
