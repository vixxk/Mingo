import React, { useState, useEffect } from 'react';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { ms, vs } from '../../utils/responsive';
import { socketService } from '../../utils/socket';
import { userAPI, callAPI } from '../../utils/api';
import IncomingCallPopup from '../../components/shared/IncomingCallPopup';
import { useSSE } from '../../utils/useSSE';

// Conditional import for expo-notifications to avoid crash
let Notifications = null;
const isExpoGo = Constants.appOwnership === 'expo';

try {
  Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (e) {
  console.warn('Failed to load expo-notifications:', e);
}

async function registerForPushNotificationsAsync() {
  if (!Notifications) {
    console.log('expo-notifications is not loaded');
    return null;
  }

  let token;

  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    } catch (e) {
      console.log('Error setting notification channel:', e);
    }
  }

  if (Device.isDevice || isExpoGo) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    try {
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId || '29226353-1b41-4785-8ac5-74ded0cd7328'
      })).data;
    } catch (e) {
      console.log('Error getting expo push token, trying device token...', e);
      try {
        token = (await Notifications.getDevicePushTokenAsync()).data;
      } catch (err) {
        console.log('Error getting device push token', err);
      }
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

export default function ListenerLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  
  const [incomingCall, setIncomingCall] = useState(null);
  const unreadCount = useSSE();

  useEffect(() => {
    const setupSocket = async () => {
      await socketService.connect();
      
      socketService.on('incoming_call', (callData) => {
        console.log('Incoming call received:', callData);
        setIncomingCall(callData);
      });

      socketService.on('call_cancelled', (data) => {
        console.log('Call cancelled by caller:', data);
        setIncomingCall(null);
      });

      socketService.on('new_message_notification', async (data) => {
        console.log('New message received:', data);
        const isCurrentlyChatting = segments && (segments.includes('(chat)') || segments.includes('chat'));
        if (Notifications && !isCurrentlyChatting) {
          try {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: data.senderName || 'New Message',
                body: data.content || 'You have a new message',
                sound: true,
              },
              trigger: null,
            });
          } catch (err) {
            console.log('Error showing notification:', err);
          }
        }
      });

      registerForPushNotificationsAsync().then(token => {
        if (token) {
          userAPI.updatePushToken(token).catch(e => console.log('Update push token err:', e));
        }
      });

      // Redirect listener to ongoing active session if any
      callAPI.getActiveSession().then(res => {
        if (res?.data) {
          const session = res.data;
          const targetScreen = session.callType === 'video' ? '/(call)/video-call' : '/(call)/audio-call';
          router.replace({
            pathname: targetScreen,
            params: {
              name: session.userId?.name || 'User',
              callId: session._id,
              roomId: session.roomId,
              userId: session.userId?._id || session.userId,
              avatarIndex: session.userId?.avatarIndex || '0',
              gender: session.userId?.gender || 'Female',
              callType: session.callType,
              isIncoming: 'true',
            }
          });
        }
      }).catch(err => console.log('Error checking active session for listener:', err));
    };

    setupSocket();

    return () => {
      socketService.off('incoming_call');
      socketService.off('call_cancelled');
    };
  }, []);

  const handleAcceptCall = () => {
    if (!incomingCall) return;
    
    const { callerId, callerName, callType, callId, roomId, avatarIndex, gender } = incomingCall;
    
    // Notify user we accepted
    socketService.emit('call_accepted', { userId: callerId, sessionId: callId });
    
    setIncomingCall(null);
    
    // Route to call screen
    const targetScreen = callType === 'video' ? '/(call)/video-call' : '/(call)/audio-call';
    router.push({
      pathname: targetScreen,
      params: {
        name: callerName,
        callId,
        roomId,
        userId: callerId, // This is the user who called us
        avatarIndex,
        gender,
        callType,
        isIncoming: 'true'
      }
    });
  };

  const handleRejectCall = () => {
    if (!incomingCall) return;
    socketService.emit('call_rejected', { 
      userId: incomingCall.callerId, 
      sessionId: incomingCall.callId,
      reason: 'busy' 
    });
    setIncomingCall(null);
  };

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneContainerStyle: { backgroundColor: '#000' },
          tabBarStyle: {
            backgroundColor: '#000',
            borderTopColor: '#1A1A1A',
            borderTopWidth: 1,
            height: Platform.OS === 'ios' ? vs(75) + insets.bottom : vs(65),
            paddingBottom: Platform.OS === 'ios' ? insets.bottom : vs(10),
            paddingTop: vs(6),
          },
          tabBarActiveTintColor: '#fff',
          tabBarInactiveTintColor: '#6B7280',
          tabBarLabelStyle: {
            fontFamily: 'Inter_500Medium',
            fontSize: ms(10, 0.3),
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={22}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="recent-calls"
          options={{
            title: 'Recent',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'time' : 'time-outline'}
                size={22}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: 'Messages',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
                size={22}
                color={color}
              />
            ),
            tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          }}
        />
        <Tabs.Screen
          name="listener-profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'person' : 'person-outline'}
                size={22}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="edit-public-profile"
          options={{
            title: 'Public Profile',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'id-card' : 'id-card-outline'}
                size={22}
                color={color}
              />
            ),
          }}
        />
      </Tabs>

      <IncomingCallPopup
        visible={!!incomingCall}
        callerName={incomingCall?.callerName}
        callType={incomingCall?.callType}
        avatarIndex={incomingCall?.avatarIndex}
        gender={incomingCall?.gender}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
      />
    </View>
  );
}
