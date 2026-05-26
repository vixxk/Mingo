import React, { useState, useEffect, useRef } from 'react';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { ms, vs } from '../../utils/responsive';
import { socketService } from '../../utils/socket';
import { userAPI, callAPI } from '../../utils/api';
import IncomingCallPopup from '../../components/shared/IncomingCallPopup';
import { useSSE } from '../../utils/useSSE';

import { initializeOneSignal } from '../../utils/notifications';

export default function ListenerLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  
  const [incomingCalls, setIncomingCalls] = useState([]);
  const unreadCount = useSSE();

  const isChatOpenRef = React.useRef(false);

  // Track whether listener is on a chat screen
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
        console.log('Call cancelled by user:', data);
        setIncomingCalls((prev) => prev.filter(c => c.callId !== data.callId));
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

      // OneSignal push notification initialization
      try {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          initializeOneSignal(user._id || user.id, user.role || 'LISTENER');
          
          // Also fetch and update the Expo/FCM push token on the backend
          const { registerForPushNotificationsAsync } = require('../../utils/notifications');
          registerForPushNotificationsAsync().then(token => {
            if (token) {
              console.log('[ListenerLayout] Fetched push token, registering with backend:', token);
              userAPI.updatePushToken(token).catch(err => 
                console.log('[ListenerLayout] Error registering push token with backend:', err.message)
              );
            }
          }).catch(tokenErr => {
            console.log('[ListenerLayout] Error getting push token:', tokenErr.message);
          });
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
              }
            });
          }
        }
      }).catch(err => console.log('Error checking active session for listener:', err));
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
    
    const { callerId, callerName, callType, callId, roomId, avatarIndex, gender } = acceptedCall;
    
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
    
    // Get listener's own userId
    let myUserId = '';
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const u = JSON.parse(userData);
        myUserId = u._id || u.id || '';
      }
    } catch (e) {}
    
    // Route to call screen — listenerId is the listener's own ID (us)
    const targetScreen = callType === 'video' ? '/(call)/video-call' : '/(call)/audio-call';
    router.push({
      pathname: targetScreen,
      params: {
        name: callerName,
        callId,
        roomId,
        listenerId: myUserId, // Listener's own userId for gifting/endCall
        userId: callerId,     // The user who called us
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
        calls={incomingCalls}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
      />
    </View>
  );
}
