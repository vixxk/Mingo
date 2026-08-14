import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { s, vs } from '../../utils/responsive';

/**
 * Animated sparkling stars component for green popups and success screens.
 * Renders twinkling 4-point stars with scale and opacity pulse loops.
 */
export default function AnimatedSparkles({ color = '#34D399', size = 18, style }) {
  const anim1 = useRef(new Animated.Value(0.3)).current;
  const anim2 = useRef(new Animated.Value(0.7)).current;
  const anim3 = useRef(new Animated.Value(0.4)).current;
  const anim4 = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const createSparkleAnim = (val, duration, delay) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: 1, duration: duration, useNativeDriver: true }),
          Animated.timing(val, { toValue: 0.2, duration: duration, useNativeDriver: true }),
        ])
      );
    };

    const animation = Animated.parallel([
      createSparkleAnim(anim1, 1000, 0),
      createSparkleAnim(anim2, 1200, 300),
      createSparkleAnim(anim3, 1100, 600),
      createSparkleAnim(anim4, 1300, 900),
    ]);

    animation.start();

    return () => animation.stop();
  }, [anim1, anim2, anim3, anim4]);

  return (
    <View style={[styles.container, style]} pointerEvents="none">
      {/* Top Left Sparkle */}
      <Animated.View
        style={[
          styles.sparkle,
          { top: vs(12), left: s(16), opacity: anim1, transform: [{ scale: anim1 }] },
        ]}
      >
        <Ionicons name="sparkles" size={size} color={color} />
      </Animated.View>

      {/* Top Right Sparkle */}
      <Animated.View
        style={[
          styles.sparkle,
          { top: vs(24), right: s(20), opacity: anim2, transform: [{ scale: anim2 }] },
        ]}
      >
        <Ionicons name="sparkles-outline" size={size * 1.2} color={color} />
      </Animated.View>

      {/* Middle Left Sparkle */}
      <Animated.View
        style={[
          styles.sparkle,
          { top: vs(90), left: s(12), opacity: anim3, transform: [{ scale: anim3 }] },
        ]}
      >
        <Ionicons name="sparkles" size={size * 0.9} color={color} />
      </Animated.View>

      {/* Bottom Right Sparkle */}
      <Animated.View
        style={[
          styles.sparkle,
          { bottom: vs(36), right: s(16), opacity: anim4, transform: [{ scale: anim4 }] },
        ]}
      >
        <Ionicons name="sparkles" size={size * 1.1} color={color} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: 1,
  },
  sparkle: {
    position: 'absolute',
  },
});
