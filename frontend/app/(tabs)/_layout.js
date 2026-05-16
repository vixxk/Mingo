import { Tabs, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { s, vs, ms } from '../../utils/responsive';
import { authAPI, userAPI } from '../../utils/api';
import { socketService } from '../../utils/socket';
import IncomingCallPopup from '../../components/shared/IncomingCallPopup';

// Conditional import for expo-notifications to avoid crash in Expo Go (SDK 53+)
let Notifications = null;
const isExpoGo = Constants.appOwnership === 'expo';

if (!isExpoGo) {
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
}

async function registerForPushNotificationsAsync() {
  if (isExpoGo || !Notifications) {
    console.log('Skipping push notification registration in Expo Go');
    return null;
  }

  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
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
      token = (await Notifications.getDevicePushTokenAsync()).data;
    } catch (e) {
      console.log('Error getting push token', e);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

export default function TabLayout() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);

  useEffect(() => {
    const setupSocket = async () => {
      await socketService.connect();
      
      socketService.on('incoming_call', (callData) => {
        console.log('Incoming call received:', callData);
        setIncomingCall(callData);
      });

      socketService.on('new_message_notification', (data) => {
        console.log('New message notification received:', data);
      });
    };

    setupSocket();

    return () => {
      socketService.off('incoming_call');
    };
  }, []);

  const handleAcceptCall = () => {
    if (!incomingCall) return;
    
    const { callerId, callerName, callType, callId, roomId, avatarIndex, gender } = incomingCall;
    
    // Notify caller we accepted
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
        userId: callerId, 
        avatarIndex,
        gender,
        callType,
        isIncoming: 'true'
      }
    });
  };

  const handleRejectCall = () => {
    if (!incomingCall) return;
    socketService.emit('call_rejected', { userId: incomingCall.callerId, reason: 'busy' });
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
        
        // Push notification registration (only if not in Expo Go)
        if (!isExpoGo) {
          registerForPushNotificationsAsync().then(token => {
            if (token) {
              userAPI.updatePushToken(token).catch(e => console.log('Update push token err:', e));
            }
          });
        }
      }
    };
    checkAuth();
    
    return () => {
      socketService.disconnect();
    };
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
