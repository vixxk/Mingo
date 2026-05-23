import { View, Text, StyleSheet, Animated, Image, TouchableOpacity, Linking, AppState, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { ms, s, vs, SCREEN_WIDTH, SCREEN_HEIGHT } from '../utils/responsive';

import { Notifications } from '../utils/notifications';
import { authAPI } from '../utils/api';

export default function SplashScreenPage() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const [showPermissionScreen, setShowPermissionScreen] = useState(false);

  const verifyPermissions = async () => {
    try {
      const micStatus = await Camera.getMicrophonePermissionsAsync();
      const cameraStatus = await Camera.getCameraPermissionsAsync();
      
      let notifGranted = true;
      if (Notifications) {
        const notifStatus = await Notifications.getPermissionsAsync();
        notifGranted = notifStatus.granted;
      }

      if (micStatus.granted && cameraStatus.granted && notifGranted) {
        setShowPermissionScreen(false);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Error verifying permissions:', e);
      return false;
    }
  };

  const requestAndVerify = async () => {
    try {
      // First check if already granted
      const alreadyGranted = await verifyPermissions();
      if (alreadyGranted) {
        setShowPermissionScreen(false);
        checkAuthAndRedirect();
        return;
      }

      // Request microphone
      const micReq = await Camera.requestMicrophonePermissionsAsync();
      
      // Request camera
      const cameraReq = await Camera.requestCameraPermissionsAsync();

      // Request notifications
      let notifGranted = true;
      if (Notifications) {
        const notifReq = await Notifications.requestPermissionsAsync();
        notifGranted = notifReq.granted;
      }

      const allGranted = micReq.granted && cameraReq.granted && notifGranted;
      if (allGranted) {
        setShowPermissionScreen(false);
        checkAuthAndRedirect();
      } else {
        setShowPermissionScreen(true);
        // Show user-friendly feedback alert
        Alert.alert(
          "Permissions Required",
          "Camera, Microphone, and Notification permissions are required to use Mingo. Please enable them in system settings.",
          [
            { text: "Open Settings", onPress: handleOpenSettings },
            { text: "Cancel", style: "cancel" }
          ]
        );
      }
    } catch (e) {
      console.error('Error requesting permissions:', e);
      setShowPermissionScreen(true);
    }
  };

  const checkAuthAndRedirect = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      const userToken = await AsyncStorage.getItem('userToken') || await AsyncStorage.getItem('token');

      let role = 'USER';
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user.role) role = user.role;
        } catch (e) {}
      }

      if (userToken) {
        try {
          const meRes = await authAPI.me();
          if (meRes?.data?.isBanned) {
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('user');
            router.replace('/banned');
            return;
          }
          if (meRes?.data) {
            role = meRes.data.role || 'USER';
            await AsyncStorage.setItem('user', JSON.stringify(meRes.data));
          }
        } catch (authErr) {
          console.log('Error verifying user during splash check:', authErr);
          if (authErr.status === 403) {
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('user');
            router.replace('/banned');
            return;
          }
        }
      }

      if (role === 'ADMIN') {
        router.replace('/(admin)');
      } else if (role === 'LISTENER') {
        router.replace('/(listener)');
      } else if (userToken) {
        router.replace('/(tabs)');
      } else {
        router.replace('/welcome');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      router.replace('/welcome');
    }
  };

  useEffect(() => {
    // Start animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Request permissions after a short delay so animation can finish smoothly
    const timer = setTimeout(() => {
      requestAndVerify();
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // Listen for AppState changes to re-check permissions when user comes back from Settings
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active' && showPermissionScreen) {
        const granted = await verifyPermissions();
        if (granted) {
          checkAuthAndRedirect();
        }
      }
    });
    return () => subscription.remove();
  }, [showPermissionScreen]);

  const handleOpenSettings = () => {
    Linking.openSettings();
  };

  if (showPermissionScreen) {
    return (
      <LinearGradient
        colors={['#1F1235', '#0E081C', '#040209']}
        style={styles.container}
      >
        <StatusBar style="light" />
        <View style={styles.permissionCard}>
          <Text style={styles.permissionTitle}>Permissions Required</Text>
          <Text style={styles.permissionDesc}>
            To start using Mingo for calling and chatting with listeners, please allow the following permissions:
          </Text>

          <View style={styles.permissionList}>
            <View style={styles.permissionItem}>
              <View style={[styles.iconWrapper, { backgroundColor: 'rgba(124, 58, 237, 0.15)' }]}>
                <Ionicons name="mic-outline" size={24} color="#C084FC" />
              </View>
              <View style={styles.permissionTextContainer}>
                <Text style={styles.permissionName}>Microphone</Text>
                <Text style={styles.permissionInfo}>Required for audio calls and speaking to listeners.</Text>
              </View>
            </View>

            <View style={styles.permissionItem}>
              <View style={[styles.iconWrapper, { backgroundColor: 'rgba(219, 39, 119, 0.15)' }]}>
                <Ionicons name="videocam-outline" size={24} color="#F472B6" />
              </View>
              <View style={styles.permissionTextContainer}>
                <Text style={styles.permissionName}>Camera</Text>
                <Text style={styles.permissionInfo}>Required for video calls.</Text>
              </View>
            </View>

            <View style={styles.permissionItem}>
              <View style={[styles.iconWrapper, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                <Ionicons name="notifications-outline" size={24} color="#60A5FA" />
              </View>
              <View style={styles.permissionTextContainer}>
                <Text style={styles.permissionName}>Notifications</Text>
                <Text style={styles.permissionInfo}>Required to alert you of incoming calls and messages.</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleOpenSettings} activeOpacity={0.8}>
            <Text style={styles.primaryBtnText}>Open Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={async () => {
            const granted = await verifyPermissions();
            if (granted) {
              checkAuthAndRedirect();
            } else {
              requestAndVerify();
            }
          }} activeOpacity={0.7}>
            <Text style={styles.secondaryBtnText}>Check Again / Grant</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#2563EB', '#7C3AED', '#DB2777', '#EA580C', '#F59E0B']}
      locations={[0, 0.25, 0.5, 0.75, 1]}
      style={styles.container}
    >
      <StatusBar style="light" />
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.logoRow}>
          <Image 
            source={require('../images/Mingo Splash Text.png')} 
            style={{ width: SCREEN_WIDTH * 0.8, height: SCREEN_HEIGHT * 0.2 }} 
            resizeMode="contain" 
          />
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionCard: {
    width: SCREEN_WIDTH * 0.9,
    backgroundColor: 'rgba(25, 18, 48, 0.75)',
    borderRadius: 24,
    padding: ms(24),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  permissionTitle: {
    fontSize: ms(22, 0.3),
    fontFamily: 'Inter_700Bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: vs(12),
  },
  permissionDesc: {
    fontSize: ms(14, 0.3),
    fontFamily: 'Inter_400Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: vs(20),
    marginBottom: vs(24),
  },
  permissionList: {
    gap: vs(16),
    marginBottom: vs(28),
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: ms(12),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  iconWrapper: {
    width: ms(44),
    height: ms(44),
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: s(12),
  },
  permissionTextContainer: {
    flex: 1,
  },
  permissionName: {
    fontSize: ms(15, 0.3),
    fontFamily: 'Inter_700Bold',
    color: '#FFF',
    marginBottom: vs(2),
  },
  permissionInfo: {
    fontSize: ms(12, 0.3),
    fontFamily: 'Inter_400Regular',
    color: '#9CA3AF',
    lineHeight: vs(16),
  },
  primaryBtn: {
    backgroundColor: '#7C3AED',
    paddingVertical: vs(14),
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: vs(12),
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: ms(16, 0.3),
    fontFamily: 'Inter_700Bold',
  },
  secondaryBtn: {
    paddingVertical: vs(12),
    borderRadius: 16,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#9CA3AF',
    fontSize: ms(14, 0.3),
    fontFamily: 'Inter_500Medium',
    textDecorationLine: 'underline',
  },
});
