const mongoose = require('mongoose');

const payoutRequestSchema = new mongoose.Schema(
  {
    listenerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    diamonds: {
      type: Number,
      required: true,
    },
    paymentDetails: {
      upiId: String,
      bankAccount: String,
      ifscCode: String,
      accountHolderName: String,
      method: { type: String, enum: ['upi', 'bank'], default: 'upi' },
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'on_hold', 'paid'],
      default: 'pending',
    },
    adminNotes: String,
    processedAt: Date,
    transactionId: String,
  },
  {
    timestamps: true,
  }
);

payoutRequestSchema.index({ listenerId: 1 });
payoutRequestSchema.index({ status: 1 });
payoutRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('PayoutRequest', payoutRequestSchema);
