const User = require('../models/userModel');
const Transaction = require('../models/transactionModel');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/appError');
const PlayBillingService = require('../services/playBillingService');

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

      const SystemSettings = require('../models/SystemSettings');
      const settings = await SystemSettings.getSettings();
      const count = settings.activePackagesCount || 7;
      const dbPackages = (await WalletController._getPackages()).slice(0, count);
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
      const { packageId, productId, purchaseToken } = req.body;
      const targetId = productId || packageId;

      let dbPackages = [];
      try {
        const SystemSettings = require('../models/SystemSettings');
        const settings = await SystemSettings.getSettings();
        const count = settings.activePackagesCount || 7;
        const allDbPackages = await WalletController._getPackages() || [];
        dbPackages = allDbPackages.slice(0, count);
      } catch (e) {
        console.log('Error fetching DB packages:', e);
      }
      
      let pkg = dbPackages.find(pkgItem => pkgItem.id === targetId || (pkgItem._id && pkgItem._id.toString() === targetId));
      
      // Fallback 1: Search static local packages
      if (!pkg) {
        pkg = COIN_PACKAGES.find(pkgItem => pkgItem.id === targetId || (pkgItem._id && pkgItem._id.toString() === targetId));
      }
      
      // Fallback 2: Mock package if still not found
      if (!pkg) {
        pkg = {
          id: targetId || 'custom',
          coins: 100,
          originalPrice: 98,
          price: 49,
          discount: 50,
          tag: 'Test Offer'
        };
      }
      
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
          packageId: targetId,
          discount: effectiveDiscount,
          originalPrice: p.originalPrice,
          isFirstPurchase: isFirstPurchaseEligible,
          purchaseToken: purchaseToken || undefined,
        },
      });

      // Send notifications for purchase
      try {
        const Notification = require('../models/Notification');
        const PushService = require('../services/pushService');
        const { getIo } = require('../socket');

        const title = 'Coins Credited! 🪙';
        const body = `Your wallet has been credited with ${p.coins} coins. Thank you for your purchase!`;

        // 1. Create database notification
        await Notification.create({
          recipient: user._id,
          title,
          body,
          type: 'payment',
          data: {
            coins: p.coins,
            amount: effectivePrice,
            transactionId: transaction._id
          }
        });

        // 2. Send Push notification
        await PushService.sendPushNotification(user._id.toString(), {
          title,
          body,
          data: {
            type: 'payment',
            coins: p.coins,
            amount: effectivePrice,
          }
        });

        // 3. Emit real-time updates via Socket if user is connected
        try {
          const io = getIo();
          io.to(`user_${user._id.toString()}`).emit('new_notification', {
            title,
            body,
            type: 'payment',
            data: {
              coins: p.coins,
              amount: effectivePrice,
              transactionId: transaction._id
            }
          });
          io.to(`user_${user._id.toString()}`).emit('balance_updated', {
            coins: user.coins,
            reason: 'purchase'
          });
        } catch (sockErr) {
          console.log('Socket notification failed (user may be disconnected):', sockErr.message);
        }
      } catch (notifErr) {
        console.error('Failed to create/send purchase notifications:', notifErr);
      }

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
      if (type === 'Gifts') query.type = { $in: ['gift_send', 'gift_receive'] };
      else if (type === 'Sessions') query.type = { $in: ['call_debit', 'call_credit'] };
      else if (type === 'Recharges') query.type = 'purchase';

      const transactions = await Transaction.find(query)
        .populate({
          path: 'metadata.sessionId',
          populate: [
            { path: 'listenerId', select: 'name username' },
            { path: 'userId', select: 'name username' }
          ]
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

      // Costs: chat=10 coins/5min, audio=10 coins/min, video=40 coins/min
      const costs = { chat: 10, audio: 10, video: 40 };
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
