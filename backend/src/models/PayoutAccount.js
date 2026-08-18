const mongoose = require('mongoose');

const payoutAccountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    bankName: {
      type: String,
      default: '',
      trim: true,
      maxlength: 100,
    },
    accountNumber: {
      type: String,
      default: '',
      trim: true,
      maxlength: 30,
    },
    ifscCode: {
      type: String,
      default: '',
      trim: true,
      uppercase: true,
      maxlength: 11,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
      maxlength: 15,
    },
    panNumber: {
      type: String,
      default: '',
      trim: true,
      uppercase: true,
      maxlength: 10,
    },
    isComplete: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

payoutAccountSchema.index({ userId: 1 });
payoutAccountSchema.index({ isComplete: 1 });

module.exports = mongoose.model('PayoutAccount', payoutAccountSchema);
