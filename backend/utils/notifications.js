const admin = require('firebase-admin');
const axios = require('axios');
require('dotenv').config();



try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        
        privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
      }),
    });
    console.log('Firebase Admin Initialized Successfully');
  }
} catch (error) {
  console.error('Firebase Admin Initialization Error:', error);
}

const sendNotificationToDevice = async (token, title, body, data = {}) => {
  try {
    if (token && (token.startsWith('ExponentPushToken') || token.includes('ExponentPushToken'))) {
      console.log('Sending Expo notification to:', token);
      const response = await axios.post('https://exp.host/--/api/v2/push/send', {
        to: token,
        title,
        body,
        data,
      });
      console.log('Expo notification sent response:', response.data);
      return { success: true, response: response.data };
    }

    const message = {
      notification: {
        title,
        body,
      },
      data,
      token,
    };

    const response = await admin.messaging().send(message);
    console.log('Successfully sent Firebase message:', response);
    return { success: true, response };
  } catch (error) {
    console.error('Error sending message:', error);
    return { success: false, error: error.message };
  }
};

const sendNotificationToMultiple = async (fcmTokens, title, body, data = {}) => {
  if (!fcmTokens || fcmTokens.length === 0) return { success: true, message: 'No tokens provided' };

  try {
    const expoTokens = [];
    const fcmTokensList = [];

    fcmTokens.forEach(t => {
      if (t && (t.startsWith('ExponentPushToken') || t.includes('ExponentPushToken'))) {
        expoTokens.push(t);
      } else if (t) {
        fcmTokensList.push(t);
      }
    });

    const results = [];

    if (expoTokens.length > 0) {
      console.log('Sending multicast Expo notifications to:', expoTokens);
      for (let i = 0; i < expoTokens.length; i += 100) {
        const chunk = expoTokens.slice(i, i + 100);
        const payloads = chunk.map(token => ({
          to: token,
          title,
          body,
          data,
        }));
        try {
          const response = await axios.post('https://exp.host/--/api/v2/push/send', payloads);
          console.log(`Expo multicast response chunk ${i/100}:`, response.data);
          results.push({ service: 'expo', success: true, response: response.data });
        } catch (err) {
          console.error('Expo multicast error:', err);
          results.push({ service: 'expo', success: false, error: err.message });
        }
      }
    }

    if (fcmTokensList.length > 0) {
      const message = {
        notification: {
          title,
          body,
        },
        data,
        tokens: fcmTokensList,
      };
      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(`${response.successCount} Firebase messages sent successfully, ${response.failureCount} failed.`);
      results.push({ service: 'fcm', success: true, response });
    }

    return { success: true, results };
  } catch (error) {
    console.error('Error sending multicast message:', error);
    return { success: false, error: error.message };
  }
};

const sendNotificationToTopic = async (topic, title, body, data = {}) => {
  try {
    const message = {
      notification: {
        title,
        body,
      },
      data,
      topic,
    };

    const response = await admin.messaging().send(message);
    console.log(`Successfully sent message to topic ${topic}:`, response);
    return { success: true, response };
  } catch (error) {
    console.error(`Error sending message to topic ${topic}:`, error);
    return { success: false, error: error.message };
  }
};


const sendPaymentSuccessNotification = async (fcmToken, amount) => {
  return sendNotificationToDevice(
    fcmToken,
    'Payment Successful! 💸',
    `Your wallet has been credited with ${amount} coins. Thank you for your purchase!`,
    { type: 'payment_success' }
  );
};

const sendZeroBalanceNotification = async (fcmToken) => {
  return sendNotificationToDevice(
    fcmToken,
    'Low Balance Alert ⚠️',
    'Your coin balance is zero. Please recharge to continue talking to listeners.',
    { type: 'zero_balance' }
  );
};

const sendListenerApprovalNotification = async (fcmToken) => {
  return sendNotificationToDevice(
    fcmToken,
    'Congratulations! 🎉',
    'Your listener application has been approved. You can now start taking calls!',
    { type: 'listener_approved' }
  );
};

const sendListenerRejectionNotification = async (fcmToken, reason) => {
  return sendNotificationToDevice(
    fcmToken,
    'Application Update ⚠️',
    reason || 'Your listener application was not approved at this time. Please check your profile for details.',
    { type: 'listener_rejected' }
  );
};

const sendProfileUpdateNotification = async (fcmToken, isApproved) => {
  return sendNotificationToDevice(
    fcmToken,
    isApproved ? 'Profile Updated! ✅' : 'Profile Update Rejected ❌',
    isApproved 
      ? 'Your profile changes have been approved and are now live.'
      : 'Your recent profile changes were not approved. Please review and try again.',
    { type: 'profile_update_status', isApproved: String(isApproved) }
  );
};

module.exports = {
  admin,
  sendNotificationToDevice,
  sendNotificationToMultiple,
  sendNotificationToTopic,
  sendPaymentSuccessNotification,
  sendZeroBalanceNotification,
  sendListenerApprovalNotification,
  sendListenerRejectionNotification,
  sendProfileUpdateNotification,
};
