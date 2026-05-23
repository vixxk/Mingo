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

import { registerForPushNotificationsAsync } from '../../utils/notifications';

export default function TabLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
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
        setIncomingCall(callData);
      });

      socketService.on('call_cancelled', (data) => {
        console.log('Call cancelled by caller:', data);
        setIncomingCall(null);
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

  const handleAcceptCall = () => {
    if (!incomingCall) return;
    
    const { callerId, callerName, callType, callId, roomId, avatarIndex, gender } = incomingCall;
    
    // Notify caller we accepted
    socketService.emit('call_accepted', { userId: callerId, sessionId: callId, roomId });
    
    setIncomingCall(null);
    
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

  const handleRejectCall = () => {
    if (!incomingCall) return;
    socketService.emit('call_rejected', { 
      userId: incomingCall.callerId, 
      sessionId: incomingCall.callId,
      reason: 'busy' 
    });
    setIncomingCall(null);
  };

  useEffect(() => {
    const checkAuth = async () => {
      const loggedIn = await authAPI.isLoggedIn();
      if (!loggedIn) {
        router.replace('/welcome');
      } else {
        setIsAuthenticated(true);
        socketService.connect();
        
        // Push notification registration
        registerForPushNotificationsAsync().then(token => {
          if (token) {
            userAPI.updatePushToken(token).catch(e => console.log('Update push token err:', e));
          }
        });

        // Redirect to ongoing active session if any
        callAPI.getActiveSession().then(res => {
          if (res?.data) {
            const session = res.data;
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
            height: Platform.OS === 'ios' ? vs(75) + insets.bottom : vs(65),
            paddingBottom: Platform.OS === 'ios' ? insets.bottom : vs(8),
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
          name="recent-calls"
          options={{
            title: 'Recent Calls',
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
