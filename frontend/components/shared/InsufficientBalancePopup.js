import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { hp, wp } from '../../utils/responsive';

export default function InsufficientBalancePopup({
  visible,
  onClose,
  onBuyCoins,
  balance = 0,
  title = 'Insufficient Balance',
  subtitle,
  buttonLabel = 'Buy Coins',
}) {
  const slideAnim = useRef(new Animated.Value(500)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
      ]).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 500, duration: 200, useNativeDriver: true }),
      ]).start();
      pulseAnim.setValue(1);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 1000 }]} pointerEvents="box-none">
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.popupContainer, { transform: [{ translateY: slideAnim }] }]}>
        <LinearGradient
          colors={['#1C0505', '#0F0A0A', '#080202']}
          locations={[0, 0.5, 1]}
          style={styles.popup}
        >
          <View style={styles.handleBar} />

          <TouchableOpacity style={styles.closeBtn} activeOpacity={0.7} onPress={onClose}>
            <Ionicons name="close" size={wp(5)} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          <View style={styles.iconSection}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <LinearGradient
                colors={['#DC2626', '#991B1B']}
                style={styles.iconCircle}
              >
                <Ionicons name="wallet-outline" size={wp(10)} color="#fff" />
              </LinearGradient>
            </Animated.View>
          </View>

          <View style={styles.balanceRow}>
            <LinearGradient
              colors={['rgba(220,38,38,0.2)', 'rgba(220,38,38,0.05)']}
              style={styles.coinBadge}
            >
              <Text style={styles.coinIcon}>🪙</Text>
              <Text style={styles.coinCount}>{balance}</Text>
            </LinearGradient>
          </View>

          <Text style={styles.title}>{title}</Text>

          <Text style={styles.subtitle}>
            {subtitle || "You currently don't have enough balance.\nTo make a call or chat, kindly recharge first and then enjoy."}
          </Text>

          <TouchableOpacity style={styles.buyBtn} activeOpacity={0.85} onPress={onBuyCoins}>
            <LinearGradient
              colors={['#DC2626', '#991B1B', '#7F1D1D']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buyBtnGradient}
            >
<Text style={styles.buyBtnText}>{buttonLabel}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)' },
  popupContainer: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  popup: {
    width: '100%', borderTopLeftRadius: wp(8), borderTopRightRadius: wp(8),
    paddingHorizontal: wp(7), paddingTop: hp(1.5), paddingBottom: hp(4.5),
    alignItems: 'center', borderWidth: 1, borderColor: '#3B0000', borderBottomWidth: 0,
  },
  handleBar: {
    width: wp(12), height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,0,0,0.1)', marginBottom: hp(2),
  },
  closeBtn: {
    position: 'absolute', top: hp(2), right: wp(5),
    width: wp(8), height: wp(8), borderRadius: wp(4),
    backgroundColor: 'rgba(255,0,0,0.08)',
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  iconSection: {
    marginBottom: hp(1.5),
  },
  iconCircle: {
    width: wp(20), height: wp(20), borderRadius: wp(10),
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#DC2626', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 20, elevation: 10,
  },
  balanceRow: {
    marginBottom: hp(1.5),
  },
  coinBadge: {
    flexDirection: 'row', alignItems: 'center', gap: wp(2),
    paddingHorizontal: wp(5), paddingVertical: hp(0.8),
    borderRadius: wp(5), borderWidth: 1, borderColor: 'rgba(220,38,38,0.3)',
  },
  coinIcon: { fontSize: wp(4.5) },
  coinCount: { fontSize: wp(4.5), fontWeight: '900', color: '#EF4444' },
  title: {
    fontSize: wp(6), fontWeight: '900', color: '#fff',
    marginBottom: hp(1.2), textAlign: 'center', fontFamily: 'Inter_900Black',
  },
  subtitle: {
    fontSize: wp(3.5), color: '#9CA3AF', textAlign: 'center',
    lineHeight: wp(5.5), marginBottom: hp(3),
  },
  buyBtn: {
    width: '100%', height: hp(6.5), borderRadius: wp(7.5),
    overflow: 'hidden',
  },
  buyBtnGradient: {
    flex: 1, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
  },
  buyBtnText: {
    fontSize: wp(4.2), fontWeight: '700', color: '#fff',
  },
});