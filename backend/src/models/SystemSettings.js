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
        subTag: String,
        isPopular: Boolean,
        iconUrl: String,
      },
    ],
    coinToDiamondRatio: {
      type: Number,
      default: 10, // 10 coins = 1 diamond
    },
    sliderInterval: {
      type: Number,
      default: 4, // Seconds between automatic ad slider rotations
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
      default: 12,
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
    customRingtoneUrl: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Ensure settings document exists and has exact 12 coin purchase slabs synced
systemSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  const cloudFrontUrl = process.env.AWS_CLOUDFRONT_URL || 'https://d3arutsevouzgm.cloudfront.net';
  const defaults = [
    { id: '1',  coins: 80,    originalPrice: 62,    price: 62,    discount: 0,  tag: 'Starter Offer', subTag: '',               isPopular: false, iconUrl: `${cloudFrontUrl}/coin_packages/pack_80.png` },
    { id: '2',  coins: 300,   originalPrice: 149,   price: 149,   discount: 0,  tag: '',              subTag: '',               isPopular: false, iconUrl: `${cloudFrontUrl}/coin_packages/pack_300.png` },
    { id: '3',  coins: 450,   originalPrice: 251,   price: 251,   discount: 0,  tag: 'Most Popular',  subTag: '',               isPopular: true,  iconUrl: `${cloudFrontUrl}/coin_packages/pack_450.png` },
    { id: '4',  coins: 1100,  originalPrice: 550,   price: 550,   discount: 0,  tag: 'Hot',           subTag: '',               isPopular: false, iconUrl: `${cloudFrontUrl}/coin_packages/pack_1100.png` },
    { id: '5',  coins: 1800,  originalPrice: 1055,  price: 1055,  discount: 0,  tag: 'Hot',           subTag: '',               isPopular: false, iconUrl: `${cloudFrontUrl}/coin_packages/pack_1800.png` },
    { id: '6',  coins: 3500,  originalPrice: 1549,  price: 1049,  discount: 32, tag: 'Best Value',   subTag: 'Flat ₹500 off',  isPopular: false, iconUrl: `${cloudFrontUrl}/coin_packages/pack_3500.png` },
    { id: '7',  coins: 5000,  originalPrice: 1999,  price: 1999,  discount: 0,  tag: 'Super Saver',  subTag: '',               isPopular: false, iconUrl: `${cloudFrontUrl}/coin_packages/pack_5000.png` },
    { id: '8',  coins: 9000,  originalPrice: 3251,  price: 2651,  discount: 18, tag: 'Limited Offer', subTag: 'Flat ₹600 off',  isPopular: false, iconUrl: `${cloudFrontUrl}/coin_packages/pack_9000.png` },
    { id: '9',  coins: 15000, originalPrice: 6000,  price: 3600,  discount: 40, tag: 'Value Pack',    subTag: 'Flat ₹2400 off', isPopular: false, iconUrl: `${cloudFrontUrl}/coin_packages/pack_15000.png` },
    { id: '10', coins: 20000, originalPrice: 8000,  price: 5000,  discount: 38, tag: 'Premium Pack',  subTag: 'Flat ₹3000 off', isPopular: false, iconUrl: `${cloudFrontUrl}/coin_packages/pack_20000.png` },
    { id: '11', coins: 30000, originalPrice: 12000, price: 7500,  discount: 38, tag: 'Mega Pack',     subTag: 'Flat ₹4500 off', isPopular: false, iconUrl: `${cloudFrontUrl}/coin_packages/pack_30000.png` },
    { id: '12', coins: 50000, originalPrice: 18000, price: 11000, discount: 39, tag: 'Ultimate Pack', subTag: 'Flat ₹7000 off', isPopular: false, iconUrl: `${cloudFrontUrl}/coin_packages/pack_50000.png` },
  ];
  
  if (!settings) {
    settings = await this.create({
      coinPricing: defaults,
      activePackagesCount: 12,
    });
  } else {
    let updated = false;
    if (!settings.activePackagesCount || settings.activePackagesCount < 12) {
      settings.activePackagesCount = 12;
      updated = true;
    }
    if (!settings.coinPricing || settings.coinPricing.length < 12 || (settings.coinPricing.length === 7 && settings.coinPricing[6].coins === 3000)) {
      settings.coinPricing = defaults;
      updated = true;
    }
    if (updated) {
      await settings.save();
    }
  }
  return settings;
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
