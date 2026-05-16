import { View, Text, StyleSheet, TouchableOpacity, Animated, Image } from 'react-native';
import { useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { hp, wp } from '../../utils/responsive';

export default function InsufficientBalancePopup({ visible, onClose, onBuyCoins, balance = 0 }) {
  const slideAnim = useRef(new Animated.Value(500)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 500, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 1000 }]} pointerEvents="box-none">
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.popupContainer, { transform: [{ translateY: slideAnim }], opacity: overlayAnim }]}>
        <LinearGradient
          colors={['#964B00', '#2B1100', '#000000']}
          locations={[0, 0.45, 1]}
          style={styles.popup}
        >
          <TouchableOpacity style={styles.closeBtn} activeOpacity={0.7} onPress={onClose}>
            <Ionicons name="close" size={wp(6)} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          <View style={styles.topSection}>
            <Image
              source={require('../../images/insufficient balance/twemoji_coin.png')}
              style={styles.coinTopLeft}
              resizeMode="contain"
            />
            <Image
              source={require('../../images/insufficient balance/twemoji_coin.png')}
              style={styles.coinTopRight}
              resizeMode="contain"
            />
            <Image
              source={require('../../images/insufficient balance/fluent-color_coin-multiple-48.png')}
              style={styles.coinMiddleLeft}
              resizeMode="contain"
            />
            <Image
              source={require('../../images/insufficient balance/fluent-color_coin-multiple-16.png')}
              style={styles.coinMiddleRight}
              resizeMode="contain"
            />
            <Image
              source={require('../../images/insufficient balance/twemoji_coin-1.png')}
              style={styles.coinBottomRight}
              resizeMode="contain"
            />
            <Text style={styles.balanceNumber}>{balance}</Text>
            <Text style={styles.coinsLabel}>Coins</Text>
          </View>

          <Text style={styles.title}>Insufficient Balance</Text>

          <Text style={styles.subtitle}>
            You currently don't have enough balance{'\n'}
            to make a call or chat, kindly recharge{'\n'}
            first and then enjoy.
          </Text>

          <TouchableOpacity style={styles.buyBtn} activeOpacity={0.85} onPress={onBuyCoins}>
            <Text style={styles.buyBtnText}>Buy Coins</Text>
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)' },
  popupContainer: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  popup: {
    width: '100%', borderTopLeftRadius: wp(8), borderTopRightRadius: wp(8),
    paddingHorizontal: wp(7), paddingTop: hp(4), paddingBottom: hp(4.5),
    alignItems: 'center', borderWidth: 1, borderColor: '#4A2200', borderBottomWidth: 0, overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute', top: hp(2), right: wp(6),
    width: wp(8), height: wp(8), borderRadius: wp(4),
    backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  topSection: { width: '100%', height: hp(20), alignItems: 'center', justifyContent: 'center', marginBottom: hp(2) },
  coinTopLeft: { position: 'absolute', top: 0, left: wp(-2.5), width: wp(15), height: wp(15), transform: [{ rotate: '-15deg' }] },
  coinTopRight: { position: 'absolute', top: hp(-1.2), right: wp(1.2), width: wp(16), height: wp(16) },
  coinMiddleLeft: { position: 'absolute', top: hp(9), left: wp(-4), width: wp(10), height: wp(10) },
  coinMiddleRight: { position: 'absolute', top: hp(7.5), right: wp(5), width: wp(10), height: wp(10) },
  coinBottomRight: { position: 'absolute', top: hp(12), right: wp(-9), width: wp(7.5), height: wp(12.5) },
  balanceNumber: { fontSize: wp(13), fontWeight: '900', color: '#fff', lineHeight: wp(14.5) },
  coinsLabel: { fontSize: wp(3.8), color: '#D1D5DB', marginBottom: hp(2), marginTop: hp(0.2) },
  title: { fontSize: wp(6), fontWeight: '900', color: '#fff', marginBottom: hp(1.2), textAlign: 'center' },
  subtitle: { fontSize: wp(3.5), color: '#9CA3AF', textAlign: 'center', lineHeight: wp(5.5), marginBottom: hp(2) },
  reqRow: { marginBottom: hp(3.5), alignItems: 'center', gap: hp(0.5) },
  reqText: { fontSize: wp(3), color: '#D1D5DB', fontWeight: '500' },
  buyBtn: {
    width: '100%', height: hp(6.5), backgroundColor: '#fff',
    borderRadius: wp(7.5), alignItems: 'center', justifyContent: 'center',
  },
  buyBtnText: { fontSize: wp(4.2), fontWeight: '700', color: '#000' },
});
