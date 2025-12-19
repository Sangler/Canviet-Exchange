const mongoose = require('mongoose');

const bookkeeperSchema = new mongoose.Schema({
  timestamp: { type: Date, required: true, default: () => new Date() },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, index: true },
  userEmail: { type: String, required: false },
  referenceID: { type: String, required: false, index: true },
  requestId: { type: String, required: false, index: true },
  exchange: { type: mongoose.Schema.Types.Mixed, required: false },
  amountSentCAD: { type: Number, required: false },
  amountToVND: { type: Number, required: false },
  paymentMethod: { type: mongoose.Schema.Types.Mixed, required: false }
}, {
  timestamps: true
});

const Bookkeeper = mongoose.model('Bookkeeper', bookkeeperSchema);

module.exports = Bookkeeper;
