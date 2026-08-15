const admin = require('firebase-admin');
const axios = require('axios');
require('dotenv').config();

// Safely parse Firebase Private Key by stripping double quotes/carriage returns/backslashes
let firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY;
if (firebasePrivateKey) {
  // Strip surrounding quotes if present
  if (firebasePrivateKey.startsWith('"') && firebasePrivateKey.endsWith('"')) {
    firebasePrivateKey = firebasePrivateKey.slice(1, -1);
  }
  if (firebasePrivateKey.startsWith("'") && firebasePrivateKey.endsWith("'")) {
    firebasePrivateKey = firebasePrivateKey.slice(1, -1);
  }
  // Replace literal '\n' sequences with actual newline characters
  firebasePrivateKey = firebasePrivateKey.replace(/\\n/g, '\n');
}

try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: firebasePrivateKey,
      }),
    });
    console.log('[Push Service] Firebase Admin SDK Initialized Successfully');
  }
} catch (error) {
  console.error('[Push Service] Firebase Admin SDK Initialization Error:', error.message);
}

/**
 * Sends a push notification to a single device (supports both Expo and FCM)
 */
const sendNotificationToDevice = async (token, title, body, data = {}) => {
  if (!token) return { success: false, error: 'No token provided' };

  try {
    // 1. Expo Push Token flow
    if (token.startsWith('ExponentPushToken') || token.includes('ExponentPushToken')) {
      console.log(`[Push Service] Sending Expo push notification to: ${token}`);
      const response = await axios.post(
        'https://exp.host/--/api/v2/push/send',
        {
          to: token,
          title,
          body,
          data,
          sound: 'default',
          priority: 'high',
        },
        {
          headers: {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
        }
      );
      
      const resData = response.data;
      console.log('[Push Service] Expo push sent response:', JSON.stringify(resData));
      
      const status = resData?.data?.status;
      if (status === 'error') {
        const errorMsg = resData?.data?.message || 'Expo push error';
        console.error(`[Push Service] Expo returned status error: ${errorMsg}`);
        return { success: false, error: errorMsg, isBadToken: true };
      }
      
      return { success: true, response: resData };
    }

    // 2. Firebase FCM flow
    const message = {
      notification: { title, body },
      data: Object.keys(data).reduce((acc, key) => {
        acc[key] = String(data[key]);
        return acc;
      }, {}),
      token,
      android: {
        priority: 'high',
        notification: {
          title,
          body,
          sound: data?.type === 'incoming_call' ? 'ringtone' : 'default',
          channelId: data?.type === 'incoming_call' ? 'calls' : 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log(`[Push Service] Successfully sent FCM message to ${token}:`, response);
    return { success: true, response };
  } catch (error) {
    console.error(`[Push Service] Error sending message to ${token}:`, error.message);
    const isBadToken = 
      error.code === 'messaging/invalid-registration-token' ||
      error.code === 'messaging/registration-token-not-registered' ||
      error.message.includes('not-registered');
    return { success: false, error: error.message, isBadToken };
  }
};

/**
 * Sends a push notification to multiple tokens (handles batching, Expo chunks, and multi-service dispatching)
 */
const sendNotificationToMultiple = async (tokens, title, body, data = {}) => {
  if (!tokens || tokens.length === 0) {
    return { success: true, message: 'No tokens provided' };
  }

  // Deduplicate and filter empty/non-string values
  const uniqueTokens = [...new Set(tokens.filter(t => t && typeof t === 'string'))];
  const expoTokens = [];
  const fcmTokens = [];

  uniqueTokens.forEach(token => {
    if (token.startsWith('ExponentPushToken') || token.includes('ExponentPushToken')) {
      expoTokens.push(token);
    } else {
      fcmTokens.push(token);
    }
  });

  const results = {
    totalTargeted: uniqueTokens.length,
    expo: { sent: 0, failed: 0, badTokens: [] },
    fcm: { sent: 0, failed: 0, badTokens: [] },
  };

  const stringifiedData = Object.keys(data).reduce((acc, key) => {
    acc[key] = String(data[key]);
    return acc;
  }, {});

  // 1. Send Expo push notifications in batches of 100
  //    Expo requires all tokens in a single request to belong to the same project
  //    (experience ID). If a batch mixes projects, the API returns
  //    PUSH_TOO_MANY_EXPERIENCE_IDS with a details map grouping tokens per project.
  if (expoTokens.length > 0) {
    console.log(`[Push Service] Preparing to send ${expoTokens.length} Expo notifications in batches...`);

    const buildPayloads = (tokens) =>
      tokens.map(token => ({
        to: token,
        title,
        body,
        data: stringifiedData,
        sound: 'default',
        priority: 'high',
      }));

    const sendChunk = async (chunk) => {
      const payloads = buildPayloads(chunk);
      const response = await axios.post(
        'https://exp.host/--/api/v2/push/send',
        payloads,
        {
          headers: {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );
      const responseData = response.data;
      if (responseData && Array.isArray(responseData.data)) {
        responseData.data.forEach((ticket, idx) => {
          const correspondingToken = chunk[idx];
          if (ticket.status === 'ok') {
            results.expo.sent++;
          } else {
            results.expo.failed++;
            console.error(`[Push Service] Expo ticket error for ${correspondingToken}:`, ticket.message);
            if (ticket.details?.error === 'DeviceNotRegistered') {
              results.expo.badTokens.push(correspondingToken);
            }
          }
        });
      }
    };

    const sendChunkWithRetry = async (chunk) => {
      try {
        await sendChunk(chunk);
      } catch (err) {
        const resp = err.response?.data;
        if (
          err.response?.status === 400 &&
          resp?.errors?.[0]?.code === 'PUSH_TOO_MANY_EXPERIENCE_IDS' &&
          resp.errors[0].details
        ) {
          // Tokens from multiple projects in one batch — regroup by project
          const projectGroups = resp.errors[0].details;
          console.log(`[Push Service] Splitting batch across ${Object.keys(projectGroups).length} Expo projects...`);
          for (const projectTokens of Object.values(projectGroups)) {
            const validTokens = projectTokens.filter(t => chunk.includes(t));
            if (validTokens.length > 0) {
              try {
                await sendChunk(validTokens);
              } catch (innerErr) {
                console.error(`[Push Service] Project-subgroup Expo error:`, innerErr.message);
                results.expo.failed += validTokens.length;
              }
            }
          }
        } else {
          console.error('[Push Service] Expo batch error:', err.message);
          results.expo.failed += chunk.length;
        }
      }
    };

    for (let i = 0; i < expoTokens.length; i += 100) {
      const chunk = expoTokens.slice(i, i + 100);
      await sendChunkWithRetry(chunk);
    }
  }

  // 2. Send Firebase FCM notifications using sendEachForMulticast
  if (fcmTokens.length > 0) {
    console.log(`[Push Service] Preparing to send ${fcmTokens.length} FCM notifications...`);
    // Firebase limits multicast requests to 500 registration tokens.
    for (let i = 0; i < fcmTokens.length; i += 500) {
      const chunk = fcmTokens.slice(i, i + 500);
      try {
        const message = {
          notification: { title, body },
          data: stringifiedData,
          tokens: chunk,
          android: {
            priority: 'high',
            notification: {
              title,
              body,
              sound: data?.type === 'incoming_call' ? 'ringtone' : 'default',
              channelId: data?.type === 'incoming_call' ? 'calls' : 'default',
            },
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
              },
            },
          },
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`[Push Service] FCM Multicast batch complete. Success: ${response.successCount}, Failure: ${response.failureCount}`);

        results.fcm.sent += response.successCount;
        results.fcm.failed += response.failureCount;

        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const correspondingToken = chunk[idx];
            const err = resp.error;
            console.error(`[Push Service] FCM Multicast error for token ${correspondingToken}:`, err?.message);

            const isBadToken =
              err?.code === 'messaging/invalid-registration-token' ||
              err?.code === 'messaging/registration-token-not-registered' ||
              err?.message?.includes('not-registered');

            if (isBadToken) {
              results.fcm.badTokens.push(correspondingToken);
            }
          }
        });
      } catch (err) {
        console.error('[Push Service] FCM Multicast batch failed entirely:', err.message);
        results.fcm.failed += chunk.length;
      }
    }
  }

  // Auto clean up bad tokens if any are identified
  const allBadTokens = [...results.expo.badTokens, ...results.fcm.badTokens];
  if (allBadTokens.length > 0) {
    try {
      const User = require('../src/models/userModel');
      const cleanRes = await User.updateMany(
        { pushToken: { $in: allBadTokens } },
        { $set: { pushToken: null } }
      );
      console.log(`[Push Service] Auto-cleanup complete. Removed ${cleanRes.modifiedCount} invalid tokens from user database.`);
    } catch (cleanErr) {
      console.error('[Push Service] Error running bad token database clean up:', cleanErr.message);
    }
  }

  return { success: true, results };
};

/**
 * Sends a notification to a specific Firebase topic
 */
const sendNotificationToTopic = async (topic, title, body, data = {}) => {
  if (!topic) return { success: false, error: 'No topic provided' };

  try {
    const stringifiedData = Object.keys(data).reduce((acc, key) => {
      acc[key] = String(data[key]);
      return acc;
    }, {});

    const message = {
      notification: { title, body },
      data: stringifiedData,
      topic,
    };

    const response = await admin.messaging().send(message);
    console.log(`[Push Service] Successfully sent message to topic ${topic}:`, response);
    return { success: true, response };
  } catch (error) {
    console.error(`[Push Service] Error sending message to topic ${topic}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Sends a push notification via OneSignal REST API using external user IDs.
 * Requires ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY in .env
 */
const sendNotificationToOneSignalByUserIds = async (userIds, title, body, data = {}) => {
  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!appId || !apiKey || appId === 'your_onesignal_app_id' || apiKey === 'your_onesignal_rest_api_key') {
    console.log('[OneSignal] Skipping — app ID or REST API key not configured');
    return { success: false, error: 'OneSignal not configured' };
  }

  const cleanIds = [...new Set(userIds.filter(Boolean).map(id => String(id)))];
  if (cleanIds.length === 0) return { success: true, sent: 0 };

  try {
    const response = await axios.post(
      'https://onesignal.com/api/v1/notifications',
      {
        app_id: appId,
        include_external_user_ids: cleanIds,
        headings: { en: title },
        contents: { en: body },
        data,
        ios_badgeType: 'Increase',
        ios_badgeCount: 1,
        priority: 10,
        // Incoming-call pushes reference the bundled ringtone so the device
        // rings even when the app is backgrounded/killed. The app's native
        // OneSignal extension replaces this notification with the full-screen
        // call card + looping ringtone; the sound here is the fallback for
        // builds where the extension is unavailable.
        ...(data?.type === 'incoming_call' ? { android_sound: 'incoming_ringtone' } : {}),
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${apiKey}`,
        },
        timeout: 10000,
      }
    );
    console.log(`[OneSignal] Notification sent to ${cleanIds.length} user(s):`, response.data?.id);
    return { success: true, id: response.data?.id, sent: cleanIds.length };
  } catch (err) {
    console.error('[OneSignal] API error:', err.response?.data?.errors || err.message);
    return { success: false, error: err.message };
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
  sendNotificationToOneSignalByUserIds,
  sendPaymentSuccessNotification,
  sendZeroBalanceNotification,
  sendListenerApprovalNotification,
  sendListenerRejectionNotification,
  sendProfileUpdateNotification,
};
