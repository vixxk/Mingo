import { View, Text, StyleSheet, TouchableOpacity, Animated, Image } from 'react-native';
import { useRef, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ms, s, vs, wp, hp, SCREEN_WIDTH, SCREEN_HEIGHT } from '../../utils/responsive';
import AnimatedSparkles from './AnimatedSparkles';

const formatTime = (totalSeconds) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const sec = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}h: ${String(m).padStart(2, '0')}m: ${String(sec).padStart(2, '0')}s left`;
};

export default function CoinsOfferPopup({ visible, onClose, onAddCoins, timeLeft: timeLeftProp, offerData }) {
  const slideAnim = useRef(new Animated.Value(500)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const [internalTimeLeft, setInternalTimeLeft] = useState(timeLeftProp || 0);

  useEffect(() => {
    if (timeLeftProp !== undefined) {
      setInternalTimeLeft(timeLeftProp);
    }
  }, [timeLeftProp]);

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

  const defaultOffer = { title: 'Starter Offer', coins: 80, originalPrice: 62, newPrice: 62 };
  const offer = offerData || defaultOffer;

  const titleText = offer.title 
    ? (offer.title.toLowerCase().includes('off') || offer.title.toLowerCase().includes('offer') ? offer.title : `Flat ${offer.title}`)
    : 'Special Offer';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.popupContainer, { transform: [{ translateY: slideAnim }] }]}>
        <LinearGradient
          colors={['#000', '#052E16', '#14532D']}
          locations={[0, 0.55, 1]}
          style={styles.popup}
        >
          <AnimatedSparkles color="#34D399" size={18} />
          <View style={styles.handleBar} />
          <TouchableOpacity style={styles.closeBtn} activeOpacity={0.7} onPress={onClose}>
            <Ionicons name="close" size={wp(5)} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.offerSubtitle}>Limited Time Offer</Text>
          <Text style={styles.offerTitle}>{titleText}</Text>

          <View style={styles.coinsImageWrap}>
            <Image
              source={
                offer.iconUrl 
                  ? { uri: offer.iconUrl }
                  : require('../../images/coins image for popup.png')
              }
              style={styles.coinsImage}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.coinsAmount}>{offer.coins} coins</Text>
          
          <View style={styles.priceRow}>
            <Text style={styles.priceAt}>@ </Text>
            {offer.originalPrice !== offer.newPrice && (
              <Text style={styles.priceOld}>₹{offer.originalPrice}</Text>
            )}
            <Text style={styles.priceNew}> ₹{offer.newPrice}</Text>
          </View>

          <TouchableOpacity activeOpacity={0.8} onPress={onAddCoins} style={styles.addBtnGlow}>
            <View style={styles.addBtnWrap}>
              <LinearGradient
                colors={['#22C55E', '#16A34A']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.addBtn}
              >
                <Text style={styles.addBtnText}>Add {offer.coins} Coins</Text>
              </LinearGradient>
            </View>
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  popupContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  handleBar: {
    width: wp(12),
    height: hp(0.5),
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginBottom: hp(2),
  },
  popup: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: wp(6),
    paddingTop: hp(2),
    paddingBottom: hp(4),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.5)',
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute',
    top: hp(2),
    right: wp(6),
    width: wp(9),
    height: wp(9),
    borderRadius: wp(4.5),
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  offerSubtitle: {
    fontSize: ms(14),
    color: '#FFFFFF',
    fontFamily: 'Inter_500Medium',
    marginBottom: vs(4),
    marginTop: vs(8),
  },
  offerTitle: {
    fontSize: ms(30),
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Inter_900Black',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    marginBottom: vs(16),
  },
  offerTitleBold: {
    fontWeight: '900',
    color: '#FFFFFF',
  },
  coinsImageWrap: {
    width: wp(45),
    height: hp(15),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(16),
  },
  coinsImage: {
    width: '100%',
    height: '100%',
  },
  coinsAmount: {
    fontSize: ms(24),
    fontWeight: '800',
    color: '#fff',
    fontFamily: 'Inter_900Black',
    marginBottom: vs(8),
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: vs(20),
  },
  priceAt: {
    fontSize: ms(14),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
  },
  priceOld: {
    fontSize: ms(14),
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
    textDecorationLine: 'line-through',
  },
  priceNew: {
    fontSize: ms(18),
    color: '#fff',
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  addBtnGlow: {
    width: '100%',
    borderRadius: 30,
    height: hp(6),
    shadowColor: '#22C55E',
    shadowOpacity: 0.6,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  addBtnWrap: {
    flex: 1,
    borderRadius: 30,
    overflow: 'hidden',
  },
  addBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#fff',
    fontSize: ms(16),
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
});
