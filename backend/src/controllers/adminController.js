const User = require('../models/userModel');
const Listener = require('../models/listenerModel');
const Session = require('../models/sessionModel');
const Rating = require('../models/ratingModel');
const ActivityLog = require('../models/ActivityLog');
const MemberReport = require('../models/MemberReport');
const Transaction = require('../models/transactionModel');
const NotificationCampaign = require('../models/NotificationCampaign');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/appError');
const Notification = require('../models/Notification');
const { 
  sendListenerApprovalNotification, 
  sendListenerRejectionNotification, 
  sendProfileUpdateNotification 
} = require('../../utils/notifications');

class AdminController {
  static async getStats(req, res, next) {
    try {
      const { timeline = 7 } = req.query;
      const days = parseInt(timeline) || 7;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        totalUsers,
        totalListeners,
        pendingApprovals,
        activeNow,
        totalCalls,
        pendingReports,
        activeUsersToday,
        coinsPurchasedTodayAgg,
        diamondsGeneratedTodayAgg,
        pendingPayoutAgg,
        pendingPayoutsCount,
        activeChats
      ] = await Promise.all([
        User.countDocuments({ role: 'USER' }),
        Listener.countDocuments(),
        Listener.countDocuments({ 
          $or: [
            { isApproved: false },
            { hasPendingChanges: true }
          ]
        }),
        Listener.countDocuments({ isOnline: true }),
        Session.countDocuments({ status: 'completed' }),
        MemberReport.countDocuments({ status: 'pending' }),
        User.countDocuments({ lastActive: { $gte: today } }),
        Transaction.aggregate([
          { $match: { type: 'purchase', status: 'completed', createdAt: { $gte: today } } },
          { $group: { _id: null, total: { $sum: '$coins' } } }
        ]),
        Session.aggregate([
          { $match: { status: 'completed', createdAt: { $gte: today } } },
          { $group: { _id: null, total: { $sum: '$listenerEarnings' } } }
        ]),
        Session.aggregate([
          { $match: { status: 'pending' } }, 
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Payout.countDocuments({ status: 'pending' }),
        Session.countDocuments({ status: 'active' })
      ]);

      const revenueAgg = await Transaction.aggregate([
        { $match: { type: 'purchase', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].total : 0;
      const coinsPurchasedToday = coinsPurchasedTodayAgg.length > 0 ? coinsPurchasedTodayAgg[0].total : 0;
      const diamondsGeneratedToday = diamondsGeneratedTodayAgg.length > 0 ? diamondsGeneratedTodayAgg[0].total : 0;
      const pendingPayoutAmount = pendingPayoutAgg.length > 0 ? pendingPayoutAgg[0].total : 0;

      // Graph Data
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days + 1);
      startDate.setHours(0, 0, 0, 0);

      const groupByFormat = days > 90 ? "%Y-%m" : "%Y-%m-%d";

      // Helper to fill missing dates with 0
      const fillMissingDates = (data, daysCount, valueField) => {
        const result = [];
        const dateMap = new Map(data.map(i => [i._id, i[valueField]]));
        
        for (let i = daysCount - 1; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          result.push({
            _id: dateStr,
            [valueField]: dateMap.get(dateStr) || 0
          });
        }
        return result;
      };

      const dailyRevenueRaw = await Transaction.aggregate([
        { 
          $match: { 
            type: 'purchase', 
            status: 'completed', 
            createdAt: { $gte: startDate } 
          } 
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            amount: { $sum: "$amount" }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      const dailyRegistrationsRaw = await User.aggregate([
        { 
          $match: { 
            role: { $in: ['USER', 'LISTENER'] },
            createdAt: { $gte: startDate } 
          } 
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      const dailyRevenue = fillMissingDates(dailyRevenueRaw, days, 'amount');
      const dailyRegistrations = fillMissingDates(dailyRegistrationsRaw, days, 'count');

      return ApiResponse.success(res, {
        totalUsers,
        totalListeners,
        pendingApprovals,
        pendingReports,
        pendingPayoutsCount,
        activeNow, // Online Listeners
        totalCalls,
        totalRevenue,
        activeUsersToday,
        coinsPurchasedToday,
        diamondsGeneratedToday,
        pendingPayoutAmount,
        activeChats,
        charts: {
          dailyRevenue,
          dailyRegistrations
        }
      }, 'Admin stats retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async getUsers(req, res, next) {
    try {
      const { search, status, page = 1, limit = 50 } = req.query;
      const filter = { role: 'USER' };

      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { username: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
        ];
      }
      if (status === 'banned') filter.isBanned = true;
      if (status === 'active') filter.isBanned = false;

      const users = await User.find(filter)
        .select('-__v')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const total = await User.countDocuments(filter);

      const enrichedUsers = await Promise.all(users.map(async (user) => {
        const callCount = await Session.countDocuments({ userId: user._id, status: 'completed' });
        return {
          ...user.toObject(),
          totalCalls: callCount,
        };
      }));

      return ApiResponse.success(res, { users: enrichedUsers, total, page: parseInt(page), limit: parseInt(limit) }, 'Users retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async getListeners(req, res, next) {
    try {
      const { status, search, page = 1, limit = 50 } = req.query;
      const filter = {};

      if (status && status !== 'all') filter.status = status;
      
      let listeners = await Listener.find(filter)
        .populate('userId', 'name username phone gender avatarIndex isBanned')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      if (search) {
        listeners = listeners.filter(l => 
          l.userId?.name?.toLowerCase().includes(search.toLowerCase()) ||
          l.userId?.phone?.includes(search)
        );
      }

      const total = await Listener.countDocuments(filter);

      const result = listeners.map(l => ({
        id: l._id,
        userId: l.userId?._id,
        name: l.userId?.name || l.displayName,
        phone: l.userId?.phone,
        status: l.status,
        verified: l.verified,
        bestChoice: l.bestChoice,
        totalCalls: l.totalSessions,
        earnings: `₹${l.earnings.toLocaleString()}`,
        rating: l.rating,
        isBanned: l.userId?.isBanned || false,
        avatarIndex: l.userId?.avatarIndex || 0,
        gender: l.userId?.gender,
        isOnline: l.isOnline,
        introVideoUrl: l.introVideoUrl,
        audioCalls: l.audioCalls || 0,
        videoCalls: l.videoCalls || 0,
      }));

      return ApiResponse.success(res, { listeners: result, total, page: parseInt(page), limit: parseInt(limit) }, 'Listeners retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async approveListener(req, res, next) {
    try {
      const listener = await Listener.findById(req.params.id);
      if (!listener) throw new AppError('Listener not found', 404);

      listener.status = 'approved';
      await listener.save();

      if (listener.userId) {
        const user = await User.findByIdAndUpdate(listener.userId, { role: 'LISTENER' });
        if (user && user.pushToken) {
          await sendListenerApprovalNotification(user.pushToken);
          await Notification.create({
            recipient: user._id,
            title: 'Congratulations! 🎉',
            body: 'Your listener application has been approved. You can now start taking calls!',
            type: 'system',
          });
        }
      }

      await ActivityLog.create({
        user: 'Admin',
        action: `Approved listener ${listener.displayName || 'unknown'}`,
        type: 'admin',
        icon: 'checkmark-circle',
        color: '#10B981',
      });

      return ApiResponse.success(res, listener, 'Listener approved');
    } catch (err) {
      next(err);
    }
  }

  static async rejectListener(req, res, next) {
    try {
      const listener = await Listener.findById(req.params.id);
      if (!listener) throw new AppError('Listener not found', 404);

      listener.status = 'rejected';
      await listener.save();

      if (listener.userId) {
        const user = await User.findById(listener.userId);
        if (user && user.pushToken) {
          const reason = req.body.reason || 'Your listener application was not approved at this time.';
          await sendListenerRejectionNotification(user.pushToken, reason);
          await Notification.create({
            recipient: user._id,
            title: 'Application Update ⚠️',
            body: reason,
            type: 'system',
          });
        }
      }

      await ActivityLog.create({
        user: 'Admin',
        action: `Rejected listener application`,
        type: 'admin',
        icon: 'close-circle',
        color: '#EF4444',
      });

      return ApiResponse.success(res, listener, 'Listener rejected');
    } catch (err) {
      next(err);
    }
  }

  static async toggleBanUser(req, res, next) {
    try {
      const user = await User.findById(req.params.id);
      if (!user) throw new AppError('User not found', 404);

      user.isBanned = !user.isBanned;
      await user.save();

      await ActivityLog.create({
        user: 'Admin',
        action: `${user.isBanned ? 'Banned' : 'Unbanned'} user ${user.name}`,
        type: 'admin',
        icon: user.isBanned ? 'ban' : 'checkmark',
        color: user.isBanned ? '#EF4444' : '#10B981',
      });

      return ApiResponse.success(res, { isBanned: user.isBanned }, `User ${user.isBanned ? 'banned' : 'unbanned'}`);
    } catch (err) {
      next(err);
    }
  }

  static async deleteUser(req, res, next) {
    try {
      const user = await User.findByIdAndDelete(req.params.id);
      if (!user) throw new AppError('User not found', 404);

      // Optionally clean up listener profile if they have one
      await Listener.findOneAndDelete({ userId: user._id });

      await ActivityLog.create({
        user: 'Admin',
        action: `Deleted user ${user.name} permanently`,
        type: 'admin',
        icon: 'trash',
        color: '#EF4444',
      });

      return ApiResponse.success(res, null, 'User deleted permanently');
    } catch (err) {
      next(err);
    }
  }

  static async toggleBestChoice(req, res, next) {
    try {
      const listener = await Listener.findById(req.params.id);
      if (!listener) throw new AppError('Listener not found', 404);

      listener.bestChoice = !listener.bestChoice;
      await listener.save();

      return ApiResponse.success(res, { bestChoice: listener.bestChoice }, `Best choice ${listener.bestChoice ? 'enabled' : 'disabled'}`);
    } catch (err) {
      next(err);
    }
  }

  static async toggleVerified(req, res, next) {
    try {
      const listener = await Listener.findById(req.params.id);
      if (!listener) throw new AppError('Listener not found', 404);

      listener.verified = !listener.verified;
      await listener.save();

      return ApiResponse.success(res, { verified: listener.verified }, `Verification ${listener.verified ? 'granted' : 'revoked'}`);
    } catch (err) {
      next(err);
    }
  }

  static async getActivities(req, res, next) {
    try {
      const { limit = 20, page = 1 } = req.query;
      const activities = await ActivityLog.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const total = await ActivityLog.countDocuments();

      return ApiResponse.success(res, { activities, total }, 'Activities retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async getReports(req, res, next) {
    try {
      const { status = 'pending', page = 1, limit = 20 } = req.query;
      const filter = {};
      if (status !== 'all') filter.status = status;

      const reports = await MemberReport.find(filter)
        .populate('reporter', 'name username phone')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const total = await MemberReport.countDocuments(filter);

      return ApiResponse.success(res, { reports, total }, 'Reports retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async updateReport(req, res, next) {
    try {
      const { status, adminNotes } = req.body;
      const report = await MemberReport.findByIdAndUpdate(
        req.params.id,
        { status, adminNotes },
        { new: true }
      );
      if (!report) throw new AppError('Report not found', 404);

      return ApiResponse.success(res, report, 'Report updated');
    } catch (err) {
      next(err);
    }
  }

  static async getBannedMembers(req, res, next) {
    try {
      const bannedUsers = await User.find({ isBanned: true })
        .select('name username phone role gender avatarIndex isBanned createdAt')
        .sort({ updatedAt: -1 });

      return ApiResponse.success(res, bannedUsers, 'Banned members retrieved');
    } catch (err) {
      next(err);
    }
  }

  // Wallet & Coins Management
  static async getCoinPackages(req, res, next) {
    try {
      const SystemSettings = require('../models/SystemSettings');
      const settings = await SystemSettings.getSettings();
      return ApiResponse.success(res, settings.coinPricing, 'Coin packages retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async updateCoinPackages(req, res, next) {
    try {
      const SystemSettings = require('../models/SystemSettings');
      const { packages } = req.body;
      const settings = await SystemSettings.getSettings();
      settings.coinPricing = packages;
      await settings.save();
      return ApiResponse.success(res, settings.coinPricing, 'Coin packages updated');
    } catch (err) {
      next(err);
    }
  }

  // Payout Management
  static async getPayouts(req, res, next) {
    try {
      const PayoutRequest = require('../models/PayoutRequest');
      const { status, page = 1, limit = 20 } = req.query;
      const filter = {};
      if (status && status !== 'all') filter.status = status;

      const payouts = await PayoutRequest.find(filter)
        .populate('listenerId', 'name username phone')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const total = await PayoutRequest.countDocuments(filter);

      return ApiResponse.success(res, { payouts, total, page: parseInt(page), limit: parseInt(limit) }, 'Payouts retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async updatePayoutStatus(req, res, next) {
    try {
      const PayoutRequest = require('../models/PayoutRequest');
      const { status, adminNotes, transactionId } = req.body;
      const payout = await PayoutRequest.findById(req.params.id);
      if (!payout) throw new AppError('Payout request not found', 404);

      payout.status = status;
      if (adminNotes) payout.adminNotes = adminNotes;
      if (transactionId) payout.transactionId = transactionId;
      if (status === 'paid' || status === 'approved' || status === 'rejected') {
        payout.processedAt = new Date();
      }

      await payout.save();

      await ActivityLog.create({
        user: 'Admin',
        action: `Updated payout status to ${status} for request ${payout._id}`,
        type: 'admin',
        icon: 'cash',
        color: status === 'paid' ? '#10B981' : '#F59E0B',
      });

      return ApiResponse.success(res, payout, 'Payout status updated');
    } catch (err) {
      next(err);
    }
  }

  // System Settings
  static async getSettings(req, res, next) {
    try {
      const SystemSettings = require('../models/SystemSettings');
      const settings = await SystemSettings.getSettings();
      return ApiResponse.success(res, settings, 'System settings retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async updateSettings(req, res, next) {
    try {
      const SystemSettings = require('../models/SystemSettings');
      const settings = await SystemSettings.getSettings();
      
      const allowedUpdates = [
        'coinToDiamondRatio', 
        'diamondToInrRatio', 
        'commissionPercentage', 
        'minWithdrawalLimit', 
        'maintenanceMode',
        'otpSettings',
        'notifications'
      ];

      allowedUpdates.forEach(key => {
        if (req.body[key] !== undefined) {
          settings[key] = req.body[key];
        }
      });

      await settings.save();
      return ApiResponse.success(res, settings, 'System settings updated');
    } catch (err) {
      next(err);
    }
  }

  static async sendPushNotification(req, res, next) {
    try {
      const { target, userIds, title, body, notificationMethod = 'both' } = req.body;
      if (!title || !body) {
        throw new AppError('Title and body are required', 400);
      }

      const Notification = require('../models/Notification');
      const { sendNotificationToMultiple } = require('../../utils/notifications');
      let filter = {};

      if (target === 'users') {
        filter = { role: 'USER' };
      } else if (target === 'listeners') {
        filter = { role: 'LISTENER' };
      } else if (target === 'specific' && Array.isArray(userIds)) {
        filter = { _id: { $in: userIds } };
      } else if (target === 'all') {
        filter = {}; // Everyone
      } else {
        throw new AppError('Invalid target for notification', 400);
      }

      // We need to fetch users to get their IDs and tokens
      const users = await User.find(filter).select('_id pushToken');
      
      // Filter tokens only for those who have it
      const tokens = users.filter(u => u.pushToken).map(u => u.pushToken);

      // Send Push via FCM
      if ((notificationMethod === 'push' || notificationMethod === 'both') && tokens.length > 0) {
        await sendNotificationToMultiple(tokens, title, body, { type: 'admin_broadcast' });
      }

      // Save to Platform DB
      if (notificationMethod === 'platform' || notificationMethod === 'both') {
        const notifications = users.map(u => ({
          recipient: u._id,
          title,
          body,
          type: 'admin',
        }));
        await Notification.insertMany(notifications);
      }

      // Create Campaign Record
      await NotificationCampaign.create({
        title,
        body,
        target,
        method: notificationMethod,
        sentToCount: users.length,
      });

      await ActivityLog.create({
        user: 'Admin',
        action: `Sent ${notificationMethod} notification: "${title}" to ${target}`,
        type: 'admin',
        icon: 'notifications',
        color: '#3B82F6',
      });

      return ApiResponse.success(res, { usersCount: users.length, tokensCount: tokens.length }, 'Notification sent successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getCampaigns(req, res, next) {
    try {
      const campaigns = await NotificationCampaign.find()
        .sort({ createdAt: -1 })
        .limit(50);
      
      return ApiResponse.success(res, campaigns, 'Campaigns retrieved');
    } catch (err) {
      next(err);
    }
  }

  // ─── Profile Approval Management ───────────────────────────

  /**
   * GET /admin/profile-approvals
   * Returns listeners who have submitted profile changes for approval.
   */
  static async getProfileApprovals(req, res, next) {
    try {
      const { status = 'pending', page = 1, limit = 50 } = req.query;
      const filter = {};

      if (status === 'pending') {
        filter.profileStatus = 'pending';
      } else if (status !== 'all') {
        filter.profileStatus = status;
      }

      const listeners = await Listener.find(filter)
        .populate('userId', 'name username phone gender avatarIndex isBanned')
        .sort({ profileSubmittedAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const total = await Listener.countDocuments(filter);

      const result = listeners.map((l) => ({
        id: l._id,
        userId: l.userId?._id,
        name: l.userId?.name || l.displayName,
        displayName: l.displayName,
        phone: l.userId?.phone,
        gender: l.userId?.gender,
        avatarIndex: l.userId?.avatarIndex || 0,
        rating: l.rating,
        verified: l.verified,
        profileStatus: l.profileStatus,
        profileSubmittedAt: l.profileSubmittedAt,
        profileAdminNotes: l.profileAdminNotes,
        currentProfile: l.publicProfile,
        draftProfile: l.draftProfile,
        introVideoUrl: l.introVideoUrl,
        gradientColors: l.gradientColors,
      }));

      return ApiResponse.success(res, {
        approvals: result,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
      }, 'Profile approvals retrieved');
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /admin/profile-approvals/:id/approve
   * Approves the draft profile and copies it to publicProfile.
   */
  static async approveProfileChanges(req, res, next) {
    try {
      const listener = await Listener.findById(req.params.id);
      if (!listener) throw new AppError('Listener not found', 404);

      if (!listener.draftProfile) {
        throw new AppError('No draft profile to approve', 400);
      }

      // Copy draft to public profile
      listener.publicProfile = { ...listener.draftProfile.toObject() };
      listener.profileStatus = 'approved';
      listener.profileAdminNotes = '';
      listener.draftProfile = null;
      await listener.save();

      // Send notification to listener
      if (listener.userId) {
        const user = await User.findById(listener.userId);
        if (user && user.pushToken) {
          await sendProfileUpdateNotification(user.pushToken, true);
          await Notification.create({
            recipient: user._id,
            title: 'Profile Updated! ✅',
            body: 'Your profile changes have been approved and are now live.',
            type: 'system',
          });
        }
      }

      await ActivityLog.create({
        user: 'Admin',
        action: `Approved profile changes for ${listener.displayName || 'listener'}`,
        type: 'admin',
        icon: 'checkmark-circle',
        color: '#10B981',
      });

      return ApiResponse.success(res, listener, 'Profile changes approved and live');
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /admin/profile-approvals/:id/reject
   * Rejects the draft profile with optional admin notes.
   */
  static async rejectProfileChanges(req, res, next) {
    try {
      const { adminNotes } = req.body;
      const listener = await Listener.findById(req.params.id);
      if (!listener) throw new AppError('Listener not found', 404);

      listener.profileStatus = 'rejected';
      listener.profileAdminNotes = adminNotes || 'Your profile changes did not meet our guidelines.';
      // Keep draft so listener can edit and resubmit
      await listener.save();

      // Send notification to listener
      if (listener.userId) {
        const user = await User.findById(listener.userId);
        if (user && user.pushToken) {
          await sendProfileUpdateNotification(user.pushToken, false);
          await Notification.create({
            recipient: user._id,
            title: 'Profile Update Rejected ❌',
            body: listener.profileAdminNotes,
            type: 'system',
          });
        }
      }

      await ActivityLog.create({
        user: 'Admin',
        action: `Rejected profile changes for ${listener.displayName || 'listener'}`,
        type: 'admin',
        icon: 'close-circle',
        color: '#EF4444',
      });

      return ApiResponse.success(res, listener, 'Profile changes rejected');
    } catch (err) {
      next(err);
    }
  }

  // ─── Sessions Management ──────────────────────────────────
  /**
   * GET /admin/sessions
   * Returns paginated call sessions with user/listener details.
   */
  static async getSessions(req, res, next) {
    try {
      const { status, callType, search, page = 1, limit = 30 } = req.query;
      const filter = {};

      if (status && status !== 'all') filter.status = status;
      if (callType && callType !== 'all') filter.callType = callType;

      const sessions = await Session.find(filter)
        .populate('userId', 'name username phone avatarIndex gender')
        .populate('listenerId', 'name username phone avatarIndex gender')
        .sort({ startTime: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const total = await Session.countDocuments(filter);

      const result = sessions.map(s => ({
        id: s._id,
        userId: s.userId?._id,
        userName: s.userId?.name || 'Unknown',
        userPhone: s.userId?.phone,
        listenerId: s.listenerId?._id,
        listenerName: s.listenerId?.name || 'Unknown',
        listenerPhone: s.listenerId?.phone,
        callType: s.callType,
        status: s.status,
        roomId: s.roomId,
        startTime: s.startTime,
        endTime: s.endTime,
        duration: s.duration,
        coinsDeducted: s.coinsDeducted,
        listenerEarnings: s.listenerEarnings,
        platformProfit: s.platformProfit,
        rating: s.rating,
        feedback: s.feedback,
        createdAt: s.createdAt,
      }));

      return ApiResponse.success(res, {
        sessions: result,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
      }, 'Sessions retrieved');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /admin/ratings
   * Returns paginated ratings with user and listener details.
   */
  static async getRatings(req, res, next) {
    try {
      const { page = 1, limit = 30, minRating, maxRating } = req.query;
      const filter = {};

      if (minRating) filter.rating = { ...filter.rating, $gte: parseInt(minRating) };
      if (maxRating) filter.rating = { ...filter.rating, $lte: parseInt(maxRating) };

      const ratings = await Rating.find(filter)
        .populate('userId', 'name username phone')
        .populate('listenerId', 'name username phone')
        .populate('sessionId', 'callType duration coinsDeducted startTime')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const total = await Rating.countDocuments(filter);

      const result = ratings.map(r => ({
        id: r._id,
        userId: r.userId?._id,
        userName: r.userId?.name || 'Unknown',
        listenerId: r.listenerId?._id,
        listenerName: r.listenerId?.name || 'Unknown',
        rating: r.rating,
        feedback: r.feedback,
        callType: r.sessionId?.callType,
        callDuration: r.sessionId?.duration,
        coinsDeducted: r.sessionId?.coinsDeducted,
        sessionStart: r.sessionId?.startTime,
        createdAt: r.createdAt,
      }));

      return ApiResponse.success(res, {
        ratings: result,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
      }, 'Ratings retrieved');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AdminController;
