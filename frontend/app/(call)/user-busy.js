import { useEffect, useRef } from 'react';
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
import { wp, hp } from '../../utils/responsive';

export default function UserBusyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { name = 'Listener', reason, callType = 'audio' } = useLocalSearchParams();

  const pulseAnim = useRef(new Animated.Value(0.85)).current;
  const haloAnim = useRef(new Animated.Value(0.6)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(hp(4))).current;

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
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for the icon ring + breathing glow
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 1100, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.92, duration: 1100, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(haloAnim, { toValue: 1, duration: 1100, useNativeDriver: true }),
          Animated.timing(haloAnim, { toValue: 0.35, duration: 1100, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  // NOTE: no auto-redirect — this screen stays until the user taps a button.

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Blackish-red ambient background */}
      <LinearGradient
        colors={['#0A0000', '#1A0000', '#3D0000']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Soft red glow blobs */}
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

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
        {/* ── Redesigned call-end icon: breathing halo + layered rings ── */}
        <View style={styles.iconWrap}>
          <Animated.View style={[styles.iconHalo, { opacity: haloAnim }]} />
          <Animated.View style={[styles.iconRingOuter, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.iconRingMid}>
              <LinearGradient
                colors={['#EF4444', '#B91C1C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconBg}
              >
                <Ionicons
                  name="call"
                  size={wp(9)}
                  color="#fff"
                  style={{ transform: [{ rotate: '135deg' }] }}
                />
              </LinearGradient>
            </View>
          </Animated.View>
        </View>

        {/* Message */}
        <Text style={styles.title}>Call Unavailable</Text>
        <Text style={styles.message}>{getMessage()}</Text>

        {/* Info banner */}
        <View style={styles.suggestionCard}>
          <View style={styles.suggestionIconWrap}>
            <Ionicons name="information" size={wp(4.5)} color="#FCA5A5" />
          </View>
          <Text style={styles.suggestionText}>
            Try again later or connect with another listener
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Find other listeners"
            onPress={() => router.push({
              pathname: '/(call)/finding-listener',
              params: { callType, isRandom: 'true' }
            })}
          >
            <LinearGradient
              colors={['#EF4444', '#B91C1C', '#450A0A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtnGradient}
            >
              <Ionicons name="search" size={wp(5)} color="#fff" />
              <Text style={styles.primaryBtnText}>Find Other Listeners</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={wp(4.6)} color="#FCA5A5" />
            <Text style={styles.secondaryBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0000',
  },

  /* ── Ambient red background ─────────────────────────────── */
  glowTop: {
    position: 'absolute',
    top: -wp(42),
    left: '50%',
    marginLeft: -wp(47.5),
    width: wp(95),
    height: wp(95),
    borderRadius: wp(47.5),
    backgroundColor: 'rgba(220, 38, 38, 0.09)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -wp(38),
    left: '50%',
    marginLeft: -wp(42.5),
    width: wp(85),
    height: wp(85),
    borderRadius: wp(42.5),
    backgroundColor: 'rgba(127, 29, 29, 0.16)',
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(8),
  },

  /* ── Redesigned call-end icon ───────────────────────────── */
  iconWrap: {
    width: wp(42),
    height: wp(42),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(4.2),
  },
  iconHalo: {
    position: 'absolute',
    width: wp(42),
    height: wp(42),
    borderRadius: wp(21),
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
  },
  iconRingOuter: {
    width: wp(33),
    height: wp(33),
    borderRadius: wp(16.5),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.28)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: wp(4),
    elevation: 8,
  },
  iconRingMid: {
    width: wp(23),
    height: wp(23),
    borderRadius: wp(11.5),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(252, 165, 165, 0.35)',
    backgroundColor: 'rgba(153, 27, 27, 0.25)',
  },
  iconBg: {
    width: wp(16.5),
    height: wp(16.5),
    borderRadius: wp(8.25),
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Text ───────────────────────────────────────────────── */
  title: {
    fontSize: wp(7),
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Inter_900Black',
    marginBottom: hp(1),
  },
  message: {
    fontSize: wp(4),
    color: '#D4D4D8',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: wp(5.6),
    marginBottom: hp(3.2),
  },

  /* ── Info banner ────────────────────────────────────────── */
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(127, 29, 29, 0.35)',
    borderRadius: wp(4),
    paddingHorizontal: wp(4.5),
    paddingVertical: hp(1.6),
    gap: wp(3),
    marginBottom: hp(4),
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.32)',
    maxWidth: '100%',
  },
  suggestionIconWrap: {
    width: wp(8),
    height: wp(8),
    borderRadius: wp(4),
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionText: {
    flex: 1,
    fontSize: wp(3.5),
    color: '#FECACA',
    fontFamily: 'Inter_400Regular',
    lineHeight: wp(4.8),
  },

  /* ── Buttons ────────────────────────────────────────────── */
  buttonsContainer: {
    width: '100%',
    gap: hp(1.6),
    marginBottom: hp(2),
  },
  primaryBtn: {
    borderRadius: wp(8),
    overflow: 'hidden',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: hp(0.8) },
    shadowOpacity: 0.35,
    shadowRadius: wp(3),
    elevation: 6,
  },
  primaryBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1.9),
    gap: wp(2),
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: wp(4.2),
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1.7),
    borderRadius: wp(8),
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    backgroundColor: 'rgba(127, 29, 29, 0.14)',
    gap: wp(2),
  },
  secondaryBtnText: {
    color: '#FCA5A5',
    fontSize: wp(4),
    fontFamily: 'Inter_500Medium',
  },
});
