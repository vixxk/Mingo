const User = require('../models/userModel');
const Transaction = require('../models/transactionModel');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/appError');

// 10 coins = 1 diamond
// Chat: 10 coins / 5 mins (1 diamond)
// Audio Call: 10 coins / min (1 diamond)
// Video Call: 40 coins / min (4 diamonds)
const COINS_PER_DIAMOND = 10;

const COIN_PACKAGES = [
  { id: '1', coins: 40,   originalPrice: 38, price: 19,  discount: 50, tag: 'Starter Offer' },
  { id: '2', coins: 100,  originalPrice: 98, price: 49,  discount: 50, tag: 'Flat 50% Off' },
  { id: '3', coins: 220,  originalPrice: 198, price: 99,  discount: 50, tag: 'Most Popular' },
  { id: '4', coins: 350,  originalPrice: 373, price: 149, discount: 60, tag: 'Flat 60% Off' },
  { id: '5', coins: 850,  originalPrice: 873, price: 349, discount: 60, tag: 'Best Value' },
  { id: '6', coins: 1500, originalPrice: 1198, price: 599, discount: 50, tag: 'Super Saver' },
  { id: '7', coins: 3000, originalPrice: 2497, price: 999, discount: 60, tag: 'Limited Offer' },
];

class WalletController {
  static async getBalance(req, res, next) {
    try {
      const user = await User.findById(req.user.id).select('coins isFirstSignup signupTimestamp');
      if (!user) throw new AppError('User not found', 404);

      const isFirstPurchaseEligible = user.isFirstSignup && user.signupTimestamp &&
        (Date.now() - new Date(user.signupTimestamp).getTime()) < 6 * 3600 * 1000;

      return ApiResponse.success(res, {
        coins: user.coins,
        diamonds: Math.floor(user.coins / COINS_PER_DIAMOND),
        isFirstPurchaseEligible,
        signupTimestamp: user.signupTimestamp,
      }, 'Balance retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async _getPackages() {
    const SystemSettings = require('../models/SystemSettings');
    const settings = await SystemSettings.getSettings();
    return settings.coinPricing;
  }

  static async getPackages(req, res, next) {
    try {
      const user = await User.findById(req.user.id).select('isFirstSignup signupTimestamp');
      
      const isFirstPurchaseEligible = user.isFirstSignup && user.signupTimestamp &&
        (Date.now() - new Date(user.signupTimestamp).getTime()) < 6 * 3600 * 1000;

      const dbPackages = await WalletController._getPackages();
      const packages = dbPackages.map(pkg => {
        // pkg is a Mongoose subdoc, convert to object
        const p = pkg.toObject ? pkg.toObject() : pkg;
        const effectiveDiscount = isFirstPurchaseEligible 
          ? Math.min((p.discount || 0) + 50, 80) 
          : (p.discount || 0);
        const effectivePrice = Math.round((p.originalPrice || p.price) * (1 - effectiveDiscount / 100));

        return {
          ...p,
          discount: effectiveDiscount,
          price: effectivePrice,
          isFirstPurchaseBonus: isFirstPurchaseEligible,
        };
      });

      return ApiResponse.success(res, { packages, isFirstPurchaseEligible }, 'Packages retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async purchaseCoins(req, res, next) {
    try {
      const { packageId } = req.body;
      const dbPackages = await WalletController._getPackages();
      const pkg = dbPackages.find(p => p.id === packageId);
      if (!pkg) throw new AppError('Invalid package', 400);

      const p = pkg.toObject ? pkg.toObject() : pkg;
      const user = await User.findById(req.user.id);
      if (!user) throw new AppError('User not found', 404);

      const isFirstPurchaseEligible = user.isFirstSignup && user.signupTimestamp &&
        (Date.now() - new Date(user.signupTimestamp).getTime()) < 6 * 3600 * 1000;

      const effectiveDiscount = isFirstPurchaseEligible
        ? Math.min((p.discount || 0) + 50, 80)
        : (p.discount || 0);
      const effectivePrice = Math.round((p.originalPrice || p.price) * (1 - effectiveDiscount / 100));

      user.coins += p.coins;
      if (isFirstPurchaseEligible) {
        user.isFirstSignup = false;
      }
      await user.save();

      const transaction = await Transaction.create({
        userId: user._id,
        type: 'purchase',
        amount: effectivePrice,
        coins: p.coins,
        description: `Purchased ${p.coins} coins`,
        status: 'completed',
        metadata: {
          packageId,
          discount: effectiveDiscount,
          originalPrice: p.originalPrice,
          isFirstPurchase: isFirstPurchaseEligible,
        },
      });

      return ApiResponse.success(res, {
        coins: user.coins,
        transaction: {
          id: transaction._id,
          coins: transaction.coins,
          amount: transaction.amount,
          discount: effectiveDiscount,
        },
      }, 'Coins purchased successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getTransactions(req, res, next) {
    try {
      const { page = 1, limit = 20, type } = req.query;
      const query = { userId: req.user.id };
      
      // Filter by tab if type is provided
      if (type === 'Payments') query.type = 'purchase';
      else if (type === 'Sessions') query.type = { $in: ['call_debit', 'gift_send'] };
      else if (type === 'FreeCoins') query.type = 'signup_bonus';

      const transactions = await Transaction.find(query)
        .populate({
          path: 'metadata.sessionId',
          populate: { path: 'listenerId', select: 'name username' }
        })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const total = await Transaction.countDocuments(query);

      return ApiResponse.success(res, { transactions, total }, 'Transactions retrieved');
    } catch (err) {
      next(err);
    }
  }

  // Check if user has sufficient balance for a feature
  static async checkBalance(req, res, next) {
    try {
      const { feature } = req.query; // 'chat', 'audio', 'video'
      const user = await User.findById(req.user.id).select('coins');
      if (!user) throw new AppError('User not found', 404);

      // Costs: chat=10 coins/5min, audio=10 coins/min, video=30 coins/min
      const costs = { chat: 10, audio: 10, video: 30 };
      const requiredCoins = costs[feature] || 10;
      const hasSufficient = user.coins >= requiredCoins;

      return ApiResponse.success(res, {
        coins: user.coins,
        diamonds: Math.floor(user.coins / COINS_PER_DIAMOND),
        hasSufficient,
        requiredCoins,
        feature: feature || 'chat',
      }, hasSufficient ? 'Sufficient balance' : 'Insufficient balance');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = WalletController;
