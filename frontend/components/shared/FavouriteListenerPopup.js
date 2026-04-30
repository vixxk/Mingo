import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ms, s, vs } from '../../utils/responsive';

export default function FavouriteListenerPopup({ visible, onGotIt, onClose }) {
  const slideAnim = useRef(new Animated.Value(400)).current;
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
        Animated.timing(slideAnim, { toValue: 400, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]} />
      <Animated.View style={[styles.popupContainer, { transform: [{ translateY: slideAnim }] }]}>
        <LinearGradient
          colors={['#7F1D1D', '#991B1B', '#450A0A']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.popup}
        >
          {}
          <TouchableOpacity 
            style={styles.closeBtn} 
            activeOpacity={0.7} 
            onPress={onClose || onGotIt}
          >
            <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          <View style={styles.titleRow}>
            <Ionicons name="heart-outline" size={22} color="#fff" />
            <Text style={styles.title}>Add Favourite Listener</Text>
          </View>

          <Text style={styles.subtitle}>
            Now you mark listeners as your favourite.
          </Text>

          <TouchableOpacity
            style={styles.gotItBtn}
            activeOpacity={0.85}
            onPress={onGotIt}
          >
            <Text style={styles.gotItText}>Got It</Text>
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    paddingHorizontal: s(28),
    paddingTop: vs(28),
    paddingBottom: vs(32),
    alignItems: 'center',
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    marginBottom: vs(10),
  },
  title: {
    fontSize: ms(20, 0.3),
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Inter_900Black',
  },
  subtitle: {
    fontSize: ms(14, 0.3),
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: vs(24),
  },
  gotItBtn: {
    backgroundColor: '#fff',
    borderRadius: 26,
    paddingHorizontal: s(40),
    paddingVertical: vs(14),
  },
  gotItText: {
    fontSize: ms(15, 0.3),
    color: '#000',
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
});
