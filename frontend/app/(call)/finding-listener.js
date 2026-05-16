import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ms, s, vs, SCREEN_HEIGHT } from '../../utils/responsive';
import { callAPI } from '../../utils/api';

export default function FindingListenerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { callType = 'audio' } = useLocalSearchParams();

  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const SCAN_HEIGHT = vs(180);
  const scanTranslateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCAN_HEIGHT],
  });

  useEffect(() => {
    const startCall = async () => {
      try {
        const res = await callAPI.startCall(null, callType);
        if (res?.data) {
          router.replace({ 
            pathname: '/(call)/connecting', 
            params: { 
              name: res.data.listenerName || 'Listener', 
              callId: res.data.sessionId,
              roomId: res.data.roomId,
              listenerId: res.data.listenerId,
              avatarIndex: res.data.listenerAvatarIndex,
              gender: res.data.listenerGender,
              zegoAppId: res.data.zegoAppId,
              zegoAppSign: res.data.zegoAppSign,
              callType: res.data.callType,
            } 
          });
        } else {
          router.back();
        }
      } catch (error) {
        console.log('Call start failed:', error);
        
        // Check if error is insufficient balance
        if (error?.status === 402 || error?.message?.includes('balance') || error?.message?.includes('coins')) {
          router.replace('/(wallet)/wallet');
          // We can't use Alert in replaced route easily, but we can pass a param if needed. 
          // For now, redirecting to wallet is good enough.
          return;
        }

        setTimeout(() => {
          router.replace({ pathname: '/(call)/connecting', params: { name: 'Priya Sharma', callId: 'demo_zego_call', callType } });
        }, 3000);
      }
    };
    startCall();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <LinearGradient
        colors={['#000', '#1A0000', '#4A0000']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {}
      <View style={[styles.topSection, { paddingTop: insets.top + vs(80) }]}>
        <View style={styles.avatarCard}>
          <Image
            source={require('../../images/avatar_2.png')}
            style={styles.avatarImage}
            resizeMode="cover"
          />
          {}
          <Animated.View
            style={[
              styles.scanLine,
              { transform: [{ translateY: scanTranslateY }] },
            ]}
          >
            <LinearGradient
              colors={['transparent', '#22C55E', 'transparent']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.scanGradient}
            />
          </Animated.View>
        </View>
      </View>

      {}
      <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom + vs(20), vs(40)) }]}>
        <Text style={styles.heading}>Finding A Listener For You...</Text>
        <Text style={styles.subtitle}>
          Please wait while we find you someone who is{'\n'}available.
        </Text>

        <TouchableOpacity
          style={styles.cancelBtn}
          activeOpacity={0.8}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  
  topSection: {
    flex: 1,
    alignItems: 'center',
  },
  avatarCard: {
    width: s(160),
    height: vs(180),
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
  },
  scanGradient: {
    flex: 1,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 8,
  },

  
  bottomSection: {
    alignItems: 'center',
    paddingHorizontal: s(24),
  },
  heading: {
    fontSize: ms(22, 0.3),
    fontWeight: '800',
    color: '#fff',
    fontFamily: 'Inter_900Black',
    textAlign: 'center',
    marginBottom: vs(10),
  },
  subtitle: {
    fontSize: ms(13, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: ms(19),
    marginBottom: vs(24),
  },
  cancelBtn: {
    borderWidth: 1.5,
    borderColor: '#6B7280',
    borderRadius: 26,
    paddingHorizontal: s(36),
    paddingVertical: vs(12),
  },
  cancelText: {
    fontSize: ms(15, 0.3),
    color: '#E5E7EB',
    fontFamily: 'Inter_500Medium',
  },
});
