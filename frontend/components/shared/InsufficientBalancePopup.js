import { View, Text, StyleSheet, TouchableOpacity, Animated, Image } from 'react-native';
import { useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ms, s, vs } from '../../utils/responsive';

export default function InsufficientBalancePopup({ visible, onClose, onBuyCoins }) {
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
      {}
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      {}
      <Animated.View style={[styles.popupContainer, { transform: [{ translateY: slideAnim }], opacity: overlayAnim }]}>
        <LinearGradient
          colors={['#964B00', '#2B1100', '#000000']}
          locations={[0, 0.45, 1]}
          style={styles.popup}
        >
          {}
          <TouchableOpacity 
            style={styles.closeBtn} 
            activeOpacity={0.7} 
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          {}
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

            {}
            <Text style={styles.balanceNumber}>0</Text>
            <Text style={styles.coinsLabel}>Coins</Text>
          </View>

          {}
          <Text style={styles.title}>Insufficient Balance</Text>

          {}
          <Text style={styles.subtitle}>
            You currently don't have enough balance{'\n'}
            to make a call, kindly recharge first and{'\n'}
            then enjoy.
          </Text>

          {}
          <TouchableOpacity
            style={styles.buyBtn}
            activeOpacity={0.85}
            onPress={onBuyCoins}
          >
            <Text style={styles.buyBtnText}>Buy Coins</Text>
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  popupContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  popup: {
    width: '100%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: s(28),
    paddingTop: vs(32),
    paddingBottom: vs(36),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4A2200',
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute',
    top: vs(16),
    right: s(24),
    width: s(32),
    height: s(32),
    borderRadius: s(16),
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  topSection: {
    width: '100%',
    height: vs(160),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(16),
  },
  coinTopLeft: {
    position: 'absolute',
    top: vs(0),
    left: s(-10),
    width: s(60),
    height: s(60),
    transform: [{ rotate: '-15deg' }],
  },
  coinTopRight: {
    position: 'absolute',
    top: vs(-10),
    right: s(5),
    width: s(65),
    height: s(65),
  },
  coinMiddleLeft: {
    position: 'absolute',
    top: vs(75),
    left: s(-15),
    width: s(40),
    height: s(40),
  },
  coinMiddleRight: {
    position: 'absolute',
    top: vs(60),
    right: s(20),
    width: s(40),
    height: s(40),
  },
  coinBottomRight: {
    position: 'absolute',
    top: vs(95),
    right: s(-35),
    width: s(30),
    height: s(50),
  },
  balanceNumber: {
    fontSize: ms(52, 0.3),
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Inter_900Black',
    lineHeight: ms(58),
  },
  coinsLabel: {
    fontSize: ms(15, 0.3),
    color: '#D1D5DB',
    fontFamily: 'Inter_400Regular',
    marginBottom: vs(16),
    marginTop: vs(2),
  },
  title: {
    fontSize: ms(24, 0.3),
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Inter_900Black',
    marginBottom: vs(10),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: ms(14, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: ms(22),
    marginBottom: vs(28),
  },
  buyBtn: {
    width: '100%',
    height: vs(52),
    backgroundColor: '#fff',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyBtnText: {
    fontSize: ms(17, 0.3),
    fontWeight: '700',
    color: '#000',
    fontFamily: 'Inter_700Bold',
  },
});
