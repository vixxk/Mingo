import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SW, height: SH } = Dimensions.get('window');

export default function CertifiedListenerPopup({ visible, onExplore, onDismiss }) {
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
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onDismiss} />
      </Animated.View>
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
            onPress={onDismiss}
          >
            <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          {}
          <View style={styles.titleRow}>
            <Ionicons name="shield-checkmark" size={22} color="#22C55E" />
            <Text style={styles.title}>Certified Listener</Text>
          </View>

          {}
          <Text style={styles.subtitle}>
            Certified listeners, are trained for quality,{'\n'}safety, and empathy.
          </Text>

          {}
          <TouchableOpacity
            style={styles.exploreBtn}
            activeOpacity={0.85}
            onPress={onExplore}
          >
            <Text style={styles.exploreBtnText}>Explore Certified Listeners</Text>
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
    zIndex: 1000,
  },
  popupContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1001,
  },
  popup: {
    borderTopLeftRadius: SW * 0.07,
    borderTopRightRadius: SW * 0.07,
    paddingHorizontal: SW * 0.07,
    paddingTop: SH * 0.035,
    paddingBottom: SH * 0.04,
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: SH * 0.02,
    right: SW * 0.04,
    width: SW * 0.08,
    height: SW * 0.08,
    borderRadius: SW * 0.04,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SW * 0.02,
    marginBottom: SH * 0.015,
  },
  title: {
    fontSize: SW * 0.055,
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Inter_900Black',
  },
  subtitle: {
    fontSize: SW * 0.035,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: SW * 0.05,
    marginBottom: SH * 0.03,
  },
  exploreBtn: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: SW * 0.08,
    paddingVertical: SH * 0.02,
    alignItems: 'center',
  },
  exploreBtnText: {
    fontSize: SW * 0.04,
    color: '#000',
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
});
