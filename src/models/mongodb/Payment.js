const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  currency: {
    type: String,
    default: 'USD',
    maxlength: 3
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'balance', 'cash', 'bkash', 'transfer'],
    required: true
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  txId: {
    type: String,
    unique: true,
    sparse: true
  },
  bkashNumber: {
    type: String
  },
  qrCode: {
    type: String
  },
  paymentReference: {
    type: String
  },
  gatewayData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  processedAt: {
    type: Date
  },
  expiresAt: {
    type: Date
  },
  notes: {
    type: String
  },
  refundAmount: {
    type: Number,
    default: 0.00,
    min: 0
  },
  refundedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for better performance
paymentSchema.index({ userId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ paymentMethod: 1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ expiresAt: 1 }); // For cleanup of expired payments

// Instance method to check if payment is expired
paymentSchema.methods.isExpired = function() {
  return this.expiresAt && new Date() > this.expiresAt;
};

// Instance method to check if payment can be refunded
paymentSchema.methods.canRefund = function() {
  return ['completed', 'verified'].includes(this.status) && this.refundAmount < this.amount;
};

// Static method to find pending payments by user
paymentSchema.statics.findPendingByUser = function(userId) {
  return this.find({ 
    userId: userId, 
    status: 'pending',
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  });
};

module.exports = mongoose.model('Payment', paymentSchema);