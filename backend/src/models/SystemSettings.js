const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema(
  {
    coinPricing: [
      {
        id: String,
        coins: Number,
        originalPrice: Number,
        price: Number,
        discount: Number,
        tag: String,
      },
    ],
    coinToDiamondRatio: {
      type: Number,
      default: 1, // 1 coin = 1 diamond (as per previous convos maybe different, but let's stick to 1:1 or whatever the user wants)
    },
    diamondToInrRatio: {
      type: Number,
      default: 1, // 1 diamond = 1 INR (as per requirement ₹1.5/min, ₹4/min)
    },
    commissionPercentage: {
      type: Number,
      default: 30,
    },
    minWithdrawalLimit: {
      type: Number,
      default: 500,
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    otpSettings: {
      enabled: { type: Boolean, default: true },
      provider: { type: String, default: 'firebase' },
    },
    notifications: {
      welcomeMessage: { type: String, default: 'Welcome to Mingo!' },
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only one settings document exists
systemSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({
      coinPricing: [
        { id: '1', coins: 40,   originalPrice: 38, price: 19,  discount: 50, tag: 'Starter Offer' },
        { id: '2', coins: 100,  originalPrice: 98, price: 49,  discount: 50, tag: 'Flat 50% Off' },
        { id: '3', coins: 220,  originalPrice: 198, price: 99,  discount: 50, tag: 'Most Popular' },
        { id: '4', coins: 350,  originalPrice: 373, price: 149, discount: 60, tag: 'Flat 60% Off' },
        { id: '5', coins: 850,  originalPrice: 873, price: 349, discount: 60, tag: 'Best Value' },
        { id: '6', coins: 1500, originalPrice: 1198, price: 599, discount: 50, tag: 'Super Saver' },
        { id: '7', coins: 3000, originalPrice: 2497, price: 999, discount: 60, tag: 'Limited Offer' },
      ],
    });
  }
  return settings;
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
