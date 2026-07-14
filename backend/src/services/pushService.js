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
    if (cleanUserIds.length === 0) return;

    try {
      const User = require('../models/userModel');
      const usersWithTokens = await User.find({
        _id: { $in: cleanUserIds },
        pushToken: { $ne: null }
      }).select('pushToken');
      
      const pushTokens = usersWithTokens.map(u => u.pushToken).filter(Boolean);
      if (pushTokens.length > 0) {
        console.log(`[PushService] Dispatching push to ${pushTokens.length} tokens via FCM/Expo...`);
        const { sendNotificationToMultiple } = require('../../utils/notifications');
        return await sendNotificationToMultiple(pushTokens, message.title, message.body, message.data || {});
      } else {
        console.log('[PushService] No push tokens found for users:', cleanUserIds);
      }
    } catch (err) {
      console.error('[PushService] Dispatch failed:', err.message);
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
      let filter = { pushToken: { $ne: null } };
      if (targetType === 'users') {
        filter.role = 'USER';
      } else if (targetType === 'listeners') {
        filter.role = 'LISTENER';
      }

      const usersWithTokens = await User.find(filter).select('pushToken');
      const pushTokens = usersWithTokens.map(u => u.pushToken).filter(Boolean);
      if (pushTokens.length > 0) {
        console.log(`[PushService] Dispatching segment (${targetType}) push to ${pushTokens.length} tokens via FCM/Expo...`);
        const { sendNotificationToMultiple } = require('../../utils/notifications');
        return await sendNotificationToMultiple(pushTokens, message.title, message.body, message.data || {});
      } else {
        console.log(`[PushService] No push tokens found for segment: ${targetType}`);
      }
    } catch (err) {
      console.error('[PushService] Segment dispatch failed:', err.message);
    }
  }
}

module.exports = PushService;
