const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  // User reference - one user can have many requests
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  userEmail: {
    type: String,
    required: true
  },
  userPhone: {
    type: String,
    required: true
  },
  // Request status
  status: {
    type: String,
    enum: ['pending', 'approved', 'reject', 'completed'],
    default: 'pending',
    required: true
  },
  
  // Amount details
  amountSent: {
    type: Number,
    required: true,
    min: 0
  },
  
  amountReceived: {
    type: Number,
    required: true,
    min: 0
  },
  
  currencyFrom: {
    type: String,
    default: 'CAD',
    required: true
  },
  
  currencyTo: {
    type: String,
    default: 'VND',
    required: true
  },
  
  exchangeRate: {
    type: Number,
    required: true
  },
  
  transferFee: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Sending method details (payment method)
  sendingMethod: {
    type: {
      type: String,
      enum: ['debit', 'credit', 'e-transfer', 'wire'],
      required: true
    },
    
    // Card details (for debit/credit)
    cardNumber: {
      type: String,
      select: false // Hide by default for security
    },
    cardNickname: String,
    cardName: String,
    
    // Bank details (for e-transfer/wire)
    senderBankAccount: String,
    senderTransitNumber: String,
    senderInstitutionNumber: String,
    bankTransfer: {
      institutionNumber: String,
      transitNumber: String,
      accountNumber: String
    },
    
    // Billing address (optional, for cards)
    billingAddress: {
      street: String,
      unit: String,
      city: String,
      province: String,
      postalCode: String,
      country: String
    }
  },
  
  // Recipient bank details
  recipientBank: {
    bankName: {
      type: String,
      required: true
    },
    accountNumber: {
      type: String,
      required: true
    },
    accountHolderName: String,
    
    // Transfer content/message
    transferContent: {
      type: String,
      maxlength: 500
    }
  },
  

  completedAt: Date,
  createdAt: Date
  
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

// Indexes for efficient queries
requestSchema.index({ userId: 1, createdAt: -1 });
requestSchema.index({ status: 1 });
requestSchema.index({ createdAt: -1 });

// Virtual for transaction ID display
requestSchema.virtual('transactionId').get(function() {
  return `TXN-${this._id.toString().slice(-8).toUpperCase()}`;
});

// Ensure virtuals are included when converting to JSON
requestSchema.set('toJSON', { virtuals: true });
requestSchema.set('toObject', { virtuals: true });

const Request = mongoose.model('Request', requestSchema);

module.exports = Request;
