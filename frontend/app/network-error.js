import React, { useState } from 'react';
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
import { authAPI } from '../utils/api';

export default function NetworkErrorScreen() {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      // Test server connection
      await authAPI.me();
      // If successful, go back or navigate to tabs
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.log('Retry failed:', error);
      Alert.alert(
        'Connection Failed',
        'We still cannot reach the server. Please verify your connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setRetrying(false);
    }
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@mingo.com?subject=Network%20Issue%20Report').catch((err) => {
      console.error('Failed to open email client:', err);
      Alert.alert('Error', 'Unable to open email client. Please email us at support@mingo.com');
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.content}>
        {/* Title */}
        <Text style={styles.title}>Oops! Something Went Wrong</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          We couldn't complete your request. Please check your internet connection or try again later.
        </Text>

        {/* Center Illustration (Offline Cloud in circular frame) */}
        <View style={styles.iconCircle}>
          <Ionicons name="cloud-offline-outline" size={hp(7.5)} color="#fff" />
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={styles.retryButton}
          activeOpacity={0.8}
          onPress={handleRetry}
          disabled={retrying}
        >
          {retrying ? (
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
