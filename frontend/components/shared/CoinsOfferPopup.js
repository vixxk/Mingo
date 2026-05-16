import { View, Text, StyleSheet, TouchableOpacity, Animated, Image } from 'react-native';
import { useRef, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ms, s, vs } from '../../utils/responsive';

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

  if (!visible || internalTimeLeft <= 0) return null;

  const defaultOffer = { title: '80% Off', coins: 80, originalPrice: 55, newPrice: 11 };
  const offer = offerData || defaultOffer;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.popupContainer, { transform: [{ translateY: slideAnim }] }]}>
        <LinearGradient
          colors={['#3D0000', '#1A0000', '#111']}
          locations={[0, 0.4, 1]}
          style={styles.popup}
        >
          <View style={styles.timerBadge}>
            <Ionicons name="timer-outline" size={14} color="#000" />
            <Text style={styles.timerText}>{formatTime(internalTimeLeft)}</Text>
          </View>

          {}
          <TouchableOpacity 
            style={styles.closeBtn} 
            activeOpacity={0.7} 
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          {}
          <Text style={styles.offerTitle}>Flat <Text style={{fontWeight: '900'}}>{offer.title}</Text></Text>
          <Text style={styles.offerSubtitle}>First Time Signup Offer</Text>

          {}
          <View style={styles.coinsImageWrap}>
            <Image
              source={require('../../images/coins image for popup.png')}
              style={styles.coinsImage}
              resizeMode="contain"
            />
          </View>

          {}
          <Text style={styles.coinsAmount}>{offer.coins} Coins</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceAt}>@ </Text>
            <Text style={styles.priceOld}>₹{offer.originalPrice}</Text>
            <Text style={styles.priceNew}> ₹{offer.newPrice}</Text>
          </View>

          {}
          <TouchableOpacity activeOpacity={0.8} onPress={onAddCoins} style={styles.addBtnWrap}>
            <LinearGradient
              colors={['#3B82F6', '#EC4899', '#F59E0B']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.addBtn}
            >
              <Text style={styles.addBtnText}>Add Coins</Text>
            </LinearGradient>
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
  popup: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: s(24),
    paddingTop: vs(20),
    paddingBottom: vs(28),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A1010',
    borderBottomWidth: 0,
  },
  timerBadge: {
    position: 'absolute',
    top: -15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: s(16),
    paddingVertical: vs(6),
    gap: 6,
    zIndex: 10,
  },
  timerText: {
    fontSize: ms(12, 0.3),
    color: '#000',
    fontFamily: 'Inter_700Bold',
    fontWeight: '700',
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
  offerTitle: {
    fontSize: ms(32, 0.3),
    fontWeight: '800',
    color: '#fff',
    fontFamily: 'Inter_900Black',
    marginBottom: vs(2),
    marginTop: vs(12),
  },
  offerSubtitle: {
    fontSize: ms(14, 0.3),
    color: '#D1D5DB',
    fontFamily: 'Inter_400Regular',
    marginBottom: vs(16),
  },
  coinsImageWrap: {
    width: s(180),
    height: vs(120),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(16),
  },
  coinsImage: {
    width: '100%',
    height: '100%',
  },
  coinsAmount: {
    fontSize: ms(24, 0.3),
    fontWeight: '800',
    color: '#fff',
    fontFamily: 'Inter_900Black',
    marginBottom: vs(4),
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: vs(20),
  },
  priceAt: {
    fontSize: ms(14, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
  },
  priceOld: {
    fontSize: ms(14, 0.3),
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
    textDecorationLine: 'line-through',
  },
  priceNew: {
    fontSize: ms(18, 0.3),
    color: '#fff',
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  addBtnWrap: {
    width: '100%',
    borderRadius: 30,
    overflow: 'hidden',
    height: vs(52),
  },
  addBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#fff',
    fontSize: ms(18, 0.3),
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
});
