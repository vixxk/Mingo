const admin = require('firebase-admin');
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

const sendNotificationToDevice = async (fcmToken, title, body, data = {}) => {
  try {
    const message = {
      notification: {
        title,
        body,
      },
      data,
      token: fcmToken,
    };

    const response = await admin.messaging().send(message);
    console.log('Successfully sent message:', response);
    return { success: true, response };
  } catch (error) {
    console.error('Error sending message:', error);
    return { success: false, error: error.message };
  }
};

const sendNotificationToMultiple = async (fcmTokens, title, body, data = {}) => {
  if (!fcmTokens || fcmTokens.length === 0) return { success: true, message: 'No tokens provided' };

  try {
    const message = {
      notification: {
        title,
        body,
      },
      data,
      tokens: fcmTokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`${response.successCount} messages sent successfully, ${response.failureCount} failed.`);
    return { success: true, response };
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
