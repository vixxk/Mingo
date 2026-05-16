const Notification = require('../models/Notification');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/appError');

class NotificationController {
  static async getNotifications(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;

      const filter = { recipient: req.user.id };

      const notifications = await Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const total = await Notification.countDocuments(filter);
      const unreadCount = await Notification.countDocuments({ ...filter, isRead: false });

      return ApiResponse.success(res, { notifications, total, unreadCount, page: parseInt(page), limit: parseInt(limit) }, 'Notifications retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async markAsRead(req, res, next) {
    try {
      const { id } = req.params;
      const notification = await Notification.findOneAndUpdate(
        { _id: id, recipient: req.user.id },
        { isRead: true },
        { new: true }
      );

      if (!notification) throw new AppError('Notification not found', 404);

      return ApiResponse.success(res, notification, 'Notification marked as read');
    } catch (err) {
      next(err);
    }
  }

  static async markAllAsRead(req, res, next) {
    try {
      await Notification.updateMany(
        { recipient: req.user.id, isRead: false },
        { isRead: true }
      );

      return ApiResponse.success(res, null, 'All notifications marked as read');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = NotificationController;
