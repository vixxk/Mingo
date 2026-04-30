import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ms, s, vs, SCREEN_HEIGHT } from '../../utils/responsive';

export default function UserBusyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { name = 'Priya' } = useLocalSearchParams();

  
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  
  useEffect(() => {
    const timeout = setTimeout(() => {
      router.back();
    }, 5000);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <LinearGradient
        colors={['#000', '#1A0000', '#4A0000']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.center}>
        <Animated.View style={[styles.avatarRing, { transform: [{ scale: pulseAnim }] }]}>
          <Image
            source={require('../../images/user_priya.png')}
            style={styles.avatar}
          />
        </Animated.View>

        <Text style={styles.busyText}>
          {name} is currently busy,{'\n'}finding someone new to talk...
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: s(32),
  },
  avatarRing: {
    width: s(120),
    height: s(120),
    borderRadius: s(60),
    borderWidth: 4,
    borderColor: '#EC4899',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(24),
  },
  avatar: {
    width: s(108),
    height: s(108),
    borderRadius: s(54),
  },
  busyText: {
    fontSize: ms(18, 0.3),
    color: '#E5E7EB',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: ms(26),
  },
});
