import React, { useState, useEffect, useRef } from 'react';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform, Alert, AppState } from 'react-native';
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
  const incomingCallsRef = useRef([]);
  
  useEffect(() => {
    incomingCallsRef.current = incomingCalls;
  }, [incomingCalls]);

  // Track whether listener is on a chat screen
  useEffect(() => {
    isChatOpenRef.current = segments && (segments.includes('(chat)') || segments.includes('chat'));
  }, [segments]);

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
        Alert.alert('Call Cancelled', 'This call has been cancelled by the user.', [{ text: 'OK' }]);
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
    const otherCalls = incomingCallsRef.current.filter(c => c.callId !== callId);
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

  const handleRejectCall = async (rejectedCall) => {
    if (!rejectedCall) return;
    
    // Ensure socket is connected before emitting events
    await socketService.connect();

    socketService.emit('call_rejected', { 
      userId: rejectedCall.callerId, 
      sessionId: rejectedCall.callId,
      reason: 'busy' 
    });
    setIncomingCalls(prev => prev.filter(c => c.callId !== rejectedCall.callId));
  };

  const handleAcceptCallRef = useRef(handleAcceptCall);
  const handleRejectCallRef = useRef(handleRejectCall);

  useEffect(() => {
    handleAcceptCallRef.current = handleAcceptCall;
    handleRejectCallRef.current = handleRejectCall;
  }, [handleAcceptCall, handleRejectCall]);

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

      socketService.on('accept_incoming_call', (callData) => {
        console.log('Incoming call accepted via local trigger:', callData);
        handleAcceptCallRef.current(callData);
      });

      socketService.on('reject_incoming_call', (callData) => {
        console.log('Incoming call rejected via local trigger:', callData);
        handleRejectCallRef.current(callData);
      });

      // Check for pending local triggers from notification clicks
      if (socketService.pendingAcceptCall) {
        const pending = socketService.pendingAcceptCall;
        socketService.pendingAcceptCall = null;
        console.log('[ListenerLayout] Found pending accept call event, executing:', pending);
        handleAcceptCallRef.current(pending);
      } else if (socketService.pendingRejectCall) {
        const pending = socketService.pendingRejectCall;
        socketService.pendingRejectCall = null;
        console.log('[ListenerLayout] Found pending reject call event, executing:', pending);
        handleRejectCallRef.current(pending);
      } else if (socketService.pendingIncomingCall) {
        const pending = socketService.pendingIncomingCall;
        socketService.pendingIncomingCall = null;
        console.log('[ListenerLayout] Found pending incoming call event, displaying popup:', pending);
        setIncomingCalls((prev) => {
          if (prev.some(c => c.callId === pending.callId)) return prev;
          return [...prev, pending];
        });
      }

      socketService.on('call_cancelled', (data) => {
        console.log('Call cancelled by user:', data);
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

      // OneSignal push notification initialization
      try {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          initializeOneSignal(user._id || user.id, user.role || 'LISTENER');
          
          // Also fetch and update the Expo/FCM push token on the backend
          const { registerForPushNotificationsAsync } = require('../../utils/notifications');
          registerForPushNotificationsAsync().then(token => {
            if (token && token !== 'expo-go-mock-token' && token.length > 10) {
              console.log('[ListenerLayout] Fetched valid push token, registering with backend:', token);
              userAPI.updatePushToken(token).catch(err => 
                console.log('[ListenerLayout] Error registering push token with backend:', err.message)
              );
            } else {
              console.log('[ListenerLayout] Skipping push token registration — token is invalid or mock:', token);
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
      socketService.off('accept_incoming_call');
      socketService.off('reject_incoming_call');
      socketService.off('call_cancelled');
      socketService.off('account_banned');
    };
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
