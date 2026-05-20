import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions, Text } from 'react-native';

const { width, height } = Dimensions.get('window');

const GIFT_EMOJIS = {
  'rose': '🌹',
  'heart': '💖',
  'diamond': '💎',
  'car': '🏎️',
  'yacht': '🛳️',
  'coffee': '☕',
  'bear': '🧸',
  'ring': '💍',
  'default': '✨'
};

const getEmoji = (name) => {
  if (!name) return GIFT_EMOJIS.default;
  const n = name.toLowerCase();
  for (const key in GIFT_EMOJIS) {
    if (n.includes(key)) return GIFT_EMOJIS[key];
  }
  return GIFT_EMOJIS.default;
};

// Generates an array of animated particles
export default function GiftAnimationOverlay({ giftName, senderName, onComplete }) {
  const emoji = getEmoji(giftName);
  const isBigEffect = emoji === '🏎️' || emoji === '🛳️' || emoji === '💎';
  
  // Decide how many particles based on effect type
  const particleCount = isBigEffect ? 5 : 20;

  const animations = useRef(
    [...Array(particleCount)].map(() => new Animated.Value(0))
  ).current;

  // Randomize start X, end X, scale, and rotation for each particle
  const particleConfigs = useMemo(() => {
    return [...Array(particleCount)].map(() => ({
      startX: Math.random() * width,
      endX: (Math.random() - 0.5) * width + (width / 2),
      scale: isBigEffect ? 3 + Math.random() * 2 : 1 + Math.random() * 1.5,
      rotation: Math.random() * 360,
      delay: Math.random() * (isBigEffect ? 500 : 1500)
    }));
  }, [particleCount, isBigEffect]);

  useEffect(() => {
    const anims = animations.map((anim, index) => {
      const config = particleConfigs[index];
      return Animated.sequence([
        Animated.delay(config.delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: isBigEffect ? 3000 : 4000 + Math.random() * 1000,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      ]);
    });

    Animated.parallel(anims).start(() => {
      if (onComplete) onComplete();
    });
  }, [animations, particleConfigs, isBigEffect, onComplete]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Background Dim */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 1 }]} />
      
      {/* Text Notification */}
      <View style={styles.textContainer}>
        <Text style={styles.titleText}>{isBigEffect ? 'WOW!' : 'Awesome!'}</Text>
        <Text style={styles.subText}>{senderName} sent a {giftName}</Text>
      </View>

      {/* Particles */}
      {animations.map((anim, index) => {
        const config = particleConfigs[index];
        
        const translateY = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [height, -100] // float upwards
        });
        
        const translateX = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [config.startX, config.endX]
        });

        const rotate = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [`${config.rotation}deg`, `${config.rotation + 360}deg`]
        });

        const opacity = anim.interpolate({
          inputRange: [0, 0.2, 0.8, 1],
          outputRange: [0, 1, 1, 0]
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.particle,
              {
                transform: [
                  { translateY },
                  { translateX },
                  { rotate },
                  { scale: config.scale }
                ],
                opacity
              }
            ]}
          >
            <Text style={styles.emojiText}>{emoji}</Text>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  textContainer: {
    position: 'absolute',
    top: '30%',
    width: '100%',
    alignItems: 'center',
    zIndex: 10,
  },
  titleText: {
    color: '#FFD700',
    fontSize: 40,
    fontWeight: '900',
    fontStyle: 'italic',
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 10,
    marginBottom: 10,
  },
  subText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
  particle: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 5,
  },
  emojiText: {
    fontSize: 30,
  }
});
