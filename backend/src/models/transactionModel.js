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
      enum: ['purchase', 'call_debit', 'call_credit', 'signup_bonus', 'refund', 'gift_send', 'gift_receive', 'DEBIT', 'CREDIT', 'debit', 'credit'],
      required: true,
    },
    amount: {
      type: Number,
      default: 0,
      required: true,
    },
    coins: {
      type: Number,
      default: 0,
      required: true,
    },
    description: {
      type: String,
      default: 'Transaction record',
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'completed',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.pre('validate', function () {
  if (this.type === 'DEBIT') {
    this.type = 'call_debit';
  } else if (this.type === 'CREDIT') {
    this.type = 'call_credit';
  }
  if (this.coins === undefined || this.coins === null) {
    this.coins = 0;
  }
  if (this.amount === undefined || this.amount === null) {
    this.amount = 0;
  }
});

transactionSchema.index({ userId: 1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
