const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['purchase', 'call_debit', 'call_credit', 'signup_bonus', 'refund', 'gift_send', 'gift_receive'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    coins: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'completed',
    },
    metadata: {
      packageId: String,
      sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session',
      },
      discount: Number,
      originalPrice: Number,
      isFirstPurchase: Boolean,
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.index({ userId: 1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
