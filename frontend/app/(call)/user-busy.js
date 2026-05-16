import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ms, s, vs, SCREEN_WIDTH } from '../../utils/responsive';

export default function UserBusyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { name = 'Listener', reason } = useLocalSearchParams();

  const pulseAnim = useRef(new Animated.Value(0.8)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const [countdown, setCountdown] = useState(5);

  // Determine display message based on reason
  const getMessage = () => {
    switch (reason) {
      case 'rejected':
        return `${name} is not available right now`;
      case 'timeout':
        return `${name} didn't respond in time`;
      case 'busy':
        return `${name} is on another call`;
      case 'offline':
        return `${name} went offline`;
      default:
        return `${name} is currently unavailable`;
    }
  };

  useEffect(() => {
    // Entry animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.9, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Auto-redirect countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          router.replace('/(tabs)');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <LinearGradient
        colors={['#0A0A0A', '#1A0520', '#0A0A0A']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        style={[
          styles.center,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        {/* Icon */}
        <Animated.View style={[styles.iconRing, { transform: [{ scale: pulseAnim }] }]}>
          <LinearGradient
            colors={['#EF4444', '#DC2626']}
            style={styles.iconBg}
          >
            <Ionicons name="call" size={36} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
          </LinearGradient>
        </Animated.View>

        {/* Message */}
        <Text style={styles.title}>Call Unavailable</Text>
        <Text style={styles.message}>{getMessage()}</Text>

        {/* Suggestion */}
        <View style={styles.suggestionCard}>
          <Ionicons name="information-circle-outline" size={20} color="#A855F7" />
          <Text style={styles.suggestionText}>
            Try again later or connect with another listener
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.85}
            onPress={() => router.replace('/(tabs)')}
          >
            <LinearGradient
              colors={['#A855F7', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtnGradient}
            >
              <Ionicons name="search" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>Find Other Listeners</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.7}
            onPress={() => router.back()}
          >
            <Text style={styles.secondaryBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>

        {/* Countdown */}
        <Text style={styles.countdownText}>
          Redirecting in {countdown}s...
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: s(32),
  },

  iconRing: {
    width: SCREEN_WIDTH * 0.28,
    height: SCREEN_WIDTH * 0.28,
    borderRadius: SCREEN_WIDTH * 0.14,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(28),
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  iconBg: {
    width: SCREEN_WIDTH * 0.2,
    height: SCREEN_WIDTH * 0.2,
    borderRadius: SCREEN_WIDTH * 0.1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontSize: ms(24, 0.3),
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Inter_900Black',
    marginBottom: vs(8),
  },
  message: {
    fontSize: ms(15, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: ms(22),
    marginBottom: vs(24),
  },

  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
    borderRadius: 16,
    paddingHorizontal: s(16),
    paddingVertical: vs(12),
    gap: s(10),
    marginBottom: vs(32),
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.15)',
    maxWidth: '100%',
  },
  suggestionText: {
    flex: 1,
    fontSize: ms(13, 0.3),
    color: '#D1D5DB',
    fontFamily: 'Inter_400Regular',
    lineHeight: ms(18),
  },

  buttonsContainer: {
    width: '100%',
    gap: vs(12),
    marginBottom: vs(20),
  },
  primaryBtn: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  primaryBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: vs(15),
    gap: s(8),
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: ms(16, 0.3),
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: vs(13),
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: '#333',
  },
  secondaryBtnText: {
    color: '#9CA3AF',
    fontSize: ms(15, 0.3),
    fontFamily: 'Inter_500Medium',
  },

  countdownText: {
    fontSize: ms(12, 0.3),
    color: '#4B5563',
    fontFamily: 'Inter_400Regular',
  },
});
