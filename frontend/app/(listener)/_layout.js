import React, { useState, useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ms, vs } from '../../utils/responsive';
import { socketService } from '../../utils/socket';
import { userAPI, callAPI } from '../../utils/api';
import { useSSE } from '../../utils/useSSE';

import { initializeOneSignal } from '../../utils/notifications';

export default function ListenerLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const { unreadPeopleCount } = useSSE();

  useEffect(() => {
    const setupSocket = async () => {
      await socketService.connect();
      
      // NOTE: Incoming-call handling (popup, accept/reject, call_cancelled,
      // account_banned) now lives in the ROOT layout so the incoming-call
      // popup is visible on every screen — including chat — not just the tabs.

      // OneSignal push notification initialization
      try {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          initializeOneSignal(user._id || user.id, user.role || 'LISTENER');
          
          // Also fetch and update the Expo/FCM push token on the backend
          try {
            const { registerForPushNotificationsAsync } = require('../../utils/notifications');
            const token = await registerForPushNotificationsAsync();
            if (token && token !== 'expo-go-mock-token' && token.length > 10) {
              console.log('[ListenerLayout] Fetched valid push token, registering with backend:', token);
              await userAPI.updatePushToken(token);
            } else {
              console.log('[ListenerLayout] Skipping push token registration — token is invalid or mock:', token);
            }
          } catch (regErr) {
            console.log('[ListenerLayout] Error during push token setup:', regErr.message);
          }
        }
      } catch (oneErr) {
        console.log('Error initializing OneSignal in ListenerLayout:', oneErr);
      }

      // Redirect listener to ongoing active session if any
      callAPI.getActiveSession().then(res => {
        if (res?.data) {
          const session = res.data;
          if (session.callType === 'chat') {
            router.replace({
              pathname: '/(chat)/chat',
              params: {
                name: session.userId?.name || 'User',
                id: session.userId?._id || session.userId,
                avatarIndex: session.userId?.avatarIndex || '0',
                gender: session.userId?.gender || 'Female',
                sessionId: session._id,
              }
            });
          } else {
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
                // getActiveSession response carries the session's Zego creds
                ...(session.zegoAppId ? { zegoAppId: String(session.zegoAppId) } : {}),
                ...(session.zegoAppSign ? { zegoAppSign: String(session.zegoAppSign) } : {}),
                // getActiveSession response carries the session's Agora creds
                ...(session.agoraAppId ? { agoraAppId: String(session.agoraAppId) } : {}),
                ...(session.agoraToken ? { agoraToken: String(session.agoraToken) } : {}),
              }
            });
          }
        }
      }).catch(err => console.log('Error checking active session for listener:', err));
    };

    setupSocket();
  }, []);

  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      console.log('[ListenerLayout] AppState changed:', nextAppState);
      if (nextAppState === 'background') {
        socketService.emit('app_backgrounded');
      } else if (nextAppState === 'active') {
        socketService.connect().then(() => {
          socketService.emit('app_foregrounded');
        }).catch(err => console.log('Error reconnecting socket on app foreground:', err));
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

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
            height: vs(65) + insets.bottom,
            paddingBottom: insets.bottom > 0 ? insets.bottom : vs(10),
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
          name="recent-sessions"
          options={{
            title: 'Sessions',
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
            tabBarBadge: unreadPeopleCount > 0 ? unreadPeopleCount : undefined,
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

    </View>
  );
}
