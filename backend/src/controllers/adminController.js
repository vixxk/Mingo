const User = require('../models/userModel');
const Listener = require('../models/listenerModel');
const Session = require('../models/sessionModel');
const ActivityLog = require('../models/ActivityLog');
const MemberReport = require('../models/MemberReport');
const Transaction = require('../models/transactionModel');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/appError');

class AdminController {
  static async getStats(req, res, next) {
    try {
      const [totalUsers, totalListeners, pendingApprovals, activeNow, totalCalls, pendingReports] = await Promise.all([
        User.countDocuments({ role: 'USER' }),
        Listener.countDocuments(),
        Listener.countDocuments({ status: 'pending' }),
        Listener.countDocuments({ isOnline: true }),
        Session.countDocuments({ status: 'completed' }),
        MemberReport.countDocuments({ status: 'pending' }),
      ]);

      const revenueAgg = await Transaction.aggregate([
        { $match: { type: 'purchase', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].total : 0;

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const newUsersThisWeek = await User.countDocuments({ createdAt: { $gte: weekAgo }, role: 'USER' });

      return ApiResponse.success(res, {
        totalUsers,
        totalListeners,
        pendingApprovals,
        pendingReports,
        activeNow,
        totalCalls,
        totalRevenue,
        newUsersThisWeek,
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
        await User.findByIdAndUpdate(listener.userId, { role: 'LISTENER' });
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
}

module.exports = AdminController;
