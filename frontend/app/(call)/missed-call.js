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

/**
 * "Call Missed" screen — shown to the caller when the listener never answered
 * (their incoming-call card rang its full ring count and auto-dismissed, or
 * the caller's own ring timer gave up). Distinct from the "Call Unavailable"
 * (user-busy) screen so a no-answer reads as a missed call, not a rejection.
 */
export default function MissedCallScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    name = 'Listener',
    listenerId,
    callType = 'audio',
    avatarIndex = '0',
    gender = 'Female',
  } = useLocalSearchParams();

  const pulseAnim = useRef(new Animated.Value(0.9)).current;
  const haloAnim = useRef(new Animated.Value(0.6)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(hp(4))).current;

  useEffect(() => {
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

    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.06, duration: 1100, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.94, duration: 1100, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(haloAnim, { toValue: 1, duration: 1100, useNativeDriver: true }),
          Animated.timing(haloAnim, { toValue: 0.35, duration: 1100, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  const callAgain = () => {
    if (!listenerId) {
      router.replace('/(call)/finding-listener', { callType, isRandom: 'true' });
      return;
    }
    router.replace({
      pathname: '/(call)/connecting',
      params: {
        name,
        callType,
        callId: `call_${Date.now()}`,
        roomId: `room_${Date.now()}`,
        listenerId,
        avatarIndex,
        gender,
      },
    });
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Dark amber ambient background — distinct from the red unavailable screen */}
      <LinearGradient
        colors={['#0A0600', '#1A1200', '#3D2E00']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

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
        {/* Missed-call icon: phone + clock badge */}
        <View style={styles.iconWrap}>
          <Animated.View style={[styles.iconHalo, { opacity: haloAnim }]} />
          <Animated.View style={[styles.iconRingOuter, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.iconRingMid}>
              <LinearGradient
                colors={['#F59E0B', '#B45309']}
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
            <View style={styles.badgeWrap}>
              <Ionicons name="time-outline" size={wp(5)} color="#FBBF24" />
            </View>
          </Animated.View>
        </View>

        <Text style={styles.title}>Call Missed</Text>
        <Text style={styles.message}>{name} didn't answer your call</Text>

        {/* Info banner */}
        <View style={styles.suggestionCard}>
          <View style={styles.suggestionIconWrap}>
            <Ionicons name="information" size={wp(4.5)} color="#FDE68A" />
          </View>
          <Text style={styles.suggestionText}>
            You can try calling again or connect with another listener
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Call again"
            onPress={callAgain}
          >
            <LinearGradient
              colors={['#22C55E', '#16A34A', '#064E3B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtnGradient}
            >
              <Ionicons name="call" size={wp(5)} color="#fff" />
              <Text style={styles.primaryBtnText}>Call Again</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Find other listeners"
            onPress={() => router.push({
              pathname: '/(call)/finding-listener',
              params: { callType, isRandom: 'true' },
            })}
          >
            <Ionicons name="search" size={wp(4.6)} color="#FDE68A" />
            <Text style={styles.secondaryBtnText}>Find Other Listeners</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={handleGoBack}
          >
            <Ionicons name="arrow-back" size={wp(4.6)} color="#D4D4D8" />
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0600',
  },

  /* ── Ambient amber background ───────────────────────────── */
  glowTop: {
    position: 'absolute',
    top: -wp(42),
    left: '50%',
    marginLeft: -wp(47.5),
    width: wp(95),
    height: wp(95),
    borderRadius: wp(47.5),
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -wp(38),
    left: '50%',
    marginLeft: -wp(42.5),
    width: wp(85),
    height: wp(85),
    borderRadius: wp(42.5),
    backgroundColor: 'rgba(180, 83, 9, 0.14)',
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(8),
  },

  /* ── Missed-call icon ───────────────────────────────────── */
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
    backgroundColor: 'rgba(245, 158, 11, 0.13)',
  },
  iconRingOuter: {
    width: wp(33),
    height: wp(33),
    borderRadius: wp(16.5),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.28)',
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
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
    borderColor: 'rgba(253, 230, 138, 0.35)',
    backgroundColor: 'rgba(180, 83, 9, 0.25)',
  },
  iconBg: {
    width: wp(16.5),
    height: wp(16.5),
    borderRadius: wp(8.25),
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeWrap: {
    position: 'absolute',
    right: -wp(1),
    bottom: -wp(1),
    width: wp(9),
    height: wp(9),
    borderRadius: wp(4.5),
    backgroundColor: '#0A0600',
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.45)',
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
    backgroundColor: 'rgba(180, 83, 9, 0.3)',
    borderRadius: wp(4),
    paddingHorizontal: wp(4.5),
    paddingVertical: hp(1.6),
    gap: wp(3),
    marginBottom: hp(4),
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.32)',
    maxWidth: '100%',
  },
  suggestionIconWrap: {
    width: wp(8),
    height: wp(8),
    borderRadius: wp(4),
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionText: {
    flex: 1,
    fontSize: wp(3.5),
    color: '#FDE68A',
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
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: hp(0.8) },
    shadowOpacity: 0.3,
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
    borderColor: 'rgba(245, 158, 11, 0.35)',
    backgroundColor: 'rgba(180, 83, 9, 0.14)',
    gap: wp(2),
  },
  secondaryBtnText: {
    color: '#FDE68A',
    fontSize: wp(4),
    fontFamily: 'Inter_500Medium',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1.5),
    gap: wp(2),
  },
  backBtnText: {
    color: '#D4D4D8',
    fontSize: wp(4),
    fontFamily: 'Inter_500Medium',
  },
});
