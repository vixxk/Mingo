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
const { calculateAge } = require('../utils/ageHelper');
const Notification = require('../models/Notification');
const Conversation = require('../models/conversationModel');
const Message = require('../models/messageModel');
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

      // Calculate the start date based on timeline for period-appropriate metrics
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days + 1);
      startDate.setHours(0, 0, 0, 0);

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

      // Get active user and listener IDs for the period (must be resolved before Promise.all)
      const activeUserIdsForPeriod = await Session.distinct('userId', {
        status: 'completed',
        createdAt: { $gte: startDate }
      });
      const activeListenerIdsForPeriod = await Session.distinct('listenerId', {
        status: 'completed',
        createdAt: { $gte: startDate }
      });

      const [
        totalUsers,
        totalListeners,
        activeNow,
        totalCalls,
        pendingReports,
        activeUsersPeriod,
        activeListenersPeriod,
        coinsPurchasedPeriodAgg,
        diamondsGeneratedPeriodAgg,
        payoutStatusAgg,
        activeChats,
        pendingUsersCount,
        pendingListenersCount
      ] = await Promise.all([
        User.countDocuments({ role: 'USER', _id: { $nin: allListenerUserIds } }),
        approvedListenersCountPromise,
        onlineApprovedListenersCountPromise,
        Session.countDocuments({ status: 'completed' }),
        MemberReport.countDocuments({ status: 'pending' }),
        User.countDocuments({
          role: 'USER',
          _id: { $nin: allListenerUserIds, $in: activeUserIdsForPeriod }
        }),
        // Count distinct listeners who had completed sessions in the period
        Listener.countDocuments({
          status: 'approved',
          userId: { $in: activeListenerIdsForPeriod }
        }),
        Transaction.aggregate([
          { $match: { type: 'purchase', status: 'completed', createdAt: { $gte: startDate } } },
          { $group: { _id: null, total: { $sum: '$coins' } } }
        ]),
        Session.aggregate([
          { $match: { status: 'completed', createdAt: { $gte: startDate } } },
          { $group: { _id: null, total: { $sum: '$listenerEarnings' } } }
        ]),
        PayoutRequest.aggregate([
          { $group: { _id: '$status', total: { $sum: '$amount' }, count: { $sum: 1 } } }
        ]),
        Session.countDocuments({ callType: 'chat' }),
        Listener.countDocuments({ status: 'pending' }),
        Listener.countDocuments({ status: 'approved', profileStatus: 'pending' })
      ]);

      const pendingApprovals = pendingUsersCount + pendingListenersCount;

      // Payout summary — amount + count grouped by status
      const payoutByStatus = {};
      for (const row of payoutStatusAgg) {
        payoutByStatus[row._id] = { amount: row.total || 0, count: row.count || 0 };
      }
      const statusAmount = (key) => payoutByStatus[key]?.amount || 0;
      const statusCount = (key) => payoutByStatus[key]?.count || 0;
      const pendingPayoutAmount = statusAmount('pending');
      const pendingPayoutsCount = statusCount('pending');

      const revenueAgg = await Transaction.aggregate([
        { $match: { type: 'purchase', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$coins' } } },
      ]);
      const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].total : 0;
      const coinsPurchasedPeriod = coinsPurchasedPeriodAgg.length > 0 ? coinsPurchasedPeriodAgg[0].total : 0;
      const diamondsGeneratedPeriod = diamondsGeneratedPeriodAgg.length > 0 ? diamondsGeneratedPeriodAgg[0].total : 0;

      // Gift-specific stats
      const [
        totalGiftsSentCount,
        totalGiftsCoinsAgg,
        giftSendersTodayAgg,
        uniqueGiftSendersAgg
      ] = await Promise.all([
        Transaction.countDocuments({ type: 'gift_send', status: 'completed' }),
        Transaction.aggregate([
          { $match: { type: 'gift_send', status: 'completed' } },
          { $group: { _id: null, total: { $sum: { $abs: '$coins' } } } }
        ]),        Transaction.aggregate([
          { $match: { type: 'gift_send', status: 'completed', createdAt: { $gte: startDate } } },
          { $group: { _id: '$userId' } },
          { $count: 'count' }
        ]),
        Transaction.aggregate([
          { $match: { type: 'gift_send', status: 'completed' } },
          { $group: { _id: '$userId' } },
          { $count: 'count' }
        ])
      ]);
      const totalGiftsSent = totalGiftsSentCount || 0;
      const totalGiftCoinsSpent = totalGiftsCoinsAgg.length > 0 ? totalGiftsCoinsAgg[0].total : 0;
      const giftSendersPeriod = giftSendersTodayAgg.length > 0 ? giftSendersTodayAgg[0].count : 0;
      const uniqueGiftSenders = uniqueGiftSendersAgg.length > 0 ? uniqueGiftSendersAgg[0].count : 0;

      // Graph Data - use a separate variable to avoid mutating startDate
      const graphStartDate = new Date(startDate);

      const groupByFormat = days >= 90 ? "%Y-%m" : "%Y-%m-%d";

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
            createdAt: { $gte: graphStartDate } 
          } 
        },
        {
          $group: {
            _id: { $dateToString: { format: groupByFormat, date: "$createdAt" } },
            amount: { $sum: "$coins" }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      const dailyRegistrationsRaw = await User.aggregate([
        { 
          $match: { 
            role: 'USER',
            _id: { $nin: allListenerUserIds },
            createdAt: { $gte: graphStartDate } 
          } 
        },
        {
          $group: {
            _id: { $dateToString: { format: groupByFormat, date: "$createdAt" } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      const dailyApprovedListenersRaw = await Listener.aggregate([
        {
          $match: {
            status: 'approved',
            createdAt: { $gte: graphStartDate }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: groupByFormat, date: "$createdAt" } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      const dailyGiftsRaw = await Transaction.aggregate([
        { $match: { type: 'gift_send', status: 'completed', createdAt: { $gte: graphStartDate } } },
        { $project: { absCoins: { $abs: "$coins" }, date: "$createdAt" } },
        { $group: { _id: { $dateToString: { format: groupByFormat, date: "$date" } }, amount: { $sum: "$absCoins" } } },
        { $sort: { _id: 1 } }
      ]);

      let dailyRevenue, dailyRegistrations, dailyApprovedListeners, dailyGifts;

      // For monthly grouping, fill missing months instead of days
      if (days >= 90) {
        const fillMissingMonths = (data, monthsCount, valueField) => {
          const result = [];
          const dataMap = new Map(data.map(i => [i._id, i[valueField]]));
          
          for (let i = monthsCount - 1; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const monthStr = d.toISOString().slice(0, 7); // YYYY-MM
            result.push({
              _id: monthStr,
              [valueField]: dataMap.get(monthStr) || 0
            });
          }
          return result;
        };
        const months = Math.ceil(days / 30);
        dailyRevenue = fillMissingMonths(dailyRevenueRaw, months, 'amount');
        dailyRegistrations = fillMissingMonths(dailyRegistrationsRaw, months, 'count');
        dailyApprovedListeners = fillMissingMonths(dailyApprovedListenersRaw, months, 'count');
        dailyGifts = fillMissingMonths(dailyGiftsRaw, months, 'amount');
      } else {
        dailyRevenue = fillMissingDates(dailyRevenueRaw, days, 'amount');
        dailyRegistrations = fillMissingDates(dailyRegistrationsRaw, days, 'count');
        dailyApprovedListeners = fillMissingDates(dailyApprovedListenersRaw, days, 'count');
        dailyGifts = fillMissingDates(dailyGiftsRaw, days, 'amount');
      }

      // All-time peak computations
      const allTimePeakRevenueAgg = await Transaction.aggregate([
        { $match: { type: 'purchase', status: 'completed' } },
        { $project: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, coins: '$coins' } },
        { $group: { _id: '$date', dailyAmount: { $sum: '$coins' } } },
        { $sort: { dailyAmount: -1 } },
        { $limit: 1 },
      ]);
      const allTimePeakRevenue = allTimePeakRevenueAgg.length > 0 ? allTimePeakRevenueAgg[0].dailyAmount : 0;

      const allTimePeakSignupsAgg = await User.aggregate([
        { $match: { role: 'USER', isDeleted: { $ne: true } } },
        { $project: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } } },
        { $group: { _id: '$date', dailyCount: { $sum: 1 } } },
        { $sort: { dailyCount: -1 } },
        { $limit: 1 },
      ]);
      const allTimePeakSignups = allTimePeakSignupsAgg.length > 0 ? allTimePeakSignupsAgg[0].dailyCount : 0;

      return ApiResponse.success(res, {
        totalUsers,
        totalListeners,
        pendingApprovals,
        pendingReports,
        pendingPayoutsCount,
        activeNow, // Online Listeners
        totalCalls,
        totalRevenue,
        activeUsersPeriod,
        activeListenersPeriod,
        coinsPurchasedPeriod,
        diamondsGeneratedPeriod,
        pendingPayoutAmount,
        payoutSummary: {
          pending: { count: statusCount('pending'), amount: statusAmount('pending') },
          approved: { count: statusCount('approved'), amount: statusAmount('approved') },
          on_hold: { count: statusCount('on_hold'), amount: statusAmount('on_hold') },
          paid: { count: statusCount('paid'), amount: statusAmount('paid') },
          rejected: { count: statusCount('rejected'), amount: statusAmount('rejected') },
          cancelled: { count: statusCount('cancelled'), amount: statusAmount('cancelled') },
        },
        activeChats,
        pendingUsers: pendingUsersCount,
        pendingListeners: pendingListenersCount,
        totalGiftsSent,
        totalGiftCoinsSpent,
        giftSendersPeriod,
        uniqueGiftSenders,
        timeline: days,
        periodLabel: `${days}d`,
        charts: {
          dailyRevenue,
          dailyRegistrations,
          dailyApprovedListeners,
          dailyGifts
        },
        allTimePeakRevenue,
        allTimePeakSignups,
      }, 'Admin stats retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async getUsers(req, res, next) {
    try {
      const { search, status, startDate, endDate, page = 1, limit = 50 } = req.query;
      const filter = { role: 'USER' };

      // Period filter — day-precision; endDate covers the whole day.
      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate + 'T23:59:59.999');
      }

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

      if (status === 'online' || status === 'live') {
        filter._id = { $in: onlineUserIds };
        filter.isDeleted = { $ne: true };
      } else if (status === 'offline') {
        filter._id = { $nin: onlineUserIds };
        filter.isDeleted = { $ne: true };
        filter.isBanned = { $ne: true };
      } else if (status === 'deleted') {
        filter.isDeleted = true;
      }
      // 'all' — show all users, no exclusions

      const users = await User.find(filter)
        .select('-__v')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const total = await User.countDocuments(filter);

      // Status tab counts are scoped to the same period + search filters as the
      // list — not global totals — so the badges stay meaningful.
      const countsFilter = { role: 'USER' };
      if (search) countsFilter.$or = filter.$or;
      if (startDate || endDate) countsFilter.createdAt = filter.createdAt;
      const countsUsers = await User.find(countsFilter).select('_id isDeleted isBanned');
      const onlineSet = new Set(onlineUserIds);
      const counts = { all: countsUsers.length, online: 0, offline: 0, deleted: 0 };
      for (const u of countsUsers) {
        if (u.isDeleted) {
          counts.deleted += 1;
        } else if (onlineSet.has(u._id.toString())) {
          counts.online += 1;
        } else if (!u.isBanned) {
          counts.offline += 1;
        }
      }

      const enrichedUsers = await Promise.all(users.map(async (user) => {
        const callCount = await Session.countDocuments({ userId: user._id, status: 'completed' });
        const userRoom = io ? io.sockets.adapter.rooms.get(`user_${user._id.toString()}`) : null;
        const isOnline = !!(userRoom && userRoom.size > 0);

        const seconds = user.totalTimeSpent || 0;
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const formattedTimeSpent = `${hours}h ${minutes}m`;

        return {
          id: user._id,
          ...user.toObject(),
          totalCalls: callCount,
          isOnline,
          appOpens: user.appOpens || 0,
          totalTimeSpent: formattedTimeSpent,
          dob: user.dob,
          age: calculateAge(user.dob)
        };
      }));

      return ApiResponse.success(res, { users: enrichedUsers, total, counts, page: parseInt(page), limit: parseInt(limit) }, 'Users retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async getListeners(req, res, next) {
    try {
      const { status, search, startDate, endDate, page = 1, limit = 50 } = req.query;
      const filter = {};

      if (status && status !== 'all') filter.status = status;

      // Period filter — day-precision; endDate covers the whole day.
      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate + 'T23:59:59.999');
      }

      let listeners = await Listener.find(filter)
        .populate('userId', 'name username phone gender dob avatarIndex isBanned isDeleted deletionReason')
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

      // Status tab counts are scoped to the same period + search filters as the
      // list — not global totals — so the badges stay meaningful. Mirrors the
      // frontend's tab logic (online/pending/approved/verified/bestChoice
      // exclude banned+deleted; rejected and deleted don't).
      const countsFilter = {};
      if (startDate || endDate) countsFilter.createdAt = filter.createdAt;
      const countsQuery = Listener.find(countsFilter)
        .populate('userId', 'isBanned isDeleted');
      if (search) {
        const matchingUsers = await User.find({
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { username: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
          ],
        }).select('_id');
        const matchingIds = matchingUsers.map(u => u._id);
        countsQuery.where('userId').in(matchingIds);
      }
      const countsListeners = await countsQuery;
      const counts = { all: 0, online: 0, pending: 0, approved: 0, verified: 0, bestChoice: 0, rejected: 0, deleted: 0 };
      for (const l of countsListeners) {
        const isBanned = l.userId?.isBanned || false;
        const isDeleted = l.userId?.isDeleted || false;
        counts.all += 1;
        if (isDeleted) counts.deleted += 1;
        if (isDeleted || isBanned) continue;
        if (l.isOnline) counts.online += 1;
        if (l.status === 'pending') counts.pending += 1;
        if (l.status === 'approved') counts.approved += 1;
        if (l.verified) counts.verified += 1;
        if (l.bestChoice) counts.bestChoice += 1;
        if (l.status === 'rejected') counts.rejected += 1;
      }

      const result = listeners.map(l => ({
        id: l._id,
        userId: l.userId?._id,
        name: l.userId?.name || l.displayName,
        phone: l.userId?.phone,
        status: l.status,
        isVerified: l.verified,
        isBestChoice: l.bestChoice,
        totalCalls: l.totalSessions,
        earnings: l.earnings,
        avgRating: l.rating,
        isBanned: l.userId?.isBanned || false,
        avatarIndex: l.userId?.avatarIndex || 0,
        gender: l.userId?.gender,
        dob: l.userId?.dob,
        age: calculateAge(l.userId?.dob),
        isOnline: l.isOnline,
        introAudioUrl: l.introAudioUrl,
        audioCalls: l.audioCalls || 0,
        videoCalls: l.videoCalls || 0,
        isDeleted: l.userId?.isDeleted || false,
        deletionReason: l.userId?.deletionReason || '',
        createdAt: l.createdAt,
      }));

      return ApiResponse.success(res, { listeners: result, total, counts, page: parseInt(page), limit: parseInt(limit) }, 'Listeners retrieved');
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

  static async getListenerDetail(req, res, next) {
    try {
      const listener = await Listener.findById(req.params.id)
        .populate('userId', 'name username phone email gender avatarIndex isBanned isDeleted deletionReason language coins interests createdAt lastActive')
        .lean();

      if (!listener) throw new AppError('Listener not found', 404);

      const user = listener.userId || {};
      const detail = {
        id: listener._id,
        userId: user._id,
        name: user.name || listener.displayName,
        phone: user.phone,
        email: user.email,
        gender: user.gender,
        age: user.age || null,
        language: user.language || 'English',
        coins: user.coins || 0,
        interests: user.interests || [],
        status: listener.status,
        isVerified: listener.verified,
        isBestChoice: listener.bestChoice,
        bio: listener.bio,
        skills: (listener.publicProfile?.expertiseTags || []),
        avgRating: listener.rating,
        totalSessions: listener.totalSessions,
        totalEarnings: listener.earnings,
        isOnline: listener.isOnline,
        isBusy: listener.isBusy,
        isBanned: user.isBanned || false,
        isDeleted: user.isDeleted || false,
        deletionReason: user.deletionReason || '',
        avatarIndex: user.avatarIndex || 0,
        introAudioUrl: listener.introAudioUrl,
        audioCalls: listener.audioCalls || 0,
        videoCalls: listener.videoCalls || 0,
        totalChats: listener.totalChats || 0,
        audioEnabled: listener.audioEnabled,
        videoEnabled: listener.videoEnabled,
        chatEnabled: listener.chatEnabled,
        createdAt: listener.createdAt,
        lastActive: user.lastActive || listener.updatedAt,
        joinedDate: listener.createdAt,
        profileImage: listener.profileImage,
      };

      return ApiResponse.success(res, detail, 'Listener detail retrieved');
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /admin/listeners/:id/docs/upload-url
   * Generate a presigned S3 upload URL for a listener document (any file type/size).
   */
  static async getListenerDocUploadUrl(req, res, next) {
    try {
      const listener = await Listener.findById(req.params.id);
      if (!listener) throw new AppError('Listener not found', 404);

      const { fileName, fileType } = req.body;
      if (!fileName || !fileType) {
        throw new AppError('fileName and fileType are required', 400);
      }

      const { generateUploadUrl } = require('../utils/s3');
      const extension = (fileName.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/gi, '');
      const { uploadUrl, fileUrl, key } = await generateUploadUrl(fileType, extension || 'bin', 'listener_documents');

      return ApiResponse.success(res, { uploadUrl, fileUrl, key }, 'Upload URL generated');
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /admin/listeners/:id/docs
   * Store metadata for an uploaded listener document.
   */
  static async addListenerDoc(req, res, next) {
    try {
      const listener = await Listener.findById(req.params.id);
      if (!listener) throw new AppError('Listener not found', 404);

      const { fileName, fileUrl, fileType, size } = req.body;
      if (!fileName || !fileUrl) {
        throw new AppError('fileName and fileUrl are required', 400);
      }

      listener.documents = listener.documents || [];
      listener.documents.push({
        fileName,
        fileUrl,
        fileType: fileType || 'application/octet-stream',
        size: Number(size) || 0,
        uploadedBy: req.user?.name || 'Admin',
        uploadedAt: new Date(),
      });

      await listener.save();

      const doc = listener.documents[listener.documents.length - 1];
      return ApiResponse.success(res, doc, 'Document added');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /admin/listeners/:id/docs
   * List all documents uploaded for a listener.
   */
  static async getListenerDocs(req, res, next) {
    try {
      const listener = await Listener.findById(req.params.id);
      if (!listener) throw new AppError('Listener not found', 404);

      const docs = (listener.documents || []).slice().sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
      return ApiResponse.success(res, { documents: docs }, 'Documents retrieved');
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /admin/listeners/:id/docs/:docId
   * Remove a document from the listener (also deletes the S3 object).
   */
  static async deleteListenerDoc(req, res, next) {
    try {
      const listener = await Listener.findById(req.params.id);
      if (!listener) throw new AppError('Listener not found', 404);

      const docIndex = (listener.documents || []).findIndex(d => String(d._id) === req.params.docId);
      if (docIndex === -1) throw new AppError('Document not found', 404);

      const doc = listener.documents[docIndex];
      listener.documents.splice(docIndex, 1);
      await listener.save();

      try {
        const { extractKeyFromUrl, deleteObject } = require('../utils/s3');
        const key = extractKeyFromUrl(doc.fileUrl);
        if (key) await deleteObject(key);
      } catch (e) {
        console.error('Failed to delete S3 object for listener doc:', e.message);
      }

      return ApiResponse.success(res, null, 'Document deleted');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /admin/listeners/:id/payouts
   * Payout request history for a listener (resolves the profile id to the
   * underlying user id used as listenerId on PayoutRequest).
   */
  static async getListenerPayouts(req, res, next) {
    try {
      const listener = await Listener.findById(req.params.id).select('userId displayName');
      if (!listener) throw new AppError('Listener not found', 404);

      const PayoutRequest = require('../models/PayoutRequest');
      const payouts = await PayoutRequest.find({ listenerId: listener.userId })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      const rows = payouts.map((p) => ({
        _id: p._id,
        amount: p.amount || 0,
        tdsRate: p.tdsRate || 0,
        tdsAmount: p.tdsAmount || 0,
        netAmount: p.netAmount || 0,
        status: p.status || 'pending',
        createdAt: p.createdAt,
        processedAt: p.processedAt || null,
        transactionId: p.transactionId || '',
        adminNotes: p.adminNotes || '',
      }));

      let totalPaid = 0;
      let pending = 0;
      let pendingAmount = 0;
      for (const r of rows) {
        if (r.status === 'paid') totalPaid += r.netAmount || r.amount;
        if (r.status === 'pending') {
          pending += 1;
          pendingAmount += r.amount;
        }
      }

      return ApiResponse.success(res, {
        payouts: rows,
        summary: { count: rows.length, totalPaid, pending, pendingAmount },
      }, 'Listener payouts retrieved');
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

      return ApiResponse.success(res, { isBestChoice: listener.bestChoice }, `Best choice ${listener.bestChoice ? 'enabled' : 'disabled'}`);
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

      return ApiResponse.success(res, { isVerified: listener.verified }, `Verification ${listener.verified ? 'granted' : 'revoked'}`);
    } catch (err) {
      next(err);
    }
  }

  static async getActivities(req, res, next) {
    try {
      const { limit = 20, page = 1 } = req.query;
      let activities = await ActivityLog.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      activities = activities.map(a => {
        const obj = a.toObject();
        obj.performedBy = obj.user;
        return obj;
      });

      const total = await ActivityLog.countDocuments();

      return ApiResponse.success(res, { activities, total }, 'Activities retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async getReports(req, res, next) {
    try {
      const { status = 'all', reportType, role, reporterRole, startDate, endDate, page = 1, limit = 20 } = req.query;
      const filter = {};
      if (status !== 'all') filter.status = status;
      if (reportType && reportType !== 'all') filter.reportType = reportType;
      const targetRole = role || reporterRole;
      if (targetRole && targetRole !== 'all') {
        filter.reporterRole = targetRole.toLowerCase();
      }

      // Period filter — day-precision; endDate covers the whole day. Reports
      // are matched on their createdAt, mirroring the other admin filters.
      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate + 'T23:59:59.999');
      }

      let reports = await MemberReport.find(filter)
        .populate('reporter', 'name username phone')
        .populate('reportedUser', 'name username phone')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    reports = reports.map(r => ({
        ...r.toObject(),
        reporterName: r.reporter?.name || 'Unknown',
        reporterPhone: r.reporter?.phone || null,
        reporterId: r.reporter?._id?.toString() || null,
        reportedName: r.reportedUser?.name || 'Unknown',
        reportedPhone: r.reportedUser?.phone || null,
        reportedId: r.reportedUser?._id?.toString() || null,
        reason: r.category || 'other',
        description: r.message || '',
        reportType: r.reportType || 'general',
    }));

      const total = await MemberReport.countDocuments(filter);

      // Status tab counts are scoped to the same period (and reportType) as
      // the list — not global totals — so the badges stay meaningful.
      const countsFilter = { ...filter };
      delete countsFilter.status;
      const [pendingCount, resolvedCount, dismissedCount, totalAll] = await Promise.all([
        MemberReport.countDocuments({ ...countsFilter, status: 'pending' }),
        MemberReport.countDocuments({ ...countsFilter, status: 'resolved' }),
        MemberReport.countDocuments({ ...countsFilter, status: 'dismissed' }),
        MemberReport.countDocuments(countsFilter),
      ]);

      return ApiResponse.success(res, {
        reports,
        total,
        totalAll,
        counts: { pending: pendingCount, resolved: resolvedCount, dismissed: dismissedCount }
      }, 'Reports retrieved');
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
        { new: true, runValidators: true }
      );
      if (!report) throw new AppError('Report not found', 404);

      return ApiResponse.success(res, report, 'Report updated');
    } catch (err) {
      next(err);
    }
  }

  static async getBannedMembers(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      const filter = { isBanned: true };

      // Period filter — day-precision; endDate covers the whole day. Matched on
      // updatedAt, which is updated when the ban is applied (the list already
      // sorts by updatedAt as the closest thing to a "banned at" timestamp).
      if (startDate || endDate) {
        filter.updatedAt = {};
        if (startDate) filter.updatedAt.$gte = new Date(startDate);
        if (endDate) filter.updatedAt.$lte = new Date(endDate + 'T23:59:59.999');
      }

      const bannedUsers = await User.find(filter)
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

  static async addCoinPackage(req, res, next) {
    try {
      const SystemSettings = require('../models/SystemSettings');
      const settings = await SystemSettings.getSettings();
      const packages = settings.coinPricing || [];
      const maxId = packages.reduce((max, p) => Math.max(max, parseInt(p.id) || 0), 0);
      const newPkg = {
        id: String(maxId + 1),
        coins: req.body.coins,
        price: req.body.price,
        originalPrice: req.body.originalPrice,
        discount: req.body.discount,
        tag: req.body.tag,
        subTag: req.body.subTag,
        isPopular: req.body.isPopular || false,
      };
      Object.keys(newPkg).forEach(k => newPkg[k] === undefined && delete newPkg[k]);
      settings.coinPricing.push(newPkg);
      await settings.save();
      const saved = settings.coinPricing[settings.coinPricing.length - 1];
      return ApiResponse.success(res, saved, 'Coin package added');
    } catch (err) {
      next(err);
    }
  }

  static async updateCoinPackage(req, res, next) {
    try {
      const SystemSettings = require('../models/SystemSettings');
      const settings = await SystemSettings.getSettings();
      const index = (settings.coinPricing || []).findIndex(p => String(p._id) === req.params.id);
      if (index === -1) {
        throw new AppError('Coin package not found', 404);
      }
      const allowed = ['coins', 'price', 'originalPrice', 'discount', 'tag', 'subTag', 'isPopular'];
      allowed.forEach(field => {
        if (req.body[field] !== undefined) {
          settings.coinPricing[index][field] = req.body[field];
        }
      });
      await settings.save();
      return ApiResponse.success(res, settings.coinPricing[index], 'Coin package updated');
    } catch (err) {
      next(err);
    }
  }

  static async deleteCoinPackage(req, res, next) {
    try {
      const SystemSettings = require('../models/SystemSettings');
      const settings = await SystemSettings.getSettings();
      const index = (settings.coinPricing || []).findIndex(p => String(p._id) === req.params.id);
      if (index === -1) {
        throw new AppError('Coin package not found', 404);
      }
      settings.coinPricing.splice(index, 1);
      await settings.save();
      return ApiResponse.success(res, null, 'Coin package deleted');
    } catch (err) {
      next(err);
    }
  }

  static async resetCoinPackages(req, res, next) {
    try {
      const SystemSettings = require('../models/SystemSettings');
      const defaults = [
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
      const settings = await SystemSettings.getSettings();
      settings.coinPricing = defaults;
      settings.activePackagesCount = 12;
      await settings.save();
      return ApiResponse.success(res, defaults, 'Coin packages reset to defaults');
    } catch (err) {
      next(err);
    }
  }

  // Payout Management
  static async getPayouts(req, res, next) {
    try {
      const PayoutRequest = require('../models/PayoutRequest');
      const { status, search, startDate, endDate, page = 1, limit = 20 } = req.query;
      const filter = {};
      if (status && status !== 'all') filter.status = status;

      // Period filter — day-precision; endDate covers the whole day.
      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate + 'T23:59:59.999');
      }

      // Search — scope to the listener's name / phone (matches what the
      // frontend previously did in memory, now done server-side so the counts
      // below stay consistent with the list).
      let listenerMatch = null;
      if (search) {
        const matchingUsers = await User.find({
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { username: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
          ],
        }).select('_id');
        listenerMatch = { listenerId: { $in: matchingUsers.map(u => u._id) } };
        filter.listenerId = listenerMatch.listenerId;
      }

      const payouts = await PayoutRequest.find(filter)
        .populate('listenerId', 'name username phone')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      // Flatten listener info + bank details for the admin UI
      const enrichedPayouts = payouts.map((p) => {
        const obj = p.toObject ? p.toObject() : { ...p };
        return {
          ...obj,
          listenerName: p.listenerId?.name || 'Unknown',
          listenerPhone: p.listenerId?.phone || '',
          upiId: p.paymentDetails?.upiId || '',
          bankAccount: p.paymentDetails?.bankAccount || p.accountNumber || '',
          ifscCode: p.paymentDetails?.ifscCode || p.bankIfscCode || '',
        };
      });

      const total = await PayoutRequest.countDocuments(filter);

      // Status tab counts are scoped to the same period + search filters as the
      // list — not global totals — so the badges stay meaningful.
      const countsFilter = { ...filter };
      delete countsFilter.status;
      const [pendingCount, approvedCount, onHoldCount, paidCount, rejectedCount, cancelledCount] = await Promise.all([
        PayoutRequest.countDocuments({ ...countsFilter, status: 'pending' }),
        PayoutRequest.countDocuments({ ...countsFilter, status: 'approved' }),
        PayoutRequest.countDocuments({ ...countsFilter, status: 'on_hold' }),
        PayoutRequest.countDocuments({ ...countsFilter, status: 'paid' }),
        PayoutRequest.countDocuments({ ...countsFilter, status: 'rejected' }),
        PayoutRequest.countDocuments({ ...countsFilter, status: 'cancelled' }),
      ]);

      return ApiResponse.success(res, {
        payouts: enrichedPayouts,
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
        counts: {
          pending: pendingCount,
          approved: approvedCount,
          on_hold: onHoldCount,
          paid: paidCount,
          rejected: rejectedCount,
          cancelled: cancelledCount,
        },
        page: parseInt(page),
        limit: parseInt(limit),
      }, 'Payouts retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async updatePayoutStatus(req, res, next) {
    try {
      const PayoutRequest = require('../models/PayoutRequest');
      let { status, adminNotes, transactionId } = req.body;
      const payout = await PayoutRequest.findById(req.params.id);
      if (!payout) throw new AppError('Payout request not found', 404);

      if (status === 'reject') status = 'rejected';
      if (status === 'approve') status = 'approved';
      if (status === 'hold') status = 'on_hold';
      if (status === 'cancel') status = 'cancelled';

      if (status === 'rejected' && (!adminNotes || !adminNotes.trim())) {
        throw new AppError('Admin notes are required when rejecting a payout request', 400);
      }

      payout.status = status;
      if (adminNotes) payout.adminNotes = adminNotes;
      if (transactionId) payout.transactionId = transactionId;
      if (status === 'paid' || status === 'approved' || status === 'rejected' || status === 'cancelled') {
        payout.processedAt = new Date();
      }

      await payout.save();

      await ActivityLog.create({
        user: 'Admin',
        action: `Updated payout status to ${status} for request ${payout._id}`,
        type: 'admin',
        icon: 'cash',
        color: status === 'paid' ? '#10B981' : status === 'rejected' ? '#EF4444' : '#F59E0B',
      });

      // Notify the listener about the payout status change
      try {
        const Notification = require('../models/Notification');
        const PushService = require('../services/pushService');
        const SystemSettings = require('../models/SystemSettings');
        const settings = await SystemSettings.getSettings();
        const creditMin = Math.max(1, settings.payoutCreditDaysMin ?? 3);
        const creditMax = Math.max(creditMin, settings.payoutCreditDaysMax ?? 7);
        const timelineText = creditMin === creditMax ? `within ${creditMin} days` : `within ${creditMin}–${creditMax} days`;
        let title, body;
        const grossStr = `₹${payout.amount}`;
        const netStr = payout.netAmount != null && payout.netAmount > 0 ? `₹${payout.netAmount}` : grossStr;
        const tdsNote = payout.tdsAmount > 0 ? ` (after ${payout.tdsRate || 0}% TDS)` : '';

        switch (status) {
          case 'paid':
            title = 'Payout Credited 🎉';
            body = `Your payout of ${netStr}${tdsNote} has been credited. Thanks for being part of Mingo!`;
            break;
          case 'approved':
            title = 'Payout Approved ✅';
            body = `Your payout request of ${grossStr} has been approved. ${netStr}${tdsNote} will be credited ${timelineText}.`;
            break;
          case 'rejected':
            title = 'Payout Rejected ⚠️';
            body = `Your payout request of ${grossStr} was not approved${adminNotes ? `: ${adminNotes}` : '. Please contact support for more details.'}`;
            break;
          case 'cancelled':
            title = 'Payout Cancelled';
            body = `Your payout request of ${grossStr} was cancelled. The amount is available again for withdrawal.`;
            break;
          case 'on_hold':
            title = 'Payout On Hold ⏳';
            body = `Your payout request of ${grossStr} is on hold${adminNotes ? `: ${adminNotes}` : '. Our team is reviewing it.'}`;
            break;
          default:
            title = null;
        }

        if (title) {
          await Notification.create({
            recipient: payout.listenerId,
            title,
            body,
            type: 'payment',
            data: { type: 'payout', payoutId: payout._id, status, amount: payout.amount },
          });
          await PushService.sendPushNotification(payout.listenerId.toString(), {
            title,
            body,
            data: { type: 'payout', payoutId: payout._id.toString(), status, amount: payout.amount, url: '/(listener)/payout' },
          });
        }
      } catch (notifErr) {
        console.error('Failed to send payout status notification:', notifErr.message);
      }

      return ApiResponse.success(res, payout, 'Payout status updated');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /admin/payouts/export
   * Returns all payout requests (respecting the same filters as the Payouts
   * list) flattened into reconciliation-friendly rows for CSV export.
   */
  static async getPayoutsExport(req, res, next) {
    try {
      const PayoutRequest = require('../models/PayoutRequest');
      const { status, search, startDate, endDate } = req.query;
      const filter = {};
      if (status && status !== 'all') filter.status = status;

      // Period filter — day-precision; endDate covers the whole day.
      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate + 'T23:59:59.999');
      }

      // Search — scope to the listener's name / phone (mirrors getPayouts).
      if (search) {
        const matchingUsers = await User.find({
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { username: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
          ],
        }).select('_id');
        filter.listenerId = { $in: matchingUsers.map((u) => u._id) };
      }

      const payouts = await PayoutRequest.find(filter)
        .populate('listenerId', 'name username phone')
        .sort({ createdAt: -1 })
        .limit(5000);

      const rows = payouts.map((p) => ({
        requestId: p._id.toString(),
        listenerName: p.listenerId?.name || 'Unknown',
        listenerPhone: p.listenerId?.phone || '',
        amount: p.amount || 0,
        tdsRate: p.tdsRate || 0,
        tdsAmount: p.tdsAmount || 0,
        netAmount: p.netAmount || 0,
        creditDaysMin: p.creditDaysMin || 3,
        creditDaysMax: p.creditDaysMax || 7,
        diamonds: p.diamonds || 0,
        bankName: p.bankName || '',
        accountNumber: p.accountNumber || p.paymentDetails?.bankAccount || '',
        ifscCode: p.bankIfscCode || p.paymentDetails?.ifscCode || '',
        phone: p.phone || '',
        panNumber: p.panNumber || '',
        status: p.status || '',
        createdAt: p.createdAt,
        processedAt: p.processedAt || null,
        transactionId: p.transactionId || '',
        adminNotes: p.adminNotes || '',
      }));

      return ApiResponse.success(res, { payouts: rows, total: rows.length }, 'Payouts export data retrieved');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /admin/badges
   * Lightweight counts for sidebar/nav badges (pending payouts, approvals,
   * reports). Kept intentionally cheap — simple countDocuments only.
   */
  static async getBadgeCounts(req, res, next) {
    try {
      const PayoutRequest = require('../models/PayoutRequest');
      const Listener = require('../models/listenerModel');
      const MemberReport = require('../models/MemberReport');
      const [pendingPayouts, pendingApprovals, pendingReports] = await Promise.all([
        PayoutRequest.countDocuments({ status: 'pending' }),
        Listener.countDocuments({ status: 'approved', profileStatus: 'pending' }),
        MemberReport.countDocuments({ status: 'pending' }),
      ]);
      return ApiResponse.success(res, { pendingPayouts, pendingApprovals, pendingReports }, 'Badge counts retrieved');
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

      const numericFields = ['coinToDiamondRatio', 'diamondToInrRatio', 'commissionPercentage', 'minWithdrawalLimit', 'tdsRate', 'payoutCreditDaysMin', 'payoutCreditDaysMax', 'audioPayoutRate', 'videoPayoutRate', 'chatPayoutRate', 'activePackagesCount'];
      const booleanFields = ['maintenanceMode'];

      // TDS rate must stay within 0–100%
      if (req.body.tdsRate !== undefined) {
        const val = Number(req.body.tdsRate);
        if (isNaN(val) || val < 0 || val > 100) {
          throw new AppError('tdsRate must be between 0 and 100', 400);
        }
      }

      // Payout credit timeline: both bounds >= 1 and min <= max
      if (req.body.payoutCreditDaysMin !== undefined || req.body.payoutCreditDaysMax !== undefined) {
        const min = req.body.payoutCreditDaysMin !== undefined
          ? Number(req.body.payoutCreditDaysMin)
          : (settings.payoutCreditDaysMin ?? 3);
        const max = req.body.payoutCreditDaysMax !== undefined
          ? Number(req.body.payoutCreditDaysMax)
          : (settings.payoutCreditDaysMax ?? 7);
        if (isNaN(min) || isNaN(max) || min < 1 || max < 1) {
          throw new AppError('Payout credit days must be at least 1', 400);
        }
        if (min > max) {
          throw new AppError('Minimum credit days cannot be greater than maximum credit days', 400);
        }
      }

      let hasChanges = false;

      numericFields.forEach(key => {
        if (req.body[key] !== undefined) {
          const val = Number(req.body[key]);
          if (isNaN(val) || val < 0) {
            throw new AppError(`${key} must be a non-negative number`, 400);
          }
          settings[key] = val;
          hasChanges = true;
        }
      });

      booleanFields.forEach(key => {
        if (req.body[key] !== undefined) {
          settings[key] = Boolean(req.body[key]);
          hasChanges = true;
        }
      });

      // Ad slider interval must be greater than 1 second
      if (req.body.sliderInterval !== undefined) {
        const val = Number(req.body.sliderInterval);
        if (isNaN(val) || val < 2 || val > 30) {
          throw new AppError('sliderInterval must be greater than 1 (between 2 and 30 seconds)', 400);
        }
        settings.sliderInterval = val;
        hasChanges = true;
      }

      if (req.body.otpSettings !== undefined) {
        settings.otpSettings = req.body.otpSettings;
        hasChanges = true;
      }

      if (req.body.notifications !== undefined) {
        settings.notifications = req.body.notifications;
        hasChanges = true;
      }

      if (req.body.customRingtoneUrl !== undefined) {
        settings.customRingtoneUrl = String(req.body.customRingtoneUrl || '').trim();
        hasChanges = true;
      }

      if (hasChanges) {
        await settings.save();
      }
      return ApiResponse.success(res, settings, 'System settings updated');
    } catch (err) {
      next(err);
    }
  }

  static async getRingtoneUploadUrl(req, res, next) {
    try {
      const { fileName, fileType } = req.body;
      const { generateUploadUrl } = require('../utils/s3');
      const ext = fileName ? fileName.split('.').pop() : 'mp3';
      const { uploadUrl, fileUrl } = await generateUploadUrl(fileType || 'audio/mpeg', ext, 'ringtones');
      return ApiResponse.success(res, { uploadUrl, fileUrl }, 'Ringtone upload URL generated');
    } catch (err) {
      next(err);
    }
  }

  static async sendPushNotification(req, res, next) {
    try {
      const { target: requestedTarget, userIds, title, body, notificationMethod: requestedMethod = 'both' } = req.body;
      if (!title || !body) {
        throw new AppError('Title and body are required', 400);
      }

      const notificationMethod = requestedMethod === 'in-app' ? 'platform' : requestedMethod;
      console.log(`[Admin Push Campaign] Starting campaign: "${title}" target=${requestedTarget} method=${notificationMethod}`);

      const Notification = require('../models/Notification');
      let filter = {};

      if (requestedTarget === 'users') {
        filter = { role: 'USER' };
      } else if (requestedTarget === 'listeners') {
        filter = { role: 'LISTENER' };
      } else if (requestedTarget === 'specific' && Array.isArray(userIds)) {
        filter = { _id: { $in: userIds } };
      } else if (requestedTarget === 'all' || requestedTarget === 'everyone') {
        filter = { role: { $in: ['USER', 'LISTENER'] } };
      } else {
        throw new AppError('Invalid target for notification', 400);
      }

      const users = await User.find({
        ...filter,
        isDeleted: { $ne: true },
      }).select('_id pushToken');
      console.log(`[Admin Push Campaign] Target audience count: ${users.length}`);

      if (users.length === 0) {
        throw new AppError(`No ${requestedTarget} found to send notification to`, 404);
      }

      let pushResult = null;

      if (notificationMethod === 'push' || notificationMethod === 'both') {
        try {
          const PushService = require('../services/pushService');
          pushResult = await PushService.sendPushToMultiple(
            users.map(user => user._id.toString()),
            {
              title,
              body,
              data: { type: 'admin_broadcast', title, body }
            }
          );
          console.log('[Admin Push Campaign] Push dispatch result:', JSON.stringify(pushResult));
        } catch (pushErr) {
          console.error('[Admin Push Campaign] Error dispatching push notifications:', pushErr.message);
        }
      }

      if (notificationMethod === 'platform' || notificationMethod === 'both') {
        try {
          const notifications = users.map(u => ({
            recipient: u._id,
            title,
            body,
            type: 'admin',
          }));

          if (notifications.length > 0) {
            await Notification.insertMany(notifications);
            console.log(`[Admin Push Campaign] Inserted ${notifications.length} platform notification records.`);
          }
        } catch (dbErr) {
          console.error('[Admin Push Campaign] Error inserting platform notifications to database:', dbErr.message);
        }
      }

      const campaignRecord = await NotificationCampaign.create({
        title,
        body,
        target: requestedTarget === 'everyone' ? 'all' : requestedTarget,
        method: notificationMethod,
        sentToCount: users.length,
        sentCount: users.filter(u => u.pushToken).length,
      });
      console.log(`[Admin Push Campaign] Created campaign history record ID: ${campaignRecord._id}`);

      await ActivityLog.create({
        user: 'Admin',
        action: `Sent ${notificationMethod} campaign notification: "${title}" to ${requestedTarget}`,
        type: 'admin',
        icon: 'notifications',
        color: '#A855F7',
      });

      return ApiResponse.success(res, {
        usersCount: users.length,
        tokensCount: pushResult?.tokensTargeted || 0,
        sentCount: pushResult?.sentCount || 0,
        failedCount: pushResult?.failedCount || 0,
        campaignId: campaignRecord._id,
        pushResult: pushResult?.results || null,
      }, 'Push campaign dispatched and saved successfully');
    } catch (err) {
      console.error('[Admin Push Campaign] Critical error in campaign dispatch:', err.message);
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
        // For pending: compare previousProfile vs draftProfile (the requested changes)
        currentProfile: l.previousProfile || l.publicProfile,
        requestedProfile: l.draftProfile,
        profileChangeHistory: (l.profileChangeHistory || []).map(h => ({
          previousProfile: h.previousProfile,
          requestedProfile: h.requestedProfile,
          status: h.status,
          adminNotes: h.adminNotes,
          submittedAt: h.submittedAt,
          reviewedAt: h.reviewedAt,
        })),
        introAudioUrl: l.introAudioUrl,
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

      // Record in history before overwriting
      listener.profileChangeHistory.push({
        previousProfile: listener.previousProfile || listener.publicProfile,
        requestedProfile: { ...listener.draftProfile.toObject() },
        status: 'approved',
        adminNotes: '',
        submittedAt: listener.profileSubmittedAt,
        reviewedAt: new Date(),
      });

      // Copy draft to public profile
      listener.publicProfile = { ...listener.draftProfile.toObject() };
      listener.profileStatus = 'approved';
      listener.profileAdminNotes = '';
      // Keep draftProfile and previousProfile for accurate diff display in admin UI
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

      // Record in history
      listener.profileChangeHistory.push({
        previousProfile: listener.previousProfile || listener.publicProfile,
        requestedProfile: listener.draftProfile ? { ...listener.draftProfile.toObject() } : null,
        status: 'rejected',
        adminNotes: adminNotes || 'Your profile changes did not meet our guidelines.',
        submittedAt: listener.profileSubmittedAt,
        reviewedAt: new Date(),
      });

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
      const { status, callType, search, startDate, endDate, page = 1, limit = 30 } = req.query;
      const filter = {};

      if (status && status !== 'all') filter.status = status;
      if (callType && callType !== 'all') filter.callType = callType;

      // Period filter — day-precision; endDate covers the whole day. Sessions
      // are matched on their startTime, mirroring the chat log date filter.
      if (startDate || endDate) {
        filter.startTime = {};
        if (startDate) filter.startTime.$gte = new Date(startDate);
        if (endDate) filter.startTime.$lte = new Date(endDate + 'T23:59:59.999');
      }

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

      // Status tab counts are scoped to the same callType + period (and search)
      // filters as the list — not global totals — so the badges stay meaningful.
      const countsFilter = { ...filter };
      delete countsFilter.status;
      const [activeCount, completedCount, cancelledCount] = await Promise.all([
        Session.countDocuments({ ...countsFilter, status: 'active' }),
        Session.countDocuments({ ...countsFilter, status: 'completed' }),
        Session.countDocuments({ ...countsFilter, status: 'cancelled' }),
      ]);

      const result = await Promise.all(sessions.map(async (s) => {
        const startTime = s.startTime;
        const endTime = s.endTime || new Date();

        let giftsWorth = 0;
        let giftEarnings = 0;
        let sendGifts = [];
        try {
          sendGifts = await Transaction.find({
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

        const isCallerDeleted = !s.userId;
        const isListenerDeleted = !s.listenerId;

        // Build gifts array for frontend display from already-fetched sendGifts
        const gifts = sendGifts.map(tx => {
          const giftData = tx.metadata?.gift || {};
          return {
            name: giftData.name || 'Gift',
            price: Math.abs(tx.coins || 0),
            quantity: giftData.quantity || 1,
          };
        });

        return {
          id: s._id,
          userId: s.userId?._id,
          callerName: s.userId?.name || (isCallerDeleted ? 'Deleted Caller' : 'Unknown'),
          userName: s.userId?.name || (isCallerDeleted ? 'Deleted Caller' : 'Unknown'),
          userPhone: s.userId?.phone,
          isCallerDeleted,
          listenerId: s.listenerId?._id,
          listenerName: s.listenerId?.name || (isListenerDeleted ? 'Deleted Listener' : 'Unknown'),
          listenerPhone: s.listenerId?.phone,
          isListenerDeleted,
          type: s.callType,
          callType: s.callType,
          initialCallType: s.initialCallType || s.callType,
          isConverted: !!s.isConverted,
          convertedAt: s.convertedAt,
          audioDuration: s.audioDuration || 0,
          videoDuration: s.videoDuration || 0,
          audioCoinsDeducted: s.audioCoinsDeducted || 0,
          videoCoinsDeducted: s.videoCoinsDeducted || 0,
          status: s.status,
          roomId: s.roomId,
          startTime: s.startTime,
          endTime: s.endTime,
          duration: s.duration,
          coinsSpent: s.coinsDeducted || 0,
          gifts,
          earnings: {
            call: s.listenerEarnings || 0,
            gift: giftEarnings || 0,
          },
          rating: s.rating ? { stars: s.rating, feedback: s.feedback } : null,
          createdAt: s.createdAt,
        };
      }));

      return ApiResponse.success(res, {
        sessions: result,
        total,
        counts: { active: activeCount, completed: completedCount, cancelled: cancelledCount },
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

      let targetUser = await User.findById(targetUserId);
      if (!targetUser) {
        // If not found in users, check if it's a listener ID and resolve to userId
        const listener = await Listener.findById(targetUserId).select('userId');
        if (listener && listener.userId) {
          targetUser = await User.findById(listener.userId);
        }
      }
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

      // 5. Trigger SSE unread-count update so the mobile badge reflects the new message
      try {
        const sseService = require('../services/sseService');
        sseService.notifyUser(targetUserIdStr);
      } catch (sseErr) {
        console.error('SSE notification error in sendAdminMessage:', sseErr);
      }

      // 6. Send push notification to target user (OneSignal first, then Expo/FCM fallback)
      const PushService = require('../services/pushService');
      try {
        const pushResult = await PushService.sendPushNotification(targetUserId.toString(), {
          title: 'Support Message 🛡️',
          body: content,
          data: {
            conversationId: conversation._id.toString(),
            type: 'admin_message',
          },
        });
        console.log(`[Admin Message] Push notification result for user ${targetUserIdStr}:`, JSON.stringify(pushResult));
      } catch (e) {
        console.log('Error sending admin message push notification:', e);
      }

      // 7. Create activity log
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

  /**
   * GET /admin/chat-logs
   * Returns chat logs with ONE CARD PER CHAT SESSION — each paid chat session
   * gets its own card and its own scoped message thread, mirroring how the
   * mobile app presents conversations. Conversations that never had a session
   * (free-chat phase / Mingo Support threads) get a single "sessionless" card.
   *
   * Pass `sessionId` (the card's `id`) to get a single card with its full
   * message thread for the detail page. Cards are paginated AFTER expansion,
   * so `total` / "load more" reflect actual cards, not conversations.
   */
  static async getChatLogs(req, res, next) {
    try {
      const { conversationId, sessionId, search, userId, listenerId, startDate, endDate, status, page = 1, limit = 50 } = req.query;
      const filter = {};
      const and = [];

      if (conversationId) {
        filter._id = conversationId;
      }

      // Name / username / phone search — only return conversations that include
      // a matching participant.
      if (search) {
        const matchingUsers = await User.find({
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { username: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
          ],
        }).select('_id');
        const matchingIds = matchingUsers.map(u => u._id);
        if (matchingIds.length === 0) {
          return ApiResponse.success(res, {
            conversations: [],
            total: 0,
            page: parseInt(page),
            limit: parseInt(limit),
          }, 'Chat logs retrieved');
        }
        and.push({ participants: { $in: matchingIds } });
      }

      // Participant filters — use $all when both sides are specified so only
      // conversations containing BOTH participants are matched.
      if (userId && listenerId) {
        and.push({ participants: { $all: [userId, listenerId] } });
      } else if (userId) {
        and.push({ participants: { $in: [userId] } });
      } else if (listenerId) {
        and.push({ participants: { $in: [listenerId] } });
      }

      if (and.length > 0) {
        filter.$and = and;
      }

      // Conversations are expanded into per-session cards, so pagination is
      // applied to the CARDS at the end (chat-log volume is small enough that
      // expanding in memory is fine). The date filter is applied per card.
      const conversations = await Conversation.find(filter)
        .populate('participants', 'name username avatarIndex gender role')
        .sort({ updatedAt: -1 });

      // Date filter — startDate/endDate are day-precision; endDate covers the
      // whole day. Applied to each session's startTime (and to the fallback
      // card's conversation creation time).
      const startMs = startDate ? new Date(startDate).getTime() : null;
      const endMs = endDate ? new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1 : null;

      const cards = [];

      for (const conv of conversations) {
        const populatedParticipants = (conv.participants || []).filter(Boolean);
        const participantIds = populatedParticipants.map(p => p._id);

        // A conversation is a "Mingo Support" thread when any participant is an admin.
        const adminParticipant = populatedParticipants.find(p => p && (p.role === 'ADMIN' || String(p.role || '').endsWith('_ADMIN')));
        const isAdminConv = !!adminParticipant;

        // From the listener's point of view the "other" participant is the caller
        // (the USER). For support threads it's whoever sits opposite the admin.
        const otherParticipant = adminParticipant
          ? populatedParticipants.find(p => p._id.toString() !== adminParticipant._id.toString()) || null
          : populatedParticipants.find(p => p.role === 'USER') || populatedParticipants[0] || null;

        const participantsOut = populatedParticipants.map(p => ({
          id: p._id,
          name: p.name || p.username || 'Unknown',
          avatarIndex: p.avatarIndex || 0,
          gender: p.gender,
          role: p.role,
        }));
        const otherParticipantOut = otherParticipant ? {
          id: otherParticipant._id,
          name: otherParticipant.name || otherParticipant.username || 'Unknown',
          avatarIndex: otherParticipant.avatarIndex || 0,
          gender: otherParticipant.gender,
          role: otherParticipant.role,
        } : null;

        const allMessages = await Message.find({ conversationId: conv._id })
          .sort({ createdAt: 1 })
          .populate('sender', 'name username')
          .select('sender senderModel content type mediaUrl giftCount isAdminMessage createdAt');

        // ── One card PER chat session ──
        const chatSessions = await Session.find({
          userId: { $in: participantIds },
          listenerId: { $in: participantIds },
          callType: 'chat',
        }).sort({ startTime: 1 });

        // Phase windows: a session's thread starts where the previous ENDED
        // session left off (or at conversation creation). The message that
        // begins a session is saved a moment BEFORE session.startTime is
        // recorded, so a startTime-bounded window would silently drop it — this
        // mirrors the mobile chatController logic exactly.
        const phaseStartBySession = new Map();
        let runningPhaseStart = conv.createdAt;
        for (const s of chatSessions) {
          phaseStartBySession.set(s._id.toString(), runningPhaseStart);
          if (s.endTime && (s.status === 'completed' || s.status === 'cancelled')) {
            runningPhaseStart = s.endTime;
          }
        }

        const inPhase = (msg, phaseStart, phaseEnd) => {
          const t = new Date(msg.createdAt).getTime();
          return t > new Date(phaseStart).getTime() && (!phaseEnd || t <= new Date(phaseEnd).getTime());
        };

        for (const s of chatSessions) {
          const sStart = new Date(s.startTime).getTime();
          if (startMs && sStart < startMs) continue;
          if (endMs && sStart > endMs) continue;

          const phaseStart = phaseStartBySession.get(s._id.toString()) || conv.createdAt;
          const phaseEnd = s.endTime || null;
          const phaseMessages = allMessages.filter(m => inPhase(m, phaseStart, phaseEnd));
          const lastMsg = phaseMessages[phaseMessages.length - 1] || null;

          cards.push({
            id: s._id,
            conversationId: conv._id,
            sessionId: s._id,
            participants: participantsOut,
            otherParticipant: otherParticipantOut,
            isAdminConversation: isAdminConv,
            session: {
              active: s.status === 'active',
              status: s.status,
              startTime: s.startTime,
              endTime: s.endTime,
              duration: s.duration || 0,
              totalCoinsDeducted: s.coinsDeducted || 0,
              listenerEarnings: s.listenerEarnings || 0,
            },
            messageCount: phaseMessages.length,
            lastMessage: lastMsg ? {
              content: lastMsg.content,
              createdAt: lastMsg.createdAt,
              senderModel: lastMsg.senderModel,
            } : null,
            createdAt: s.startTime,
            updatedAt: (lastMsg && lastMsg.createdAt) || s.endTime || s.startTime,
            _phaseMessages: phaseMessages,
          });
        }

        // ── Current-phase / sessionless card ──
        // Messages sent after the last ENDED session (the free-message phase of
        // a brand-new session) — or the whole thread for conversations that
        // never had a session (support threads, plain hellos). Only shown when
        // there is a real (non-system) message so stale empty threads don't
        // clutter the list. Never shown while the latest session is still
        // active (those messages belong to the active session's card).
        const latestSession = chatSessions.length ? chatSessions[chatSessions.length - 1] : null;
        const lastEnded = [...chatSessions].reverse().find(s => s.endTime && (s.status === 'completed' || s.status === 'cancelled'));
        const currentPhaseStart = (lastEnded && lastEnded.endTime) || conv.createdAt;
        const currentPhaseMessages = allMessages.filter(m => inPhase(m, currentPhaseStart, null));
        const hasRealMessage = currentPhaseMessages.some(m => m.senderModel !== 'System');
        const hasNewerPhase = !!latestSession &&
          latestSession.status !== 'active' &&
          !!latestSession.endTime &&
          hasRealMessage;
        const showSessionlessCard = chatSessions.length === 0 ? hasRealMessage : hasNewerPhase;

        if (showSessionlessCard) {
          const convCreated = new Date(conv.createdAt).getTime();
          const inDateRange = (!startMs || convCreated >= startMs) && (!endMs || convCreated <= endMs);
          if (inDateRange) {
            const lastMsg = currentPhaseMessages[currentPhaseMessages.length - 1] || null;
            cards.push({
              id: conv._id,
              conversationId: conv._id,
              sessionId: null,
              participants: participantsOut,
              otherParticipant: otherParticipantOut,
              isAdminConversation: isAdminConv,
              session: null,
              messageCount: currentPhaseMessages.length,
              lastMessage: lastMsg ? {
                content: lastMsg.content,
                createdAt: lastMsg.createdAt,
                senderModel: lastMsg.senderModel,
              } : null,
              createdAt: conv.createdAt,
              updatedAt: conv.updatedAt,
              _phaseMessages: currentPhaseMessages,
            });
          }
        }
      }

      // Status pill counts are scoped to the same period + search + participant
      // filters as the list — computed from the expanded cards so the badges
      // stay meaningful (a sessionless card counts as 'free').
      const statusCounts = { active: 0, completed: 0, cancelled: 0, free: 0 };
      for (const c of cards) {
        const sKey = c.session && c.session.status ? c.session.status : 'free';
        if (Object.prototype.hasOwnProperty.call(statusCounts, sKey)) {
          statusCounts[sKey] += 1;
        } else {
          statusCounts.free += 1;
        }
      }

      // Status tab filter — 'free' matches sessionless cards (and any card
      // whose session has no status), everything else matches the session status.
      let result = cards;
      if (status && status !== 'all') {
        const wanted = status.toLowerCase();
        result = cards.filter(c => {
          const sKey = c.session && c.session.status ? c.session.status : 'free';
          return wanted === 'free' ? sKey === 'free' : sKey === wanted;
        });
      }

      // Detail view — scope to a single card (matched by its `id`) and attach
      // the full message thread (with sender info) so the detail page renders
      // exactly that session's messages.
      if (sessionId) {
        result = cards.filter(c => String(c.id) === String(sessionId));
        result.forEach(c => {
          c.messages = (c._phaseMessages || []).map(msg => ({
            id: msg._id,
            sender: msg.sender ? {
              id: msg.sender._id || msg.sender,
              name: msg.sender.name || msg.sender.username || 'Unknown',
            } : null,
            senderModel: msg.senderModel,
            content: msg.content,
            type: msg.type,
            mediaUrl: msg.mediaUrl,
            giftCount: msg.giftCount || 1,
            isAdminMessage: msg.isAdminMessage || false,
            createdAt: msg.createdAt,
          }));
        });
      }
      cards.forEach(c => delete c._phaseMessages);

      // Sort cards newest-first, then paginate the CARDS.
      result.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));

      const total = result.length;
      const pageNum = Math.max(parseInt(page) || 1, 1);
      const limitNum = Math.max(parseInt(limit) || 50, 1);
      const paginated = result.slice((pageNum - 1) * limitNum, pageNum * limitNum);

      return ApiResponse.success(res, {
        conversations: paginated,
        total,
        counts: statusCounts,
        page: pageNum,
        limit: limitNum,
      }, 'Chat logs retrieved');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /admin/users/:id/blocked
   * Returns list of accounts/users blocked by a specific user or listener.
   */
  static async getUserBlockedList(req, res, next) {
    try {
      const { id } = req.params;
      let user = await User.findById(id).populate({
        path: 'blockedUsers',
        select: 'name username phone gender avatarIndex role isBanned createdAt',
      });

      if (!user) {
        const listener = await Listener.findById(id);
        if (listener && listener.userId) {
          user = await User.findById(listener.userId).populate({
            path: 'blockedUsers',
            select: 'name username phone gender avatarIndex role isBanned createdAt',
          });
        }
      }

      if (!user) throw new AppError('User/Listener not found', 404);

      return ApiResponse.success(res, user.blockedUsers || [], 'Blocked accounts retrieved');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /admin/transactions
   * Retrieves transaction logs (coin purchases, call debits/credits, gift sends, refunds, bonus)
   */
  static async getTransactions(req, res, next) {
    try {
      const { type, status, search, startDate, endDate, page = 1, limit = 50 } = req.query;
      const filter = {};

      if (type && type !== 'all') {
        if (type === 'coins_bought' || type === 'purchase') {
          filter.type = 'purchase';
        } else if (type === 'coins_spent') {
          filter.type = { $in: ['call_debit', 'chat_debit', 'gift_send'] };
        } else {
          filter.type = type;
        }
      }

      if (status && status !== 'all') {
        filter.status = status;
      }

      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate + 'T23:59:59.999');
      }

      if (search) {
        const matchingUsers = await User.find({
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { username: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
          ],
        }).select('_id');
        const userIds = matchingUsers.map(u => u._id);

        filter.$or = [
          { userId: { $in: userIds } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      const transactions = await Transaction.find(filter)
        .populate('userId', 'name username phone email role avatarIndex')
        .sort({ createdAt: -1 })
        .skip((Math.max(parseInt(page), 1) - 1) * parseInt(limit))
        .limit(parseInt(limit));

      const total = await Transaction.countDocuments(filter);

      // Compute stats for overview cards
      const statsAgg = await Transaction.aggregate([
        { $match: startDate || endDate ? { createdAt: filter.createdAt } : {} },
        {
          $group: {
            _id: '$type',
            totalCoins: { $sum: '$coins' },
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 },
          }
        }
      ]);

      let totalCoinsBought = 0;
      let totalCoinsSpent = 0;
      let totalRevenue = 0;
      let totalCount = 0;

      const counts = { all: total, purchase: 0, call_debit: 0, chat_debit: 0, gift_send: 0, signup_bonus: 0, refund: 0 };

      statsAgg.forEach(row => {
        totalCount += row.count;
        if (counts[row._id] !== undefined) {
          counts[row._id] = row.count;
        }
        if (row._id === 'purchase') {
          totalCoinsBought += row.totalCoins || 0;
          totalRevenue += row.totalAmount || 0;
        } else if (['call_debit', 'chat_debit', 'gift_send'].includes(row._id)) {
          totalCoinsSpent += Math.abs(row.totalCoins || 0);
        }
      });

      return ApiResponse.success(res, {
        transactions: transactions.map(t => ({
          id: t._id,
          userId: t.userId?._id,
          userName: t.userId?.name || 'Unknown',
          userPhone: t.userId?.phone || '',
          userEmail: t.userId?.email || '',
          userRole: t.userId?.role || 'USER',
          avatarIndex: t.userId?.avatarIndex || 0,
          type: t.type,
          amount: t.amount,
          coins: t.coins,
          description: t.description,
          status: t.status,
          metadata: t.metadata,
          createdAt: t.createdAt,
        })),
        total,
        counts,
        stats: {
          totalCoinsBought,
          totalCoinsSpent,
          totalRevenue,
          totalCount,
        },
        page: parseInt(page),
        limit: parseInt(limit),
      }, 'Transactions retrieved');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AdminController;
