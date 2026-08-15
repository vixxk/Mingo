import { View, Text, StyleSheet, TouchableOpacity, Animated, Image, ActivityIndicator } from 'react-native';
import { useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ms, s, vs, wp, hp, SCREEN_WIDTH, SCREEN_HEIGHT } from '../../utils/responsive';
import AnimatedSparkles from './AnimatedSparkles';

export default function CenteredOfferPopup({ visible, onClose, onAddCoins, offerData, loading = false }) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0.8, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  const defaultOffer = {
    title: 'Starter Offer',
    coins: 80,
    originalPrice: 62,
    newPrice: 62,
  };
  const offer = offerData || defaultOffer;
  const showLoader = loading && !offerData;

  const titleText = offer.title 
    ? (offer.title.toLowerCase().includes('off') || offer.title.toLowerCase().includes('offer') ? offer.title : `Flat ${offer.title}`)
    : 'Special Offer';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.popupContainer, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
        <LinearGradient
          colors={['#000', '#052E16', '#14532D']}
          locations={[0, 0.55, 1]}
          style={styles.popup}
        >
          <AnimatedSparkles color="#34D399" size={18} />
          <TouchableOpacity 
            style={styles.closeBtn} 
            activeOpacity={0.7} 
            onPress={onClose}
          >
            <Ionicons name="close" size={wp(5)} color="#fff" />
          </TouchableOpacity>

          {showLoader ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="large" color="#4ADE80" />
              <Text style={styles.loaderText}>Loading your best offer...</Text>
            </View>
          ) : (
            <>
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
            </>
          )}
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  popupContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -(SCREEN_WIDTH * 0.4),
    marginTop: -(SCREEN_HEIGHT * 0.25),
    width: SCREEN_WIDTH * 0.8,
  },
  popup: {
    borderRadius: wp(6),
    paddingHorizontal: wp(5),
    paddingTop: hp(3),
    paddingBottom: hp(3),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.5)',
    overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute',
    top: hp(1.5),
    right: wp(4),
    width: wp(8),
    height: wp(8),
    borderRadius: wp(4),
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
  loaderWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(6),
    paddingHorizontal: wp(2),
  },
  loaderText: {
    fontSize: ms(14),
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'Inter_500Medium',
    marginTop: vs(16),
    textAlign: 'center',
  },
  emptyText: {
    fontSize: ms(15),
    color: 'rgba(255,255,255,0.9)',
    fontFamily: 'Inter_600SemiBold',
    marginBottom: vs(24),
    textAlign: 'center',
  },
  emptyBtn: {
    width: '100%',
    borderRadius: 30,
    overflow: 'hidden',
    height: hp(6),
  },
  emptyBtnGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
