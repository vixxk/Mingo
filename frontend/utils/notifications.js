import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

let Notifications = {
  setNotificationHandler: () => {},
  AndroidImportance: { MAX: 4 },
  setNotificationChannelAsync: async () => {},
  getPermissionsAsync: async () => ({ status: 'granted' }),
  requestPermissionsAsync: async () => ({ status: 'granted' }),
  getExpoPushTokenAsync: async () => ({ data: 'expo-go-mock-token' }),
  addNotificationReceivedListener: () => ({ remove: () => {} }),
  addNotificationResponseReceivedListener: () => ({ remove: () => {} }),
};

try {
  const RealNotifications = require('expo-notifications');
  if (RealNotifications) {
    Notifications = RealNotifications;
  }
} catch (e) {
  console.warn('Failed to load real expo-notifications, using mock:', e.message);
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
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
        Constants?.expoConfig?.extra?.eas?.projectId ?? '29226353-1b41-4785-8ac5-74ded0cd7328';
        
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      console.log('Real Push Token:', token);
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
