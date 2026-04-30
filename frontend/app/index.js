import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ms, s, vs, SCREEN_WIDTH, SCREEN_HEIGHT } from '../utils/responsive';

export default function SplashScreenPage() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    
    const checkAuthAndRedirect = async () => {
      try {
        const userStr = await AsyncStorage.getItem('user');
        const userToken = await AsyncStorage.getItem('userToken');
        const isAdmin = await AsyncStorage.getItem('isAdmin');

        let role = 'USER';
        if (isAdmin === 'true') {
          role = 'ADMIN';
        } else if (userStr) {
          try {
            const user = JSON.parse(userStr);
            if (user.role) role = user.role;
          } catch(e) {}
        }

        
        setTimeout(() => {
          if (role === 'ADMIN') {
            router.replace('/(admin)');
          } else if (role === 'LISTENER') {
            router.replace('/(listener)');
          } else if (userToken) {
            router.replace('/(tabs)');
          } else {
            router.replace('/welcome');
          }
        }, 2500);
      } catch (error) {
        console.error('Auth check error:', error);
        router.replace('/welcome');
      }
    };

    checkAuthAndRedirect();
  }, []);

  return (
    <LinearGradient
      colors={['#2563EB', '#7C3AED', '#DB2777', '#EA580C', '#F59E0B']}
      locations={[0, 0.25, 0.5, 0.75, 1]}
      style={styles.container}
    >
      <StatusBar style="light" />
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.logoRow}>
          <Image 
            source={require('../images/Mingo Splash Text.png')} 
            style={{ width: SCREEN_WIDTH * 0.8, height: SCREEN_HEIGHT * 0.2 }} 
            resizeMode="contain" 
          />
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

