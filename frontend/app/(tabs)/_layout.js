import { Tabs, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s, vs, ms } from '../../utils/responsive';
import { authAPI, userAPI, callAPI } from '../../utils/api';
import { socketService } from '../../utils/socket';
import { useSSE } from '../../utils/useSSE';

import { initializeOneSignal } from '../../utils/notifications';

export default function TabLayout() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const { unreadPeopleCount } = useSSE();

  useEffect(() => {
    const checkAuth = async () => {
      const loggedIn = await authAPI.isLoggedIn();
      if (!loggedIn) {
        router.replace('/welcome');
      } else {
        setIsAuthenticated(true);
        socketService.connect();
        
        // OneSignal push notification initialization
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          const userData = await AsyncStorage.getItem('user');
          if (userData) {
            const user = JSON.parse(userData);
            initializeOneSignal(user._id || user.id, user.role || 'USER');
            
            // Also fetch and update the Expo/FCM push token on the backend
            try {
              const { registerForPushNotificationsAsync } = require('../../utils/notifications');
              const token = await registerForPushNotificationsAsync();
              if (token && token !== 'expo-go-mock-token' && token.length > 10) {
                console.log('[TabLayout] Fetched valid push token, registering with backend:', token);
                await userAPI.updatePushToken(token);
              } else {
                console.log('[TabLayout] Skipping push token registration — token is invalid or mock:', token);
              }
            } catch (regErr) {
              console.log('[TabLayout] Error during push token setup:', regErr.message);
            }
          }
        } catch (oneErr) {
          console.log('Error initializing OneSignal in TabLayout:', oneErr);
        }

        // Redirect to ongoing active session if any
        callAPI.getActiveSession().then(res => {
          if (res?.data) {
            const session = res.data;
            if (session.callType === 'chat') {
              router.replace({
                pathname: '/(chat)/chat',
                params: {
                  name: session.listenerId?.name || 'Listener',
                  id: session.listenerId?._id || session.listenerId,
                  avatarIndex: session.listenerId?.avatarIndex || '0',
                  gender: session.listenerId?.gender || 'Female',
                  sessionId: session._id,
                }
              });
            } else {
              const targetScreen = session.callType === 'video' ? '/(call)/video-call' : '/(call)/audio-call';
              router.replace({
                pathname: targetScreen,
                params: {
                  name: session.listenerId?.name || 'Listener',
                  callId: session._id,
                  roomId: session.roomId,
                  listenerId: session.listenerId?._id || session.listenerId,
                  avatarIndex: session.listenerId?.avatarIndex || '0',
                  gender: session.listenerId?.gender || 'Female',
                  callType: session.callType,
                  // getActiveSession response carries the session's Agora creds
                  ...(session.agoraAppId ? { agoraAppId: String(session.agoraAppId) } : {}),
                  ...(session.agoraToken ? { agoraToken: String(session.agoraToken) } : {}),
                }
              });
            }
          }
        }).catch(err => console.log('Error checking active session:', err));
      }
    };
    checkAuth();
    
  }, []);

  const insets = useSafeAreaInsets();

  if (isAuthenticated === null) {
    return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneContainerStyle: { backgroundColor: '#000' },
          tabBarStyle: {
            backgroundColor: '#111111',
            borderTopWidth: 0.5,
            borderTopColor: '#222',
            height: vs(65) + insets.bottom,
            paddingBottom: insets.bottom > 0 ? insets.bottom : vs(8),
            paddingTop: vs(8),
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarActiveTintColor: '#FFFFFF',
          tabBarInactiveTintColor: '#6B7280',
          tabBarLabelStyle: {
            fontSize: ms(10, 0.3),
            fontFamily: 'Inter_500Medium',
            marginTop: 2,
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
              <View style={{ position: 'relative' }}>
                <Ionicons
                  name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
                  size={22}
                  color={color}
                />
                {unreadPeopleCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>
                      {unreadPeopleCount > 99 ? '99+' : unreadPeopleCount}
                    </Text>
                  </View>
                )}
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
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
      </Tabs>

    </View>
  );
}

const styles = StyleSheet.create({
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    minHeight: 18,
    paddingHorizontal: 4,
    paddingVertical: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#000',
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'Inter_900Black',
    lineHeight: 12,
  },
});
