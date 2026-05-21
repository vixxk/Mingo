const axios = require('axios');
const User = require('../models/userModel');

class PushService {
  /**
   * Send a push notification using Expo Push API
   * @param {String} userId 
   * @param {Object} message - { title, body, data }
   */
  static async sendPushNotification(userId, message) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.pushToken) {
        return; // No push token available
      }

      const expoPushEndpoint = 'https://exp.host/--/api/v2/push/send';
      
      const payload = {
        to: user.pushToken,
        sound: 'default',
        title: message.title,
        body: message.body,
        data: message.data || {},
        channelId: 'default',
        priority: 'high',
        badge: 1,
      };

      await axios.post(expoPushEndpoint, payload, {
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        }
      });
      console.log(`[PushService] Push notification sent to user ${userId}`);
    } catch (err) {
      console.error(`[PushService] Failed to send push notification to ${userId}:`, err.message);
    }
  }
}

module.exports = PushService;
