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

    if (!appId || !apiKey || appId.startsWith('placeholder') || apiKey.startsWith('placeholder')) {
      console.log('[PushService] OneSignal is not configured yet. Skipping push delivery.');
      return;
    }

    const cleanUserIds = [...new Set(userIds.filter(Boolean).map(id => String(id)))];
    if (cleanUserIds.length === 0) return;

    try {
      console.log(`[PushService] Dispatching OneSignal push to ${cleanUserIds.length} users:`, cleanUserIds);
      
      const payload = {
        app_id: appId,
        headings: { en: message.title },
        contents: { en: message.body },
        data: message.data || {},
        include_external_user_ids: cleanUserIds,
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
      return response.data;
    } catch (err) {
      console.error('[PushService] OneSignal dispatch failed:', err.response?.data || err.message);
    }
  }

  /**
   * Sends a OneSignal push notification to a segment/audience using built-in filters/tags
   * @param {String} targetType - 'all', 'users', 'listeners'
   * @param {Object} message - { title, body, data }
   */
  static async sendPushToSegment(targetType, message) {
    const appId = process.env.ONESIGNAL_APP_ID;
    const apiKey = process.env.ONESIGNAL_REST_API_KEY;

    if (!appId || !apiKey || appId.startsWith('placeholder') || apiKey.startsWith('placeholder')) {
      console.log('[PushService] OneSignal is not configured yet. Skipping push delivery.');
      return;
    }

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
      } else {
        return;
      }

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
      return response.data;
    } catch (err) {
      console.error('[PushService] OneSignal campaign failed:', err.response?.data || err.message);
    }
  }
}

module.exports = PushService;
