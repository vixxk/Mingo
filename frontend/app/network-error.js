import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { wp, hp } from '../utils/responsive';
import { authAPI, setNetworkErrorScreenOpen } from '../utils/api';
import ToastNotification from '../components/shared/ToastNotification';

export default function NetworkErrorScreen() {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  const [status, setStatus] = useState('offline'); // 'offline' | 'restored'
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });

  useEffect(() => {
    setNetworkErrorScreenOpen(true);
    return () => {
      setNetworkErrorScreenOpen(false);
    };
  }, []);

  const hasRestoredRef = React.useRef(false);

  const handleSuccess = async (intervalId) => {
    // Prevent double-invocation from retry button and auto-poll racing
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    if (intervalId) clearInterval(intervalId);
    setStatus('restored');
    
    const loggedIn = await authAPI.isLoggedIn();
    let role = 'USER';
    if (loggedIn) {
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const userStr = await AsyncStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          role = user.role || 'USER';
        }
      } catch (e) {
        console.log('Error reading role in network error success handler:', e);
      }
    }

    // Always do a clean redirect — never router.back(), because the previous
    // screen will re-trigger the same failing API call and bounce us right back here.
    setTimeout(() => {
      if (!loggedIn) {
        router.replace('/welcome');
      } else if (role === 'ADMIN') {
        router.replace('/(admin)');
      } else if (role === 'LISTENER') {
        router.replace('/(listener)');
      } else {
        router.replace('/(tabs)');
      }
    }, 1200);
  };

  const handleRetry = async () => {
    if (retrying || status === 'restored') return;
    setRetrying(true);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 10000); // 10 seconds timeout — generous for mobile networks
    
    try {
      // Test server connection using unauthenticated health check
      await authAPI.healthCheck({ signal: controller.signal });
      clearTimeout(timeoutId);
      await handleSuccess();
    } catch (error) {
      clearTimeout(timeoutId);
      console.log('Retry failed:', error);
      
      // Even if healthCheck failed, if it returned a response with a status code (e.g. 401, 500), the server is online/reachable!
      if (error.status) {
        await handleSuccess();
        return;
      }
      
      const isTimeout = error.name === 'AbortError' || error.message?.includes('aborted');
      setToast({
        visible: true,
        message: isTimeout 
          ? 'Connection timed out. Please check your network connection.'
          : 'Connection Failed: We still cannot reach the server. Please verify your connection.',
        type: 'error'
      });
    } finally {
      setRetrying(false);
    }
  };

  useEffect(() => {
    let isChecking = false;
    const intervalId = setInterval(async () => {
      if (retrying || isChecking || status === 'restored') return;
      
      isChecking = true;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 5000); // 5 seconds timeout

      try {
        await authAPI.healthCheck({ signal: controller.signal });
        clearTimeout(timeoutId);
        await handleSuccess(intervalId);
      } catch (error) {
        clearTimeout(timeoutId);
        if (error.status) {
          await handleSuccess(intervalId);
        }
      } finally {
        isChecking = false;
      }
    }, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, [retrying, status]);

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@talkmingo.com?subject=Network%20Issue%20Report').catch((err) => {
      console.error('Failed to open email client:', err);
      Alert.alert('Error', 'Unable to open email client. Please email us at support@talkmingo.com');
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ToastNotification
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast(prev => ({ ...prev, visible: false }))}
      />

      <View style={styles.content}>
        {/* Title */}
        <Text style={styles.title}>
          {status === 'restored' ? 'Connection Restored!' : 'Oops! Something Went Wrong'}
        </Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          {status === 'restored'
            ? 'Welcoming you back... We are redirecting you to your screen.'
            : "We couldn't complete your request. Please check your internet connection or try again later."}
        </Text>

        {/* Center Illustration (Offline Cloud in circular frame) */}
        <View style={[styles.iconCircle, status === 'restored' && { borderColor: 'rgba(16, 185, 129, 0.4)' }]}>
          {status === 'restored' ? (
            <Ionicons name="checkmark-circle-outline" size={hp(7.5)} color="#10B981" />
          ) : (
            <Ionicons name="cloud-offline-outline" size={hp(7.5)} color="#fff" />
          )}
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.retryButton, status === 'restored' && { backgroundColor: '#10B981' }]}
          activeOpacity={0.8}
          onPress={handleRetry}
          disabled={retrying || status === 'restored'}
        >
          {status === 'restored' ? (
            <Ionicons name="checkmark" size={20} color="#fff" />
          ) : retrying ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.retryText}>Retry</Text>
          )}
        </TouchableOpacity>

        {/* Footer Support link */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Still having issues? </Text>
          <TouchableOpacity onPress={handleContactSupport} activeOpacity={0.7}>
            <Text style={styles.supportLink}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    width: wp(100),
    alignItems: 'center',
    paddingHorizontal: wp(8),
  },
  title: {
    fontSize: wp(6.2),
    fontWeight: '800',
    color: '#ffffff',
    fontFamily: 'Inter_900Black',
    textAlign: 'center',
    marginBottom: hp(2),
  },
  subtitle: {
    fontSize: wp(4),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: hp(2.8),
    marginBottom: hp(6),
    paddingHorizontal: wp(2),
  },
  iconCircle: {
    width: wp(40),
    height: wp(40),
    borderRadius: wp(20),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(8),
  },
  retryButton: {
    width: wp(80),
    height: hp(6.5),
    backgroundColor: '#ffffff',
    borderRadius: hp(3.25),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(3.5),
  },
  retryText: {
    color: '#000000',
    fontSize: wp(4.2),
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(1),
  },
  footerText: {
    color: '#9CA3AF',
    fontSize: wp(3.8),
    fontFamily: 'Inter_400Regular',
  },
  supportLink: {
    color: '#D8B4FE', // A beautiful light purple/pink matching the theme
    fontSize: wp(3.8),
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
});
