import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ms } from '../../utils/responsive';

const { width, height } = Dimensions.get('window');

const getGiftIcon = (name) => {
  if (!name) return '🎁';
  const n = name.toLowerCase();
  if (n.includes('heart')) return '❤️';
  if (n.includes('cane')) return '🍭';
  if (n.includes('candy')) return '🍬';
  if (n.includes('box')) return '🎁';
  if (n.includes('wrapped') || n.includes('present')) return '💝';
  if (n.includes('coin') || n.includes('gold')) return '💰';
  return '🎁';
};

const getGiftPrice = (name) => {
  if (!name) return 10;
  const n = name.toLowerCase();
  if (n.includes('heart')) return 10;
  if (n.includes('cane')) return 50;
  if (n.includes('candy')) return 100;
  if (n.includes('box')) return 300;
  if (n.includes('wrapped') || n.includes('present')) return 500;
  if (n.includes('coin') || n.includes('gold')) return 1000;
  return 10;
};

export default function GiftAnimationOverlay({ giftName, giftIcon, giftPrice, senderName, onComplete }) {
  const price = giftPrice !== undefined ? parseInt(giftPrice, 10) : getGiftPrice(giftName);
  const icon = giftIcon || getGiftIcon(giftName);

  // Decide how many particles based on price tier (higher price = more spectacular)
  const particleCount = useMemo(() => {
    if (price >= 1000) return 85;
    if (price >= 500) return 65;
    if (price >= 300) return 45;
    if (price >= 100) return 32;
    if (price >= 50) return 22;
    return 14;
  }, [price]);

  // Decide animation duration based on price (between 5.0 and 7.0 seconds)
  const duration = useMemo(() => {
    if (price >= 1000) return 7000;
    if (price >= 500) return 6600;
    if (price >= 300) return 6200;
    if (price >= 100) return 5800;
    if (price >= 50) return 5400;
    return 5000;
  }, [price]);

  // Premium design config based on price tier
  const tierConfig = useMemo(() => {
    if (price >= 1000) {
      return {
        title: 'JACKPOT! 👑',
        subText: `${senderName} showered you with Gold Coins!`,
        colors: ['#F59E0B', '#10B981', '#3B82F6'], // Amber-emerald-blue gradient
        emojis: ['💰', '🪙', '✨', '⭐', '💎'],
        titleColor: '#FFD700',
        textGradient: ['#FFF7AD', '#FFAE00'],
      };
    }
    if (price >= 500) {
      return {
        title: 'LUXURY PRESENT! 💝',
        subText: `${senderName} sent a premium gift!`,
        colors: ['#EC4899', '#EF4444', '#F43F5E'], // Rose-red gradient
        emojis: ['💝', '💖', '✨', '🌹', '❤️'],
        titleColor: '#FF2E93',
        textGradient: ['#FFF0F5', '#FF2E93'],
      };
    }
    if (price >= 300) {
      return {
        title: 'MEGA SURPRISE! 🎁',
        subText: `${senderName} sent a special surprise!`,
        colors: ['#8B5CF6', '#EC4899', '#D946EF'], // Violet-fuchsia gradient
        emojis: ['🎁', '🎉', '✨', '🌟', '💝'],
        titleColor: '#D946EF',
        textGradient: ['#EBE3FF', '#8B5CF6'],
      };
    }
    if (price >= 100) {
      return {
        title: 'DELICIOUS CANDY! 🍬',
        subText: `${senderName} sent sweet wishes!`,
        colors: ['#06B6D4', '#3B82F6', '#8B5CF6'], // Cyan-blue gradient
        emojis: ['🍬', '✨', '🍭', '💖'],
        titleColor: '#06B6D4',
        textGradient: ['#E0FCFF', '#06B6D4'],
      };
    }
    if (price >= 50) {
      return {
        title: 'SWEET TREAT! 🍭',
        subText: `${senderName} sent a tasty treat!`,
        colors: ['#F43F5E', '#EC4899'],
        emojis: ['🍭', '✨', '🍬'],
        titleColor: '#EC4899',
        textGradient: ['#FFE9F3', '#EC4899'],
      };
    }
    // Default tier (Heart, etc.)
    return {
      title: 'SWEETHEART! ❤️',
      subText: `${senderName} sent a lovely heart!`,
      colors: ['#EF4444', '#F43F5E'],
      emojis: ['❤️', '💖', '✨'],
      titleColor: '#EF4444',
      textGradient: ['#FFEBEB', '#EF4444'],
    };
  }, [price, senderName]);

  // Max 100 particles pre-allocated to prevent React hooks reallocation issues
  const animations = useRef(
    [...Array(100)].map(() => new Animated.Value(0))
  ).current;

  // Particle path and scale properties
  const particleConfigs = useMemo(() => {
    return [...Array(100)].map(() => {
      // Pick a random emoji from the tier's config options
      const list = tierConfig.emojis;
      const emojiChar = list[Math.floor(Math.random() * list.length)];

      const isJackpot = price >= 1000;
      // Some fall, some rise for jackpot. Others all float upwards.
      const falls = isJackpot && Math.random() > 0.55;

      return {
        emoji: emojiChar,
        startX: Math.random() * width,
        endX: (Math.random() - 0.5) * width + (width / 2),
        startY: falls ? -50 : height + 50,
        endY: falls ? height + 100 : -100,
        scale: (price >= 500 ? 1.5 : 1.0) + Math.random() * 1.6,
        rotation: Math.random() * 360,
        delay: Math.random() * 2500, // Stagger particle release
        falls,
      };
    });
  }, [tierConfig, price]);

  useEffect(() => {
    // Reset all animation values
    animations.forEach(anim => anim.setValue(0));

    // Track completion
    let animsDone = false;
    let timerDone = false;

    const tryComplete = () => {
      if (animsDone && timerDone && onComplete) {
        onComplete();
      }
    };

    // Map the active animations to start timed sequences
    const anims = animations.slice(0, particleCount).map((anim, index) => {
      const config = particleConfigs[index];
      return Animated.sequence([
        Animated.delay(config.delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: duration - config.delay > 1500 ? duration - config.delay : 2000,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]);
    });

    Animated.parallel(anims).start(() => {
      animsDone = true;
      tryComplete();
    });

    // Minimum display time: ensure the overlay stays visible for at least 5 seconds
    const minTimer = setTimeout(() => {
      timerDone = true;
      tryComplete();
    }, Math.max(duration, 5000));

    return () => clearTimeout(minTimer);
  }, [particleCount, duration, onComplete, particleConfigs, animations]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Background Deep Ambient Vignette */}
      <LinearGradient
        colors={['rgba(0,0,0,0.85)', 'rgba(10,5,20,0.6)', 'rgba(0,0,0,0.9)']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Spectacular Title Card */}
      <View style={styles.textContainer}>
        <Text style={[styles.titleText, { color: tierConfig.titleColor }]}>
          {tierConfig.title}
        </Text>
        <View style={styles.subTextBorder}>
          <Text style={styles.subText}>{tierConfig.subText}</Text>
        </View>
      </View>

      {/* Render Particles */}
      {animations.slice(0, particleCount).map((anim, index) => {
        const config = particleConfigs[index];

        const translateY = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [config.startY, config.endY],
        });

        const translateX = anim.interpolate({
          inputRange: [0, 0.4, 0.7, 1],
          outputRange: [
            config.startX, 
            config.startX + (Math.random() - 0.5) * 80, 
            config.endX + (Math.random() - 0.5) * 80, 
            config.endX
          ],
        });

        const rotate = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [`${config.rotation}deg`, `${config.rotation + 360 * (config.falls ? -1.5 : 2)}deg`],
        });

        const opacity = anim.interpolate({
          inputRange: [0, 0.15, 0.8, 1],
          outputRange: [0, 1, 1, 0],
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
                  { scale: config.scale },
                ],
                opacity,
              },
            ]}
          >
            <Text style={styles.emojiText}>{config.emoji}</Text>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  textContainer: {
    position: 'absolute',
    top: '32%',
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 999,
  },
  titleText: {
    fontSize: ms(32),
    fontFamily: 'Inter_900Black',
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 2, height: 4 },
    textShadowRadius: 15,
    marginBottom: 8,
  },
  subTextBorder: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  subText: {
    color: '#FFFFFF',
    fontSize: ms(15),
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  particle: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 99,
  },
  emojiText: {
    fontSize: ms(26),
  },
});
