const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

class PushService {
  /**
   * Sends a OneSignal push notification to a single user by their system userId
   * @param {String} userId 
   * @param {Object} message - { title, body, data }
   */
  static async sendPushNotification(userId, message) {
    if (!userId) return;
    return this.sendPushToMultiple([userId], message);
  }

  /**
   * Sends a OneSignal push notification to multiple users by their system userIds
   * @param {Array<String>} userIds 
   * @param {Object} message - { title, body, data }
   */
  static async sendPushToMultiple(userIds, message) {
    const appId = process.env.ONESIGNAL_APP_ID;
    const apiKey = process.env.ONESIGNAL_REST_API_KEY;

    const cleanUserIds = [...new Set(userIds.filter(Boolean).map(id => String(id)))];
    if (cleanUserIds.length === 0) return;

    let oneSignalSuccess = false;
    let pushResult = null;

    if (!appId || !apiKey || appId.startsWith('placeholder') || apiKey.startsWith('placeholder')) {
      console.log('[PushService] OneSignal is not configured yet. Skipping OneSignal push delivery.');
    } else {
      try {
        console.log(`[PushService] Dispatching OneSignal push to ${cleanUserIds.length} users:`, cleanUserIds);
        
        const payload = {
          app_id: appId,
          headings: { en: message.title },
          contents: { en: message.body },
          data: message.data || {},
          include_aliases: {
            external_id: cleanUserIds,
          },
          target_channel: 'push',
        };

        const response = await axios.post(
          'https://onesignal.com/api/v1/notifications',
          payload,
          {
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Authorization': `Basic ${apiKey}`,
            },
          }
        );

        console.log('[PushService] OneSignal dispatch success:', response.data);
        oneSignalSuccess = true;
        pushResult = response.data;
      } catch (err) {
        console.error('[PushService] OneSignal dispatch failed:', err.response?.data || err.message);
      }
    }

    // Fallback: Also dispatch using Firebase Admin SDK (FCM) / Expo Push Notifications using the user's stored pushToken.
    // This handles cases where OneSignal has client-side errors, initialization issues, or is running in Expo Go.
    try {
      const User = require('../models/userModel');
      const usersWithTokens = await User.find({
        _id: { $in: cleanUserIds },
        pushToken: { $ne: null }
      }).select('pushToken');
      
      const pushTokens = usersWithTokens.map(u => u.pushToken).filter(Boolean);
      if (pushTokens.length > 0) {
        console.log(`[PushService] Found ${pushTokens.length} push tokens for FCM/Expo. Dispatching fallback notifications...`);
        const { sendNotificationToMultiple } = require('../../utils/notifications');
        await sendNotificationToMultiple(pushTokens, message.title, message.body, message.data || {});
      }
    } catch (fallbackErr) {
      console.error('[PushService] Fallback FCM/Expo push notification failed:', fallbackErr.message);
    }

    return pushResult;
  }

  /**
   * Sends a OneSignal push notification to a segment/audience using built-in filters/tags
   * @param {String} targetType - 'all', 'users', 'listeners'
   * @param {Object} message - { title, body, data }
   */
  static async sendPushToSegment(targetType, message) {
    const appId = process.env.ONESIGNAL_APP_ID;
    const apiKey = process.env.ONESIGNAL_REST_API_KEY;

    let campaignResult = null;

    if (!appId || !apiKey || appId.startsWith('placeholder') || apiKey.startsWith('placeholder')) {
      console.log('[PushService] OneSignal is not configured yet. Skipping OneSignal campaign push delivery.');
    } else {
      try {
        const payload = {
          app_id: appId,
          headings: { en: message.title },
          contents: { en: message.body },
          data: message.data || {},
          target_channel: 'push',
        };

        if (targetType === 'all') {
          payload.included_segments = ['Subscribed Users'];
        } else if (targetType === 'users') {
          payload.filters = [{ field: 'tag', key: 'role', relation: '=', value: 'USER' }];
        } else if (targetType === 'listeners') {
          payload.filters = [{ field: 'tag', key: 'role', relation: '=', value: 'LISTENER' }];
        }

        if (payload.included_segments || payload.filters) {
          console.log(`[PushService] Dispatching OneSignal campaign to target: ${targetType}`);

          const response = await axios.post(
            'https://onesignal.com/api/v1/notifications',
            payload,
            {
              headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Authorization': `Basic ${apiKey}`,
              },
            }
          );

          console.log('[PushService] OneSignal campaign success:', response.data);
          campaignResult = response.data;
        }
      } catch (err) {
        console.error('[PushService] OneSignal campaign failed:', err.response?.data || err.message);
      }
    }

    // Fallback: Also dispatch using Firebase Admin SDK (FCM) / Expo Push Notifications using target users' stored pushTokens.
    try {
      const User = require('../models/userModel');
      let fallbackFilter = { pushToken: { $ne: null } };
      if (targetType === 'users') {
        fallbackFilter.role = 'USER';
      } else if (targetType === 'listeners') {
        fallbackFilter.role = 'LISTENER';
      }

      const usersWithTokens = await User.find(fallbackFilter).select('pushToken');
      const pushTokens = usersWithTokens.map(u => u.pushToken).filter(Boolean);
      if (pushTokens.length > 0) {
        console.log(`[PushService] Found ${pushTokens.length} push tokens for FCM/Expo fallback (segment: ${targetType}). Dispatching...`);
        const { sendNotificationToMultiple } = require('../../utils/notifications');
        await sendNotificationToMultiple(pushTokens, message.title, message.body, message.data || {});
      }
    } catch (fallbackErr) {
      console.error('[PushService] Fallback FCM/Expo segment push notification failed:', fallbackErr.message);
    }

    return campaignResult;
  }
}

module.exports = PushService;
