const User = require('../models/userModel');
const Listener = require('../models/listenerModel');
const PayoutAccount = require('../models/PayoutAccount');
const PayoutRequest = require('../models/PayoutRequest');
const SystemSettings = require('../models/SystemSettings');
const Transaction = require('../models/transactionModel');
const Session = require('../models/sessionModel');
const Notification = require('../models/Notification');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/appError');

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const IN_FLIGHT_STATUSES = ['pending', 'approved', 'on_hold'];

/**
 * Computes the listener's total earnings reconciled directly against the
 * transaction ledger (same source as /listener/earnings-stats).
 */
async function computeTotalEarnings(userId) {
  const credits = await Transaction.find({
    userId,
    type: { $in: ['call_credit', 'gift_receive'] },
    status: 'completed',
  }).select('amount').lean();

  let total = 0;
  for (const t of credits) {
    total += t.amount || 0;
  }
  return Math.round(total * 100) / 100;
}

class PayoutController {
  /**
   * GET /listener/payout/dashboard
   * Earnings visibility + bank details + payout eligibility in one call.
   */
  static async getDashboard(req, res, next) {
    try {
      const userId = req.user.id;

      const [totalEarnings, settings, bankAccount, requests] = await Promise.all([
        computeTotalEarnings(userId),
        SystemSettings.getSettings(),
        PayoutAccount.findOne({ userId }).lean(),
        PayoutRequest.find({ listenerId: userId }).sort({ createdAt: -1 }).limit(10).lean(),
      ]);

      // Amount locked inside in-flight requests (pending/approved/on_hold) —
      // those earnings can't be requested again until resolved.
      const inFlightAgg = await PayoutRequest.aggregate([
        { $match: { listenerId: userId, status: { $in: IN_FLIGHT_STATUSES } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      const inFlightAmount = inFlightAgg.length > 0 ? inFlightAgg[0].total : 0;

      const minPayoutAmount = settings.minWithdrawalLimit ?? 500;
      const tdsRate = Math.min(100, Math.max(0, settings.tdsRate ?? 10));
      const creditMin = Math.max(1, settings.payoutCreditDaysMin ?? 3);
      const creditMax = Math.max(creditMin, settings.payoutCreditDaysMax ?? 7);
      const availableForPayout = Math.max(0, Math.round((totalEarnings - inFlightAmount) * 100) / 100);

      const hasPendingRequest = requests.some((r) => IN_FLIGHT_STATUSES.includes(r.status));

      return ApiResponse.success(res, {
        totalEarnings,
        availableForPayout,
        minPayoutAmount,
        tdsRate,
        creditTimeline: { min: creditMin, max: creditMax },
        inFlightAmount,
        hasPendingRequest,
        bankDetails: bankAccount
          ? {
              id: bankAccount._id,
              bankName: bankAccount.bankName || '',
              accountNumber: bankAccount.accountNumber || '',
              ifscCode: bankAccount.ifscCode || '',
              phone: bankAccount.phone || '',
              panNumber: bankAccount.panNumber || '',
              isComplete: !!bankAccount.isComplete,
            }
          : null,
        recentRequests: requests.map((r) => ({
          _id: r._id,
          amount: r.amount,
          status: r.status,
          createdAt: r.createdAt,
          adminNotes: r.adminNotes || '',
          transactionId: r.transactionId || '',
          tdsRate: r.tdsRate || 0,
          tdsAmount: r.tdsAmount || 0,
          netAmount: r.netAmount || 0,
        })),
      }, 'Payout dashboard retrieved');
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /listener/payout/bank-details
   * Save (or update) the listener's bank details + PAN for TDS compliance.
   */
  static async saveBankDetails(req, res, next) {
    try {
      const userId = req.user.id;
      const { bankName, accountNumber, ifscCode, phone, panNumber } = req.body;

      const clean = (v) => (typeof v === 'string' ? v.trim() : '');

      const bankNameClean = clean(bankName);
      const accountNumberClean = clean(accountNumber);
      const ifscClean = clean(ifscCode).toUpperCase();
      const phoneClean = clean(phone);
      const panClean = clean(panNumber).toUpperCase();

      if (!bankNameClean) throw new AppError('Bank name is required', 400);
      if (!accountNumberClean) throw new AppError('Bank account number is required', 400);
      if (accountNumberClean.length < 6 || accountNumberClean.length > 30) {
        throw new AppError('Bank account number should be between 6 and 30 digits', 400);
      }
      if (!/^[0-9]+$/.test(accountNumberClean)) {
        throw new AppError('Bank account number must contain only digits', 400);
      }
      if (!ifscClean) throw new AppError('Bank IFSC code is required', 400);
      if (!IFSC_REGEX.test(ifscClean)) {
        throw new AppError('Please enter a valid IFSC code (e.g. HDFC0001234)', 400);
      }
      if (!phoneClean) throw new AppError('Phone number is required', 400);
      if (!/^[0-9]{10}$/.test(phoneClean)) {
        throw new AppError('Please enter a valid 10-digit phone number', 400);
      }
      if (!panClean) throw new AppError('PAN number is required for TDS compliance', 400);
      if (!PAN_REGEX.test(panClean)) {
        throw new AppError('Please enter a valid PAN number (e.g. ABCDE1234F)', 400);
      }

      const account = await PayoutAccount.findOneAndUpdate(
        { userId },
        {
          bankName: bankNameClean,
          accountNumber: accountNumberClean,
          ifscCode: ifscClean,
          phone: phoneClean,
          panNumber: panClean,
          isComplete: true,
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      return ApiResponse.success(res, {
        id: account._id,
        bankName: account.bankName,
        accountNumber: account.accountNumber,
        ifscCode: account.ifscCode,
        phone: account.phone,
        panNumber: account.panNumber,
        isComplete: true,
      }, 'Bank details saved successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /listener/payout/request
   * Submit a payout request against the listener's available earnings.
   */
  static async createRequest(req, res, next) {
    try {
      const userId = req.user.id;
      const { amount } = req.body;

      const parsedAmount = Math.round(Number(amount) * 100) / 100;
      if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new AppError('Please enter a valid payout amount', 400);
      }

      const [account, settings] = await Promise.all([
        PayoutAccount.findOne({ userId }).lean(),
        SystemSettings.getSettings(),
      ]);

      if (!account || !account.isComplete) {
        throw new AppError('Please save your bank details before requesting a payout.', 400);
      }

      const minPayoutAmount = settings.minWithdrawalLimit ?? 500;
      if (parsedAmount < minPayoutAmount) {
        throw new AppError(`Minimum payout request amount is ₹${minPayoutAmount}`, 400);
      }

      const existing = await PayoutRequest.findOne({
        listenerId: userId,
        status: { $in: IN_FLIGHT_STATUSES },
      });
      if (existing) {
        throw new AppError('You already have a payout request under review. Please wait for it to be processed.', 400);
      }

      const totalEarnings = await computeTotalEarnings(userId);
      const inFlightAgg = await PayoutRequest.aggregate([
        { $match: { listenerId: userId, status: { $in: IN_FLIGHT_STATUSES } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      const inFlightAmount = inFlightAgg.length > 0 ? inFlightAgg[0].total : 0;
      const availableForPayout = Math.max(0, totalEarnings - inFlightAmount);

      if (parsedAmount > availableForPayout) {
        throw new AppError(`You can only request up to ₹${availableForPayout.toFixed(2)}`, 400);
      }

      const tdsRate = Math.min(100, Math.max(0, settings.tdsRate ?? 10));
      const tdsAmount = Math.round(parsedAmount * (tdsRate / 100) * 100) / 100;
      const netAmount = Math.round((parsedAmount - tdsAmount) * 100) / 100;

      // SLA snapshot — the credit timeline in effect at request time, so the
      // promise made to the listener stays accurate even if admin changes it later.
      const creditMin = Math.max(1, settings.payoutCreditDaysMin ?? 3);
      const creditMax = Math.max(creditMin, settings.payoutCreditDaysMax ?? 7);

      const request = await PayoutRequest.create({
        listenerId: userId,
        amount: parsedAmount,
        diamonds: Math.floor(parsedAmount / (settings.diamondToInrRatio ?? 1)),
        tdsRate,
        tdsAmount,
        netAmount,
        creditDaysMin: creditMin,
        creditDaysMax: creditMax,
        bankName: account.bankName,
        accountNumber: account.accountNumber,
        bankIfscCode: account.ifscCode,
        phone: account.phone,
        panNumber: account.panNumber,
        paymentDetails: {
          method: 'bank',
          bankAccount: account.accountNumber,
          ifscCode: account.ifscCode,
          accountHolderName: account.bankName,
        },
        status: 'pending',
      });

      // In-app notification so the listener gets immediate confirmation
      try {
        const timelineText = creditMin === creditMax ? `within ${creditMin} days` : `within ${creditMin}–${creditMax} days`;
        await Notification.create({
          recipient: userId,
          title: 'Payout Request Submitted ✅',
          body: `Your payout request of ₹${parsedAmount} has been submitted. Amount will be credited ${timelineText} after approval.`,
          type: 'payment',
          data: { type: 'payout', payoutId: request._id, amount: parsedAmount },
        });
        const PushService = require('../services/pushService');
        await PushService.sendPushNotification(userId.toString(), {
          title: 'Payout Request Submitted ✅',
          body: `Your payout request of ₹${parsedAmount} has been submitted. It will be credited ${timelineText} after approval.`,
          data: { type: 'payout', payoutId: request._id.toString(), amount: parsedAmount, url: '/(listener)/payout' },
        });
      } catch (notifErr) {
        console.error('Failed to send payout submission notification:', notifErr.message);
      }

      return ApiResponse.created(res, {
        _id: request._id,
        amount: request.amount,
        tdsRate: request.tdsRate,
        tdsAmount: request.tdsAmount,
        netAmount: request.netAmount,
        status: request.status,
        createdAt: request.createdAt,
      }, 'Payout request submitted successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /listener/payout/requests
   * Full payout request history for the listener.
   */
  static async getRequests(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const filter = { listenerId: req.user.id };

      const [requests, total] = await Promise.all([
        PayoutRequest.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(parseInt(limit))
          .lean(),
        PayoutRequest.countDocuments(filter),
      ]);

      return ApiResponse.success(res, {
        requests: requests.map((r) => ({
          _id: r._id,
          amount: r.amount,
          status: r.status,
          createdAt: r.createdAt,
          processedAt: r.processedAt || null,
          adminNotes: r.adminNotes || '',
          transactionId: r.transactionId || '',
        })),
        total,
        page: parseInt(page),
        limit: parseInt(limit),
      }, 'Payout requests retrieved');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /listener/payout/notifications
   * Recent payout-related in-app notifications — the same alerts that are
   * pushed to the device during the payout lifecycle (submitted, approved,
   * paid, rejected, on hold, cancelled). Serves as an in-app preview of the
   * push notifications on the Payout screen.
   */
  static async getNotifications(req, res, next) {
    try {
      const { limit = 10 } = req.query;
      const Notification = require('../models/Notification');

      const notifications = await Notification.find({
        recipient: req.user.id,
        type: 'payment',
        'data.type': 'payout',
      })
        .sort({ createdAt: -1 })
        .limit(Math.min(parseInt(limit) || 10, 50))
        .lean();

      return ApiResponse.success(res, {
        notifications: notifications.map((n) => ({
          _id: n._id,
          title: n.title,
          body: n.body,
          isRead: !!n.isRead,
          status: n.data?.status || null,
          payoutId: n.data?.payoutId || null,
          amount: n.data?.amount || null,
          createdAt: n.createdAt,
        })),
      }, 'Payout notifications retrieved');
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /listener/payout/notifications/read-all
   * Marks every payout-related notification as read for the listener.
   * Scoped to payout alerts only — other notification types (chat, gifts,
   * etc.) are left untouched.
   */
  static async markAllNotificationsRead(req, res, next) {
    try {
      const Notification = require('../models/Notification');
      const result = await Notification.updateMany(
        {
          recipient: req.user.id,
          type: 'payment',
          'data.type': 'payout',
          isRead: false,
        },
        { $set: { isRead: true } }
      );

      return ApiResponse.success(res, { updated: result.modifiedCount || 0 }, 'Payout notifications marked as read');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = PayoutController;
