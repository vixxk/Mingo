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
      min: 1,
    },
    diamonds: {
      type: Number,
      default: 0,
    },
    // Snapshot of the listener's bank details at request time (TDS / PAN compliance)
    paymentDetails: {
      upiId: String,
      bankAccount: String,
      ifscCode: String,
      accountHolderName: String,
      method: { type: String, enum: ['upi', 'bank'], default: 'upi' },
    },
    bankName: { type: String, default: '', trim: true },
    accountNumber: { type: String, default: '', trim: true },
    bankIfscCode: { type: String, default: '', trim: true, uppercase: true },
    phone: { type: String, default: '', trim: true },
    panNumber: { type: String, default: '', trim: true, uppercase: true },
    // TDS breakdown — gross amount requested, tax deducted at source, net credited
    tdsRate: { type: Number, default: 0 },
    tdsAmount: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    // SLA snapshot — admin-set credit timeline in effect when this request was placed
    creditDaysMin: { type: Number, default: 3, min: 1 },
    creditDaysMax: { type: Number, default: 7, min: 1 },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'on_hold', 'paid', 'cancelled'],
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
