import { Tabs, useRouter, useSegments } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { s, vs, ms } from '../../utils/responsive';
import { authAPI, userAPI, callAPI } from '../../utils/api';
import { socketService } from '../../utils/socket';
import IncomingCallPopup from '../../components/shared/IncomingCallPopup';
import { useSSE } from '../../utils/useSSE';

import { initializeOneSignal } from '../../utils/notifications';

export default function TabLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [incomingCalls, setIncomingCalls] = useState([]);
  const unreadCount = useSSE();

  const isChatOpenRef = React.useRef(false);

  // Track whether user is on a chat screen
  useEffect(() => {
    isChatOpenRef.current = segments && (segments.includes('(chat)') || segments.includes('chat'));
  }, [segments]);

  useEffect(() => {
    const setupSocket = async () => {
      await socketService.connect();
      
      socketService.on('incoming_call', (callData) => {
        console.log('Incoming call received:', callData);
        setIncomingCalls((prev) => {
          if (prev.some(c => c.callId === callData.callId)) return prev;
          return [...prev, callData];
        });
      });

      socketService.on('call_cancelled', (data) => {
        console.log('Call cancelled by caller:', data);
        setIncomingCalls((prev) => prev.filter(c => c.callId !== data.callId && c.callId !== data.sessionId));
      });

      socketService.on('account_banned', (data) => {
        console.log('Account banned event received:', data);
        Alert.alert('Account Suspended', data.message || 'Your account has been suspended.', [
          {
            text: 'OK',
            onPress: async () => {
              await AsyncStorage.removeItem('token');
              await AsyncStorage.removeItem('userToken');
              await AsyncStorage.removeItem('user');
              router.replace('/banned');
            }
          }
        ]);
      });
    };

    setupSocket();

    return () => {
      socketService.off('incoming_call');
      socketService.off('call_cancelled');
      socketService.off('account_banned');
    };
  }, []);

  const handleAcceptCall = async (acceptedCall) => {
    if (!acceptedCall) return;
    
    // Ensure socket is connected before emitting events
    await socketService.connect();
    
    const { callerId, callerName, callType, callId, roomId, avatarIndex, gender } = acceptedCall;
    
    try {
      // Validate that the session is still active
      const sessionRes = await callAPI.getSession(callId);
      const session = sessionRes?.data;
      if (!session || session.status === 'cancelled' || session.status === 'completed') {
        Alert.alert('Call Cancelled', 'This call has been cancelled by the other participant.', [{ text: 'OK' }]);
        setIncomingCalls(prev => prev.filter(c => c.callId !== callId));
        return;
      }
    } catch (err) {
      console.log('Error validating session before accept:', err);
      Alert.alert('Call Unavailable', 'This call is no longer available.', [{ text: 'OK' }]);
      setIncomingCalls(prev => prev.filter(c => c.callId !== callId));
      return;
    }
    
    // Automatically reject all other active requests
    const otherCalls = incomingCalls.filter(c => c.callId !== callId);
    otherCalls.forEach(otherCall => {
      socketService.emit('call_rejected', { 
        userId: otherCall.callerId, 
        sessionId: otherCall.callId,
        reason: 'busy' 
      });
    });

    // Notify caller we accepted
    socketService.emit('call_accepted', { userId: callerId, sessionId: callId, roomId });
    
    setIncomingCalls([]);
    
    // Route to call screen
    const targetScreen = callType === 'video' ? '/(call)/video-call' : '/(call)/audio-call';
    router.push({
      pathname: targetScreen,
      params: {
        name: callerName,
        callId,
        roomId,
        listenerId: callerId, // The other participant
        avatarIndex,
        gender,
        callType,
        isIncoming: 'true'
      }
    });
  };

  const handleRejectCall = (rejectedCall) => {
    if (!rejectedCall) return;
    socketService.emit('call_rejected', { 
      userId: rejectedCall.callerId, 
      sessionId: rejectedCall.callId,
      reason: 'busy' 
    });
    setIncomingCalls(prev => prev.filter(c => c.callId !== rejectedCall.callId));
  };

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
            const { registerForPushNotificationsAsync } = require('../../utils/notifications');
            registerForPushNotificationsAsync().then(token => {
              if (token && token !== 'expo-go-mock-token' && token.length > 10) {
                console.log('[TabLayout] Fetched valid push token, registering with backend:', token);
                userAPI.updatePushToken(token).catch(err => 
                  console.log('[TabLayout] Error registering push token with backend:', err.message)
                );
              } else {
                console.log('[TabLayout] Skipping push token registration — token is invalid or mock:', token);
              }
            }).catch(tokenErr => {
              console.log('[TabLayout] Error getting push token:', tokenErr.message);
            });
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
              <Ionicons
                name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
                size={22}
                color={color}
              />
            ),
            tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
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

      <IncomingCallPopup
        calls={incomingCalls}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
      />
    </View>
  );
}
