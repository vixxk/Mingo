const User = require('../models/userModel');
const Transaction = require('../models/transactionModel');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/appError');

const COIN_PACKAGES = [
  { id: '1', coins: 100, originalPrice: 100, price: 50, discount: 50 },
  { id: '2', coins: 250, originalPrice: 250, price: 125, discount: 50 },
  { id: '3', coins: 500, originalPrice: 500, price: 250, discount: 50 },
  { id: '4', coins: 1000, originalPrice: 1000, price: 500, discount: 50 },
  { id: '5', coins: 1250, originalPrice: 1250, price: 625, discount: 50 },
  { id: '6', coins: 1500, originalPrice: 1500, price: 750, discount: 50 },
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
        isFirstPurchaseEligible,
        signupTimestamp: user.signupTimestamp,
      }, 'Balance retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async getPackages(req, res, next) {
    try {
      const user = await User.findById(req.user.id).select('isFirstSignup signupTimestamp');
      
      const isFirstPurchaseEligible = user.isFirstSignup && user.signupTimestamp &&
        (Date.now() - new Date(user.signupTimestamp).getTime()) < 6 * 3600 * 1000;

      const packages = COIN_PACKAGES.map(pkg => {
        const effectiveDiscount = isFirstPurchaseEligible 
          ? Math.min(pkg.discount + 50, 80) 
          : pkg.discount;
        const effectivePrice = Math.round(pkg.originalPrice * (1 - effectiveDiscount / 100));

        return {
          ...pkg,
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
      const pkg = COIN_PACKAGES.find(p => p.id === packageId);
      if (!pkg) throw new AppError('Invalid package', 400);

      const user = await User.findById(req.user.id);
      if (!user) throw new AppError('User not found', 404);

      const isFirstPurchaseEligible = user.isFirstSignup && user.signupTimestamp &&
        (Date.now() - new Date(user.signupTimestamp).getTime()) < 6 * 3600 * 1000;

      const effectiveDiscount = isFirstPurchaseEligible
        ? Math.min(pkg.discount + 50, 80)
        : pkg.discount;
      const effectivePrice = Math.round(pkg.originalPrice * (1 - effectiveDiscount / 100));

      user.coins += pkg.coins;
      if (isFirstPurchaseEligible) {
        user.isFirstSignup = false;
      }
      await user.save();

      const transaction = await Transaction.create({
        userId: user._id,
        type: 'purchase',
        amount: effectivePrice,
        coins: pkg.coins,
        description: `Purchased ${pkg.coins} coins`,
        status: 'completed',
        metadata: {
          packageId,
          discount: effectiveDiscount,
          originalPrice: pkg.originalPrice,
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
      const { page = 1, limit = 20 } = req.query;
      const transactions = await Transaction.find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const total = await Transaction.countDocuments({ userId: req.user.id });

      return ApiResponse.success(res, { transactions, total }, 'Transactions retrieved');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = WalletController;
