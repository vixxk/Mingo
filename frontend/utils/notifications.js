import { Platform, AppState, NativeModules, TurboModuleRegistry } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

const ONESIGNAL_APP_ID = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID;

import { router } from 'expo-router';

// --- 1. OneSignal Configuration & Setup ---
let OneSignal = null;
let LogLevel = null;
let isClickListenerRegistered = false;
let isOneSignalInitialized = false;

const isExpoGo = Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';
const hasOneSignalNativeModule = !isExpoGo && !!(
  (TurboModuleRegistry?.get && TurboModuleRegistry.get('OneSignal')) ||
  NativeModules?.OneSignal ||
  NativeModules?.RNOneSignal
);

if (hasOneSignalNativeModule) {
  try {
    // Use require instead of ES6 import to prevent Expo Go from crashing on startup due to missing native binary
    const OneSignalModule = require('react-native-onesignal');
    if (OneSignalModule) {
      OneSignal = OneSignalModule.OneSignal;
      LogLevel = OneSignalModule.LogLevel;
    }
  } catch (err) {
    console.log('[OneSignal] Native module is not available in current environment. Bypassing OneSignal.');
  }
} else {
  console.log('[OneSignal] Native module is not available in current environment (e.g. running in Expo Go). Bypassing OneSignal.');
}

/**
 * Initializes OneSignal Push Notifications on the client device
 * Registers the system userId as OneSignal's External ID for highly robust targeting without token databases
 * @param {String} userId - Mongo database ID of the user
 * @param {String} role - User role: 'USER' or 'LISTENER'
 */
export async function initializeOneSignal(userId, role) {
  if (!OneSignal) {
    console.log('[OneSignal] SDK native library is not loaded. Bypassing OneSignal setup.');
    return;
  }

  if (!ONESIGNAL_APP_ID || ONESIGNAL_APP_ID.startsWith('placeholder')) {
    console.log('[OneSignal] Client App ID not configured. Bypassing registration.');
    return;
  }

  if (!userId) {
    console.log('[OneSignal] Missing userId for initialization.');
    return;
  }

  try {
    console.log(`[OneSignal] Initializing with App ID: ${ONESIGNAL_APP_ID}`);
    if (LogLevel) {
      OneSignal.Debug.setLogLevel(LogLevel.Verbose);
    }
    OneSignal.initialize(ONESIGNAL_APP_ID);
    isOneSignalInitialized = true;

    // Request permissions dynamically
    console.log('[OneSignal] Requesting push notification permissions...');
    await OneSignal.Notifications.requestPermission(true);

    // Log the user into OneSignal using their system ID as their External ID
    console.log(`[OneSignal] Registering external userId: ${userId}`);
    OneSignal.login(String(userId));

    // Tag the user with their role for precise dashboard/segment marketing campaigns
    if (role) {
      const sanitizedRole = role.toUpperCase();
      console.log(`[OneSignal] Adding audience tag 'role': ${sanitizedRole}`);
      OneSignal.User.addTag('role', sanitizedRole);
    }

    // Register notification click listener if not already registered
    if (!isClickListenerRegistered) {
      OneSignal.Notifications.addEventListener('click', (event) => {
        try {
          const data = event.notification?.additionalData;
          // v5 exposes the action id on `result`, older versions on `action`
          const actionId = event.result?.actionId || event.action?.actionId;
          console.log('[OneSignal] Notification clicked, data:', JSON.stringify(data), 'actionId:', actionId);
          
          if (data?.type === 'incoming_call') {
            const { socketService } = require('./socket');
            // Carry the Android notification id through to the accept handler
            // so it can remove this exact notification from the tray.
            if (event.notification?.androidNotificationId != null) {
              data.androidNotificationId = event.notification.androidNotificationId;
            }
            if (actionId === 'accept') {
              console.log('[OneSignal] User clicked Accept button on call notification');
              socketService.triggerLocalEvent('accept_incoming_call', data);
            } else if (actionId === 'decline') {
              console.log('[OneSignal] User clicked Decline button on call notification');
              socketService.triggerLocalEvent('reject_incoming_call', data);
            } else {
              // Clicked notification body, just show the incoming call popup in the app
              console.log('[OneSignal] User clicked call notification body');
              socketService.triggerLocalEvent('incoming_call', data);
            }
            router.push('/(listener)');
          } else if (data?.type === 'payout') {
            // Payout update (submitted/approved/paid/rejected...) — open the Payout screen
            console.log('[OneSignal] User tapped payout notification — opening Payout screen');
            router.push('/(listener)/payout');
          } else if (data?.conversationId) {
            router.push({
              pathname: '/chat',
              params: { id: data.conversationId },
            });
          } else if (data?.url) {
            router.push(data.url);
          }
        } catch (clickErr) {
          console.error('[OneSignal] Error handling notification click:', clickErr);
        }
      });
      isClickListenerRegistered = true;
      console.log('[OneSignal] Registered notification click listener.');
    }

    console.log('[OneSignal] Setup finished successfully!');
  } catch (err) {
    console.error('[OneSignal] Failed to initialize push services:', err.message);
  }
}

