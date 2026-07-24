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
      default: 10, // 10 coins = 1 diamond
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
    audioPayoutRate: {
      type: Number,
      default: 1.00,
    },
    videoPayoutRate: {
      type: Number,
      default: 4.00,
    },
    chatPayoutRate: {
      type: Number,
      default: 2.50,
    },
    activePackagesCount: {
      type: Number,
      default: 7,
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
  const defaults = [
    { id: '1', name: 'Starter Offer', coins: 40,   originalPrice: 38, price: 19,  discount: 50, tag: 'Starter Offer' },
    { id: '2', name: 'Flat 50% Off', coins: 100,  originalPrice: 98, price: 49,  discount: 50, tag: 'Flat 50% Off' },
    { id: '3', name: 'Most Popular', coins: 220,  originalPrice: 198, price: 99,  discount: 50, tag: 'Most Popular' },
    { id: '4', name: 'Flat 60% Off', coins: 350,  originalPrice: 373, price: 149, discount: 60, tag: 'Flat 60% Off' },
    { id: '5', name: 'Best Value', coins: 850,  originalPrice: 873, price: 349, discount: 60, tag: 'Best Value' },
    { id: '6', name: 'Super Saver', coins: 1500, originalPrice: 1198, price: 599, discount: 50, tag: 'Super Saver' },
    { id: '7', name: 'Limited Offer', coins: 3000, originalPrice: 2497, price: 999, discount: 60, tag: 'Limited Offer' },
  ];
  const expectedIds = defaults.map(d => d.id).join(',');
  
  if (!settings) {
    settings = await this.create({
      coinPricing: defaults,
      activePackagesCount: 7,
    });
  } else if (!settings.coinPricing || settings.coinPricing.length === 0) {
    settings.coinPricing = defaults;
    await settings.save();
  } else {
    // Check if existing packages match expected defaults (by ID sequence)
    const currentIds = settings.coinPricing.map(p => String(p.id)).sort().join(',');
    if (currentIds !== expectedIds) {
      console.log('[SystemSettings] Coin packages out of sync, resetting to defaults');
      settings.coinPricing = defaults;
      await settings.save();
    }
  }
  return settings;
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
