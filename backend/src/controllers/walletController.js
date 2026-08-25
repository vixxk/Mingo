const User = require('../models/userModel');
const Transaction = require('../models/transactionModel');
const SystemSettings = require('../models/SystemSettings');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/appError');
const PlayBillingService = require('../services/playBillingService');

const getCoinsPerDiamond = async () => {
  try {
    const settings = await SystemSettings.findOne();
    return settings?.coinToDiamondRatio ?? 10;
  } catch {
    return 10;
  }
};

const COIN_PACKAGES = [
  { id: '1',  coins: 80,    originalPrice: 62,    price: 62,    discount: 0,  tag: 'Starter Offer', subTag: '',               isPopular: false },
  { id: '2',  coins: 300,   originalPrice: 149,   price: 149,   discount: 0,  tag: '',              subTag: '',               isPopular: false },
  { id: '3',  coins: 450,   originalPrice: 251,   price: 251,   discount: 0,  tag: 'Most Popular',  subTag: '',               isPopular: true  },
  { id: '4',  coins: 1100,  originalPrice: 550,   price: 550,   discount: 0,  tag: 'Hot',           subTag: '',               isPopular: false },
  { id: '5',  coins: 1800,  originalPrice: 1055,  price: 1055,  discount: 0,  tag: 'Hot',           subTag: '',               isPopular: false },
  { id: '6',  coins: 3500,  originalPrice: 1549,  price: 1049,  discount: 32, tag: 'Best Value',   subTag: 'Flat ₹500 off',  isPopular: false },
  { id: '7',  coins: 5000,  originalPrice: 1999,  price: 1999,  discount: 0,  tag: 'Super Saver',  subTag: '',               isPopular: false },
  { id: '8',  coins: 9000,  originalPrice: 3251,  price: 2651,  discount: 18, tag: 'Limited Offer', subTag: 'Flat ₹600 off',  isPopular: false },
  { id: '9',  coins: 15000, originalPrice: 6000,  price: 3600,  discount: 40, tag: 'Value Pack',    subTag: 'Flat ₹2400 off', isPopular: false },
  { id: '10', coins: 20000, originalPrice: 8000,  price: 5000,  discount: 38, tag: 'Premium Pack',  subTag: 'Flat ₹3000 off', isPopular: false },
  { id: '11', coins: 30000, originalPrice: 12000, price: 7500,  discount: 38, tag: 'Mega Pack',     subTag: 'Flat ₹4500 off', isPopular: false },
  { id: '12', coins: 50000, originalPrice: 18000, price: 11000, discount: 39, tag: 'Ultimate Pack', subTag: 'Flat ₹7000 off', isPopular: false },
];

class WalletController {
  static async getBalance(req, res, next) {
    try {
      const user = await User.findById(req.user.id).select('coins isFirstSignup signupTimestamp');
      if (!user) throw new AppError('User not found', 404);

      const isFirstPurchaseEligible = user.isFirstSignup && user.signupTimestamp &&
        (Date.now() - new Date(user.signupTimestamp).getTime()) < 6 * 3600 * 1000;

      const rate = await getCoinsPerDiamond();
      return ApiResponse.success(res, {
        coins: user.coins,
        diamonds: Math.floor(user.coins / rate),
        isFirstPurchaseEligible,
        signupTimestamp: user.signupTimestamp,
      }, 'Balance retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async _getPackages() {
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
      const count = settings.activePackagesCount || 12;
      const dbPackages = (await WalletController._getPackages()).slice(0, count);
      const packages = dbPackages.map(pkg => {
        // pkg is a Mongoose subdoc, convert to object
        const p = pkg.toObject ? pkg.toObject() : pkg;
        const effectiveDiscount = isFirstPurchaseEligible 
          ? Math.min((p.discount || 0) + 50, 80) 
          : (p.discount || 0);
        const effectivePrice = isFirstPurchaseEligible
          ? Math.round((p.originalPrice || p.price) * (1 - effectiveDiscount / 100))
          : (p.price ?? Math.round((p.originalPrice || p.price) * (1 - effectiveDiscount / 100)));

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
        const count = settings.activePackagesCount || 12;
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

      const rawTransactions = await Transaction.find(query)
        .populate({
          path: 'metadata.sessionId',
          populate: [
            { path: 'listenerId', select: 'name username' },
            { path: 'userId', select: 'name username' }
          ]
        })
        .sort({ createdAt: -1 });

      // Consolidate multiple per-minute transactions for the same session ID
      const consolidated = [];
      const sessionMap = new Map();

      for (const tx of rawTransactions) {
        const isSessionTx = tx.type === 'call_debit' || tx.type === 'call_credit';
        const sessObj = tx.metadata?.sessionId;
        const sessId = sessObj?._id ? sessObj._id.toString() : (tx.metadata?.sessionId ? tx.metadata.sessionId.toString() : null);

        if (isSessionTx && sessId) {
          const groupKey = `${tx.type}_${sessId}`;
          if (sessionMap.has(groupKey)) {
            const existingIndex = sessionMap.get(groupKey);
            const target = consolidated[existingIndex];
            
            target.coins = (target.coins || 0) + (tx.coins || 0);
            target.amount = Math.round(((target.amount || 0) + (tx.amount || 0)) * 100) / 100;
            
            if (new Date(tx.createdAt) > new Date(target.createdAt)) {
              target.createdAt = tx.createdAt;
            }
            
            const sessionDoc = target.metadata?.sessionId;
            const callType = sessionDoc?.callType || (tx.type === 'call_debit' ? 'audio' : 'audio');
            const rate = callType === 'video' ? 40 : 10;
            const computedDuration = Math.max(1, Math.round(Math.abs(target.coins) / rate));
            const duration = sessionDoc?.duration || computedDuration;
            
            if (tx.type === 'call_debit') {
              target.description = `${callType} call session (${duration} min)`;
            } else {
              target.description = `${callType} call earnings (${duration} min)`;
            }
          } else {
            const txObj = tx.toObject ? tx.toObject() : { ...tx };
            sessionMap.set(groupKey, consolidated.length);
            consolidated.push(txObj);
          }
        } else {
          consolidated.push(tx.toObject ? tx.toObject() : { ...tx });
        }
      }

      consolidated.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 20;
      const total = consolidated.length;
      const paginatedTransactions = consolidated.slice((pageNum - 1) * limitNum, pageNum * limitNum);

      return ApiResponse.success(res, { transactions: paginatedTransactions, total }, 'Transactions retrieved');
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
