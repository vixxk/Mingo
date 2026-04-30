import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ms, s, vs, SCREEN_HEIGHT } from '../../utils/responsive';

export default function JoiningScreen() {
  const router = useRouter();

  
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  
  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace('/audio-call');
    }, 3000);
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
        {}
        <Animated.Text style={[styles.spinner, { transform: [{ rotate: spin }] }]}>
          ✦
        </Animated.Text>
        <Text style={styles.joiningText}>Joining...</Text>
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
  },
  spinner: {
    fontSize: ms(40, 0.3),
    color: '#fff',
    marginBottom: vs(16),
  },
  joiningText: {
    fontSize: ms(18, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
  },
});
