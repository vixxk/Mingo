import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { ms, s, vs, wp, hp } from '../../utils/responsive';

/**
 * Dedicated Payment Processing, Success, and Failure screens for coin purchase flow.
 * Follows Mingo Darkish Red theme matching Help & Support page.
 * Uses percentage-based screen calculations (% wp/hp) for responsive UI consistency.
 */
export default function PaymentStateOverlay({
  visible,
  state = 'processing', // 'processing' | 'success' | 'failed'
  coins = 5000,
  newBalance = 5070,
  errorMessage,
  onViewWallet,
  onBackToHome,
  onTryAgain,
  onClose,
}) {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
      }).start();

      if (state === 'processing') {
        // Continuous pulse & rotation animation for processing loader
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.15, duration: 1000, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
          ])
        ).start();

        Animated.loop(
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          })
        ).start();
      }
    } else {
      scaleAnim.setValue(0.9);
      pulseAnim.setValue(1);
      rotateAnim.setValue(0);
    }
  }, [visible, state]);

  if (!visible) return null;

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlayContainer}>
        <StatusBar style="light" />

        {/* Darkish Red Theme Background Gradient */}
        <LinearGradient
          colors={['#050000', '#1A0000', '#3E0404']}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />

        <Animated.View style={[styles.contentCard, { transform: [{ scale: scaleAnim }] }]}>

          {/* ================= STEP B: PROCESSING SCREEN ================= */}
          {state === 'processing' && (
            <View style={styles.stateBody}>
              <View style={styles.loaderWrap}>
                <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]} />
                <Animated.View style={[styles.spinnerRing, { transform: [{ rotate: spin }] }]}>
                  <LinearGradient
                    colors={['#EF4444', 'transparent', '#B91C1C']}
                    style={styles.spinnerGradient}
                  />
                </Animated.View>
                <View style={styles.centerIconWrap}>
                  <Ionicons name="card-outline" size={wp(9)} color="#F87171" />
                </View>
              </View>

              <Text style={styles.processingTitle}>Payment Processing...</Text>
              <Text style={styles.processingSubtitle}>
                This may take a few seconds.{'\n'}Don't close the app
              </Text>
            </View>
          )}

          {/* ================= STEP C: SUCCESS SCREEN ================= */}
          {state === 'success' && (
            <View style={styles.stateBody}>
              <View style={styles.successIllustrationWrap}>
                <View style={styles.successIconGlow}>
                  <Ionicons name="checkmark-circle" size={wp(22)} color="#22C55E" />
                </View>
              </View>

              <Text style={styles.successTitle}>Payment Successful!</Text>
              <Text style={styles.successSubtitle}>
                {coins} coins have been added to your wallet.
              </Text>

              {/* Balance Pill */}
              <View style={styles.balancePill}>
                <Text style={styles.balancePillIcon}>🪙</Text>
                <Text style={styles.balancePillLabel}>New Balance</Text>
                <Text style={styles.balancePillValue}>{newBalance.toLocaleString()} Coins</Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonStack}>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  activeOpacity={0.85}
                  onPress={onViewWallet || onClose}
                >
                  <LinearGradient
                    colors={['#EF4444', '#B91C1C']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.gradientBtn}
                  >
                    <Text style={styles.primaryBtnText}>View Wallet</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryBtn}
                  activeOpacity={0.7}
                  onPress={onBackToHome || onClose}
                >
                  <Text style={styles.secondaryBtnText}>Back to Home</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ================= STEP D: FAILED SCREEN ================= */}
          {state === 'failed' && (
            <View style={styles.stateBody}>
              <View style={styles.failedIconWrap}>
                <Ionicons name="close-circle" size={wp(22)} color="#EF4444" />
              </View>

              <Text style={styles.failedTitle}>Payment Failed</Text>
              <Text style={styles.failedSubtitle}>
                {errorMessage ||
                  'Incase any amount was deducted, please contact\nsupport@talkmingo.com'}
              </Text>

              {/* Action Buttons */}
              <View style={styles.buttonStack}>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  activeOpacity={0.85}
                  onPress={onTryAgain || onClose}
                >
                  <LinearGradient
                    colors={['#EF4444', '#B91C1C']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.gradientBtn}
                  >
                    <Text style={styles.primaryBtnText}>Try Again</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryBtn}
                  activeOpacity={0.7}
                  onPress={onViewWallet || onClose}
                >
                  <Text style={styles.secondaryBtnText}>Back to Wallet</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Bottom Security Footer Badge */}
          <View style={styles.securityBadge}>
            <Ionicons name="shield-checkmark" size={wp(4.2)} color="#4ADE80" />
            <Text style={styles.securityBadgeText}>Payment secured by Cashfree</Text>
          </View>

        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(5),
  },
  contentCard: {
    width: wp(90),
    maxWidth: s(400),
    backgroundColor: '#121214',
    borderRadius: wp(7),
    paddingHorizontal: wp(6),
    paddingTop: hp(4),
    paddingBottom: hp(3.5),
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  stateBody: {
    width: '100%',
    alignItems: 'center',
  },

  /* Processing Loader Styles */
  loaderWrap: {
    width: wp(28),
    height: wp(28),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(3.5),
    marginTop: hp(1),
  },
  pulseRing: {
    position: 'absolute',
    width: wp(26),
    height: wp(26),
    borderRadius: wp(13),
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  spinnerRing: {
    position: 'absolute',
    width: wp(28),
    height: wp(28),
    borderRadius: wp(14),
    borderWidth: 3,
    borderColor: '#EF4444',
    borderTopColor: 'transparent',
  },
  spinnerGradient: {
    flex: 1,
    borderRadius: wp(14),
  },
  centerIconWrap: {
    width: wp(18),
    height: wp(18),
    borderRadius: wp(9),
    backgroundColor: '#1A0000',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  processingTitle: {
    fontSize: ms(20, 0.3),
    fontWeight: '800',
    color: '#fff',
    fontFamily: 'Inter_800Bold',
    textAlign: 'center',
    marginBottom: hp(1),
  },
  processingSubtitle: {
    fontSize: ms(13.5, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: ms(20),
    marginBottom: hp(4),
  },

  /* Success Styles */
  successIllustrationWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(2.5),
    marginTop: hp(1),
  },
  successIconGlow: {
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 18,
    elevation: 10,
  },
  successTitle: {
    fontSize: ms(22, 0.3),
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Inter_900Black',
    textAlign: 'center',
    marginBottom: hp(0.8),
  },
  successSubtitle: {
    fontSize: ms(13.5, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: ms(19),
    marginBottom: hp(2.5),
  },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: wp(5),
    paddingHorizontal: wp(4.5),
    paddingVertical: hp(1.2),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: hp(3),
    gap: wp(2),
  },
  balancePillIcon: {
    fontSize: ms(16),
  },
  balancePillLabel: {
    fontSize: ms(13, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_500Medium',
  },
  balancePillValue: {
    fontSize: ms(14, 0.3),
    color: '#FBBF24',
    fontFamily: 'Inter_700Bold',
    marginLeft: wp(1),
  },

  /* Failed Styles */
  failedIconWrap: {
    marginBottom: hp(2.5),
    marginTop: hp(1),
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 18,
    elevation: 10,
  },
  failedTitle: {
    fontSize: ms(22, 0.3),
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Inter_900Black',
    textAlign: 'center',
    marginBottom: hp(0.8),
  },
  failedSubtitle: {
    fontSize: ms(13, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: ms(19),
    marginBottom: hp(3),
  },

  /* Buttons */
  buttonStack: {
    width: '100%',
    gap: hp(1.5),
    marginBottom: hp(3),
  },
  primaryBtn: {
    width: '100%',
    height: hp(6.2),
    borderRadius: wp(7.5),
    overflow: 'hidden',
  },
  gradientBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: ms(15, 0.3),
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Inter_700Bold',
  },
  secondaryBtn: {
    width: '100%',
    height: hp(5.8),
    borderRadius: wp(7.5),
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: ms(14, 0.3),
    fontWeight: '600',
    color: '#E5E7EB',
    fontFamily: 'Inter_600SemiBold',
  },

  /* Security Footer Badge */
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.8),
    paddingTop: hp(1),
  },
  securityBadgeText: {
    fontSize: ms(11.5, 0.3),
    color: '#6B7280',
    fontFamily: 'Inter_500Medium',
  },
});