/**
 * Removes the incoming-call push notification from the system tray once the
 * call has been picked up, so it doesn't linger behind the active call.
 *
 * Android: removes the exact notification when its id was captured (from the
 * OneSignal click event). Fallback (app opened directly) / iOS: clears the
 * delivered notifications from the shade.
 * @param {Object} data - incoming-call payload, may carry androidNotificationId
 */
export function dismissCallNotification(data) {
  if (!OneSignal || !isOneSignalInitialized) return;
  try {
    if (Platform.OS === 'android' && data?.androidNotificationId != null) {
      OneSignal.Notifications.removeNotification(data.androidNotificationId);
    } else {
      OneSignal.Notifications.clearAll();
    }
  } catch (err) {
    console.error('[OneSignal] Failed to dismiss call notification:', err.message);
  }
}

export async function logoutOneSignal() {
  if (!OneSignal) {
    console.log('[OneSignal] SDK native library is not loaded. Bypassing OneSignal logout.');
    return;
  }
  if (!isOneSignalInitialized) {
    console.log('[OneSignal] SDK is not initialized. Bypassing OneSignal logout.');
    return;
  }
  try {
    console.log('[OneSignal] Logging out user and clearing external ID.');
    OneSignal.logout();
  } catch (err) {
    console.error('[OneSignal] Failed to log out of push services:', err.message);
  }
}


// --- 2. Expo Notifications Mocks and Fallbacks (For Backwards-Compatibility) ---
let Notifications = {
  setNotificationHandler: () => {},
  AndroidImportance: { MAX: 4 },
  setNotificationChannelAsync: async () => {},
  getPermissionsAsync: async () => ({ status: 'granted', granted: true }),
  requestPermissionsAsync: async () => ({ status: 'granted', granted: true }),
  getExpoPushTokenAsync: async () => ({ data: null }),
  addNotificationReceivedListener: () => ({ remove: () => {} }),
  addNotificationResponseReceivedListener: () => ({ remove: () => {} }),
};

if (!isExpoGo) {
  try {
    const RealNotifications = require('expo-notifications');
    if (RealNotifications) {
      Notifications = RealNotifications;
    }
  } catch (e) {
    console.warn('Failed to load real expo-notifications, using mock:', e.message);
  }
}

export { Notifications };

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification?.request?.content?.data || {};
    const isIncomingCallPush = data?.type === 'incoming_call';
    const isCancelledPush = data?.type === 'call_cancelled' && data?.isMissed !== 'true';
    const isCallPush = isIncomingCallPush || isCancelledPush;
    const appActive = AppState.currentState === 'active';

    // Incoming calls never use the plain Expo banner:
    //  - foreground: the in-app IncomingCallPopup (socket event) handles it;
    //  - background: the native full-screen card + looping ringtone handles it
    //    on builds that have the module (plugins/withIncomingCall.js).
    let nativeHandlesCall = false;
    if (isCallPush && !appActive) {
      try {
        const { incomingCallNative } = require('./incomingCall');
        nativeHandlesCall = incomingCallNative.isAvailable();
      } catch (e) {
        // Keep the banner as the fallback.
      }
    }
    const suppress = isCallPush && (!appActive ? nativeHandlesCall : true);

    return {
      shouldShowAlert: !suppress,
      shouldPlaySound: !suppress,
      shouldSetBadge: !isCallPush,
    };
  },
});

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#A855F7',
      });
    } catch (e) {
      console.log('Error setting notification channel:', e);
    }
  }

  if (Device.isDevice || Constants.appOwnership === 'expo') {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.warn('Failed to get push token for push notification!');
      return null;
    }

    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ?? 'd0b23362-d4a0-4c00-9c57-a9f7d5ad0b98';
        
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      console.log('Push Token received:', token);

      // Validate the token — reject mock/invalid tokens
      if (!token || token === 'expo-go-mock-token' || (!token.startsWith('ExponentPushToken') && token.length < 20)) {
        console.warn('[Notifications] Received invalid or mock push token, discarding:', token);
        token = null;
      }
    } catch (e) {
      console.error('Error fetching real push token:', e);
    }
  } else {
    console.warn('Must use physical device for Push Notifications');
  }

  return token;
}

export function addNotificationReceivedListener(callback) {
  return Notifications.addNotificationReceivedListener(callback);
}

export function addNotificationResponseReceivedListener(callback) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}
