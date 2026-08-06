import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { useRef, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ms, s, vs } from '../../utils/responsive';

export default function SafetyPopup({ visible, onDismiss }) {
  const slideAnim = useRef(new Animated.Value(400)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const squashAnim = useRef(new Animated.Value(1)).current;
  const [rendered, setRendered] = useState(visible);

  // Enter: slide up from the bottom with a soft spring
  useEffect(() => {
    if (visible) {
      setRendered(true);
      // Stop any in-flight exit animation before re-entering
      slideAnim.stopAnimation();
      overlayAnim.stopAnimation();
      squashAnim.stopAnimation();
      slideAnim.setValue(400);
      squashAnim.setValue(1);
      overlayAnim.setValue(0);
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  // Exit: compress (squash) and retract into the bottom button
  useEffect(() => {
    if (!visible && rendered) {
      Animated.parallel([
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 340,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 340,
          duration: 340,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(squashAnim, {
          toValue: 0.05,
          duration: 340,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setRendered(false);
      });
    }
  }, [visible, rendered]);

  if (!rendered) return null;

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.container,
          {
            opacity: overlayAnim,
            transform: [{ translateY: slideAnim }, { scaleY: squashAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={['#4D7C0F', '#65A30D', '#3F6212']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.popup}
        >
          <TouchableOpacity
            style={styles.closeBtn}
            activeOpacity={0.7}
            onPress={onDismiss}
          >
            <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark" size={22} color="#fff" />
          </View>
          <Text style={styles.title}>Your Safety Come First</Text>
          <Text style={styles.subtitle}>
            Don't share personal information during calls,{'\n'}report anyone who asks. please follow the{'\n'}community guidelines.
          </Text>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 500,
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  popup: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: s(24),
    paddingTop: vs(24),
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
  iconCircle: {
    width: s(44),
    height: s(44),
    borderRadius: s(22),
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(14),
  },
  title: {
    fontSize: ms(20, 0.3),
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Inter_900Black',
    marginBottom: vs(10),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: ms(13, 0.3),
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: ms(19),
  },
});
