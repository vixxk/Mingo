const User = require('../models/userModel');
const Listener = require('../models/listenerModel');
const Session = require('../models/sessionModel');
const Rating = require('../models/ratingModel');
const ActivityLog = require('../models/ActivityLog');
const MemberReport = require('../models/MemberReport');
const Transaction = require('../models/transactionModel');
const NotificationCampaign = require('../models/NotificationCampaign');
const PayoutRequest = require('../models/PayoutRequest');
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

      // Self-healing database role sync: Set role to 'USER' for any users whose listener application is rejected or pending
      const dirtyListeners = await Listener.find({ status: { $in: ['rejected', 'pending'] } }).select('userId');
      if (dirtyListeners.length > 0) {
        const dirtyUserIds = dirtyListeners.map(l => l.userId).filter(Boolean);
        await User.updateMany(
          { _id: { $in: dirtyUserIds }, role: 'LISTENER' },
          { role: 'USER' }
        );
      }

      // Get all listener user IDs to exclude them from user stats
      const allListenerUserIds = await Listener.find().distinct('userId');

      // Query total counts using join-based aggregations to completely filter out banned users or role mismatches
      const approvedListenersCountPromise = Listener.aggregate([
        { $match: { status: 'approved' } },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        { $match: { 'user.isBanned': false, 'user.role': 'LISTENER' } },
        { $count: 'count' }
      ]).then(resArr => resArr[0]?.count || 0);

      const onlineApprovedListenersCountPromise = Listener.aggregate([
        { $match: { isOnline: true, status: 'approved' } },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        { $match: { 'user.isBanned': false, 'user.role': 'LISTENER' } },
        { $count: 'count' }
      ]).then(resArr => resArr[0]?.count || 0);

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
        User.countDocuments({ role: 'USER', _id: { $nin: allListenerUserIds } }),
        approvedListenersCountPromise,
        Listener.countDocuments({ 
          $or: [
            { status: 'pending' },
            { profileStatus: 'pending' }
          ]
        }),
        onlineApprovedListenersCountPromise,
        Session.countDocuments({ status: 'completed' }),
        MemberReport.countDocuments({ status: 'pending' }),
        User.countDocuments({ role: 'USER', _id: { $nin: allListenerUserIds }, updatedAt: { $gte: today } }),
        Transaction.aggregate([
          { $match: { type: 'purchase', status: 'completed', createdAt: { $gte: today } } },
          { $group: { _id: null, total: { $sum: '$coins' } } }
        ]),
        Session.aggregate([
          { $match: { status: 'completed', createdAt: { $gte: today } } },
          { $group: { _id: null, total: { $sum: '$listenerEarnings' } } }
        ]),
        PayoutRequest.aggregate([
          { $match: { status: 'pending' } }, 
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        PayoutRequest.countDocuments({ status: 'pending' }),
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
            role: 'USER',
            _id: { $nin: allListenerUserIds },
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
      const allListenerUserIds = await Listener.find().distinct('userId');
      const filter = { role: 'USER' };

      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { username: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
        ];
      }

      const io = req.app.get('io');
      const onlineUserIds = [];
      if (io) {
        for (const [roomName, room] of io.sockets.adapter.rooms.entries()) {
          if (roomName.startsWith('user_') && room.size > 0) {
            const userIdStr = roomName.replace('user_', '');
            onlineUserIds.push(userIdStr);
          }
        }
      }

      if (status === 'active') {
        filter._id = { $in: onlineUserIds, $nin: allListenerUserIds };
      } else if (status === 'inactive') {
        const excludeIds = [...new Set([...onlineUserIds.map(id => id.toString()), ...allListenerUserIds.map(id => id.toString())])];
        filter._id = { $nin: excludeIds };
      } else {
        filter._id = { $nin: allListenerUserIds };
      }

      if (status === 'banned') {
        filter.isBanned = true;
      }

      const users = await User.find(filter)
        .select('-__v')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const total = await User.countDocuments(filter);

      const enrichedUsers = await Promise.all(users.map(async (user) => {
        const callCount = await Session.countDocuments({ userId: user._id, status: 'completed' });
        const userRoom = io ? io.sockets.adapter.rooms.get(`user_${user._id.toString()}`) : null;
        const isOnline = !!(userRoom && userRoom.size > 0);

        const seconds = user.totalTimeSpent || 0;
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const formattedTimeSpent = `${hours}h ${minutes}m`;

        return {
          ...user.toObject(),
          totalCalls: callCount,
          isOnline,
          appOpens: user.appOpens || 0,
          totalTimeSpent: formattedTimeSpent
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
        await User.findByIdAndUpdate(listener.userId, { role: 'USER' });
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

      const { sendNotificationToMultiple } = require('../../utils/notifications');
      if (user.isBanned) {
        await Notification.create({
          recipient: user._id,
          title: 'Account Suspended ⚠️',
          body: 'Your account has been suspended by the administrator.',
          type: 'system',
        });
        
        if (user.pushToken) {
          try {
            await sendNotificationToMultiple([user.pushToken], 'Account Suspended ⚠️', 'Your account has been suspended by the administrator.', { type: 'account_ban' });
          } catch (e) {
            console.log('Error sending ban push:', e);
          }
        }
        
        const io = req.app.get('io');
        if (io) {
          io.to(`user_${user._id.toString()}`).emit('account_banned', {
            message: 'Your account has been suspended by the administrator.'
          });
        }
      } else {
        await Notification.create({
          recipient: user._id,
          title: 'Account Restored 🎉',
          body: 'Your account has been unbanned. You can now log back in.',
          type: 'system',
        });
        
        if (user.pushToken) {
          try {
            await sendNotificationToMultiple([user.pushToken], 'Account Restored 🎉', 'Your account has been unbanned. You can now log back in.', { type: 'account_unban' });
          } catch (e) {
            console.log('Error sending unban push:', e);
          }
        }
      }

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
        'audioPayoutRate',
        'videoPayoutRate',
        'chatPayoutRate',
        'maintenanceMode',
        'otpSettings',
        'notifications',
        'activePackagesCount'
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

      if (search) {
        const matchingUsers = await User.find({
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { username: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } }
          ]
        }).select('_id');
        const userIds = matchingUsers.map(u => u._id);
        
        filter.$or = [
          { userId: { $in: userIds } },
          { listenerId: { $in: userIds } }
        ];
      }

      const sessions = await Session.find(filter)
        .populate('userId', 'name username phone avatarIndex gender')
        .populate('listenerId', 'name username phone avatarIndex gender')
        .sort({ startTime: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const total = await Session.countDocuments(filter);

      const Transaction = require('../models/transactionModel');
      const result = await Promise.all(sessions.map(async (s) => {
        const startTime = s.startTime;
        const endTime = s.endTime || new Date();

        let giftsWorth = 0;
        let giftEarnings = 0;
        try {
          const sendGifts = await Transaction.find({
            $or: [
              { 'metadata.sessionId': s._id.toString(), type: 'gift_send' },
              { 'metadata.sessionId': s._id, type: 'gift_send' },
              {
                userId: s.userId?._id,
                type: 'gift_send',
                'metadata.receiverId': s.listenerId?._id,
                createdAt: { $gte: startTime, $lte: endTime }
              }
            ]
          });
          giftsWorth = sendGifts.reduce((acc, tx) => acc + Math.abs(tx.coins || 0), 0);

          const receiveGifts = await Transaction.find({
            $or: [
              { 'metadata.sessionId': s._id.toString(), type: 'gift_receive' },
              { 'metadata.sessionId': s._id, type: 'gift_receive' },
              {
                userId: s.listenerId?._id,
                type: 'gift_receive',
                'metadata.senderId': s.userId?._id,
                createdAt: { $gte: startTime, $lte: endTime }
              }
            ]
          });
          giftEarnings = receiveGifts.reduce((acc, tx) => acc + (tx.amount || 0), 0);

          if (giftEarnings === 0 && giftsWorth > 0) {
            giftEarnings = giftsWorth * 0.70 * 0.25;
          }
        } catch (e) {
          console.error('Error fetching session gift transactions:', e);
        }

        return {
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
          coinsDeducted: s.coinsDeducted || 0, // Coins spent by user
          giftsWorth: giftsWorth, // Gifts worth in coins
          giftEarnings: giftEarnings, // Gift earnings in Rupees (separated!)
          listenerEarnings: s.listenerEarnings || 0, // Pure call/chat earnings (separated!)
          rating: s.rating,
          feedback: s.feedback,
          createdAt: s.createdAt,
        };
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

  static async getExportData(req, res, next) {
    try {
      const { timeline, specificDay, startDate, endDate, types } = req.query;
      const dataTypes = types ? types.split(',') : ['users', 'listeners', 'gifts', 'transactions'];
      
      let dateFilter = {};
      if (startDate && endDate) {
        const start = new Date(startDate);
        start.setHours(0,0,0,0);
        const end = new Date(endDate);
        end.setHours(23,59,59,999);
        dateFilter = { createdAt: { $gte: start, $lte: end } };
      } else if (specificDay) {
        const start = new Date(specificDay);
        start.setHours(0,0,0,0);
        const end = new Date(specificDay);
        end.setHours(23,59,59,999);
        dateFilter = { createdAt: { $gte: start, $lte: end } };
      } else if (timeline && timeline !== 'all') {
        const days = parseInt(timeline) || 7;
        const start = new Date();
        start.setDate(start.getDate() - days);
        start.setHours(0,0,0,0);
        dateFilter = { createdAt: { $gte: start } };
      }

      const results = {};

      if (dataTypes.includes('users')) {
        const filter = { role: 'USER' };
        if (dateFilter.createdAt) filter.createdAt = dateFilter.createdAt;
        results.users = await User.find(filter)
          .select('name username phone email isBanned createdAt')
          .sort({ createdAt: -1 })
          .limit(1000);
      }

      if (dataTypes.includes('listeners')) {
        const filter = { status: 'approved' };
        results.listeners = await Listener.find(filter)
          .populate('userId', 'name username phone email')
          .sort({ createdAt: -1 })
          .limit(1000);
      }

      if (dataTypes.includes('gifts')) {
        const filter = { type: { $in: ['gift_send', 'gift_receive'] } };
        if (dateFilter.createdAt) filter.createdAt = dateFilter.createdAt;
        results.gifts = await Transaction.find(filter)
          .populate('userId', 'name username phone')
          .sort({ createdAt: -1 })
          .limit(1000);
      }

      if (dataTypes.includes('transactions')) {
        const filter = { type: { $in: ['purchase', 'call_debit', 'call_credit', 'signup_bonus', 'refund'] } };
        if (dateFilter.createdAt) filter.createdAt = dateFilter.createdAt;
        results.transactions = await Transaction.find(filter)
          .populate('userId', 'name username phone')
          .sort({ createdAt: -1 })
          .limit(1000);
      }

      return ApiResponse.success(res, results, 'Export data retrieved');
    } catch (e) {
      next(e);
    }
  }

  static async sendAdminMessage(req, res, next) {
    try {
      const { content } = req.body;
      if (!content) {
        throw new AppError('Message content is required', 400);
      }

      const targetUserId = req.params.id;
      const adminId = req.user.id;

      const targetUser = await User.findById(targetUserId);
      if (!targetUser) throw new AppError('User not found', 404);

      // 1. Find or create conversation between Admin and User
      const Conversation = require('../models/conversationModel');
      let conversation = await Conversation.findOne({
        participants: { $all: [adminId, targetUserId] }
      });

      if (!conversation) {
        conversation = await Conversation.create({
          participants: [adminId, targetUserId],
          unreadCount: {},
          freeMessageUsed: {}
        });
      }

      // 2. Create message marked as admin message
      const Message = require('../models/messageModel');
      const message = new Message({
        conversationId: conversation._id,
        sender: adminId,
        senderModel: 'User',
        content,
        type: 'text',
        isAdminMessage: true,
      });
      await message.save();

      // 3. Update conversation lastMessage & unread count atomically
      const targetUserIdStr = targetUserId.toString();
      await Conversation.findByIdAndUpdate(conversation._id, {
        lastMessage: message._id,
        $inc: { [`unreadCount.${targetUserIdStr}`]: 1 }
      });

      // 4. Emit socket events
      const io = req.app.get('io');
      if (io) {
        io.to(conversation._id.toString()).emit('receive_message', message);
        io.to(`user_${targetUserIdStr}`).emit('receive_message', message);
      }

      // 5. Send push notification to target user
      const { sendNotificationToMultiple } = require('../../utils/notifications');
      if (targetUser.pushToken) {
        try {
          await sendNotificationToMultiple(
            [targetUser.pushToken],
            'Support Message 🛡️',
            content,
            { conversationId: conversation._id.toString(), type: 'admin_message' }
          );
        } catch (e) {
          console.log('Error sending admin message push notification:', e);
        }
      }

      // 6. Create activity log
      await ActivityLog.create({
        user: 'Admin',
        action: `Sent a support message to ${targetUser.name}: "${content.substring(0, 40)}${content.length > 40 ? '...' : ''}"`,
        type: 'admin',
        icon: 'chatbubble',
        color: '#A855F7',
      });

      return ApiResponse.success(res, message, 'Message sent successfully by Admin');
    } catch (err) {
      next(err);
    }
  }

  static async updateUserInterests(req, res, next) {
    try {
      const { interests } = req.body;
      if (!Array.isArray(interests)) {
        throw new AppError('Interests must be an array', 400);
      }

      const user = await User.findById(req.params.id);
      if (!user) throw new AppError('User not found', 404);

      user.interests = interests;
      await user.save();

      await ActivityLog.create({
        user: 'Admin',
        action: `Updated interests for user ${user.name}`,
        type: 'admin',
        icon: 'list-circle',
        color: '#8B5CF6',
      });

      return ApiResponse.success(res, { interests: user.interests }, 'Interests updated successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AdminController;
