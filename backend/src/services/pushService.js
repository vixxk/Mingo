const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

class PushService {
  /**
   * Sends a push notification to a single user by their system userId
   * @param {String} userId 
   * @param {Object} message - { title, body, data }
   */
  static async sendPushNotification(userId, message) {
    if (!userId) return;
    return this.sendPushToMultiple([userId], message);
  }

  /**
   * Sends a push notification to multiple users by their system userIds
   * @param {Array<String>} userIds 
   * @param {Object} message - { title, body, data }
   */
  static async sendPushToMultiple(userIds, message) {
    const cleanUserIds = [...new Set(userIds.filter(Boolean).map(id => String(id)))];
    const emptyResult = {
      success: true,
      usersTargeted: 0,
      tokensTargeted: 0,
      sentCount: 0,
      failedCount: 0,
      results: {
        totalTargeted: 0,
        expo: { sent: 0, failed: 0, badTokens: [] },
        fcm: { sent: 0, failed: 0, badTokens: [] },
      },
    };

    if (cleanUserIds.length === 0) return emptyResult;

    try {
      // 1. Send via OneSignal (uses external_user_ids)
      const { sendNotificationToOneSignalByUserIds, sendNotificationToMultiple } = require('../../utils/notifications');
      const oneSignalResult = await sendNotificationToOneSignalByUserIds(
        cleanUserIds, message.title, message.body, message.data || {}
      );
      if (oneSignalResult.success && oneSignalResult.sent > 0) {
        console.log(`[PushService] Sent via OneSignal to ${oneSignalResult.sent} user(s)`);
        return {
          success: true,
          usersTargeted: cleanUserIds.length,
          tokensTargeted: oneSignalResult.sent,
          sentCount: oneSignalResult.sent,
          failedCount: 0,
          channel: 'onesignal',
        };
      }

      // 2. Also dispatch via Expo/FCM push tokens for maximum reliability (especially call alerts)
      const User = require('../models/userModel');
      const usersWithTokens = await User.find({
        _id: { $in: cleanUserIds },
        isDeleted: { $ne: true },
        pushToken: { $nin: [null, ''] }
      }).select('pushToken');
      
      const pushTokens = usersWithTokens.map(u => u.pushToken).filter(t => t && typeof t === 'string');
      if (pushTokens.length > 0) {
        console.log(`[PushService] Dispatching push to ${pushTokens.length} tokens via FCM/Expo...`);
        const result = await sendNotificationToMultiple(pushTokens, message.title, message.body, message.data || {});
        const deliveryResults = result?.results || emptyResult.results;
        const sentCount = (deliveryResults.expo?.sent || 0) + (deliveryResults.fcm?.sent || 0);
        const failedCount = (deliveryResults.expo?.failed || 0) + (deliveryResults.fcm?.failed || 0);

        return {
          ...result,
          usersTargeted: cleanUserIds.length,
          tokensTargeted: pushTokens.length,
          sentCount,
          failedCount,
          channel: oneSignalResult?.sent > 0 ? 'dual (onesignal+fcm)' : 'expo-fcm',
        };
      }

      return {
        success: true,
        usersTargeted: cleanUserIds.length,
        tokensTargeted: oneSignalResult?.sent || 0,
        sentCount: oneSignalResult?.sent || 0,
        failedCount: 0,
        channel: 'onesignal',
      };
    } catch (err) {
      console.error('[PushService] Dispatch failed:', err.message);
      return {
        success: false,
        usersTargeted: cleanUserIds.length,
        tokensTargeted: 0,
        sentCount: 0,
        failedCount: 0,
        error: err.message,
        results: {
          totalTargeted: 0,
          expo: { sent: 0, failed: 0, badTokens: [] },
          fcm: { sent: 0, failed: 0, badTokens: [] },
        },
      };
    }
  }

  /**
   * Sends a push notification to a segment/audience using built-in filters/tags
   * @param {String} targetType - 'all', 'users', 'listeners'
   * @param {Object} message - { title, body, data }
   */
  static async sendPushToSegment(targetType, message) {
    try {
      const User = require('../models/userModel');
      let filter = {
        isDeleted: { $ne: true },
        role: { $in: ['USER', 'LISTENER'] },
      };
      if (targetType === 'users') {
        filter.role = 'USER';
      } else if (targetType === 'listeners') {
        filter.role = 'LISTENER';
      }

      const targetUsers = await User.find(filter).select('_id');
      return await this.sendPushToMultiple(
        targetUsers.map(user => user._id.toString()),
        message
      );
    } catch (err) {
      console.error('[PushService] Segment dispatch failed:', err.message);
      return {
        success: false,
        usersTargeted: 0,
        tokensTargeted: 0,
        sentCount: 0,
        failedCount: 0,
        error: err.message,
        results: {
          totalTargeted: 0,
          expo: { sent: 0, failed: 0, badTokens: [] },
          fcm: { sent: 0, failed: 0, badTokens: [] },
        },
      };
    }
  }
}

module.exports = PushService;
