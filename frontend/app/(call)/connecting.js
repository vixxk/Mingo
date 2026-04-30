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
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ms, s, vs, SCREEN_HEIGHT } from '../../utils/responsive';

const INTERESTS = [
  { label: 'Career', icon: 'briefcase-outline' },
  { label: 'Emotional & Supportive Talk', icon: 'heart-outline' },
  { label: 'Childhood and Memories', icon: 'heart-outline' },
  { label: 'Films and Music', icon: 'musical-notes-outline' },
  { label: 'Growth & Ideas', icon: 'bulb-outline' },
  { label: 'Family & Relationships', icon: 'heart-outline' },
];

export default function ConnectingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { name = 'Priya Sharma' } = useLocalSearchParams();

  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  const dotsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(dotsAnim, {
        toValue: 3,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    ).start();

    const timer = setTimeout(() => {
      router.replace({ pathname: '/(call)/audio-call', params: { name, callId: 'demo_zego_call' } });
    }, 2500);

    return () => clearTimeout(timer);
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
      <View style={[styles.topSection, { paddingTop: insets.top + vs(30) }]}>
        <Animated.View style={[styles.avatarRing, { transform: [{ scale: pulseAnim }] }]}>
          <Image
            source={require('../../images/user_priya.png')}
            style={styles.avatar}
          />
        </Animated.View>
        <Text style={styles.callerName}>{name}</Text>
        <Text style={styles.connectingText}>Connecting...</Text>
      </View>

      {}
      <View style={styles.interestsSection}>
        <View style={styles.chipsWrap}>
          {INTERESTS.map((item, index) => (
            <View key={index} style={styles.chip}>
              <Text style={styles.chipText}>{item.label}</Text>
              <Ionicons name={item.icon} size={14} color="#9CA3AF" />
            </View>
          ))}
        </View>
      </View>

      {}
      <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom + vs(16), vs(32)) }]}>
        <Text style={styles.safetyText}>
          Keep the conversation safe & respectful.
        </Text>
        <TouchableOpacity
          style={styles.cancelBtn}
          activeOpacity={0.8}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelText}>Cancel Call</Text>
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
    alignItems: 'center',
    marginBottom: vs(20),
  },
  avatarRing: {
    width: s(120),
    height: s(120),
    borderRadius: s(60),
    borderWidth: 4,
    borderColor: '#EC4899',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(14),
  },
  avatar: {
    width: s(108),
    height: s(108),
    borderRadius: s(54),
  },
  callerName: {
    fontSize: ms(24, 0.3),
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Inter_900Black',
    marginBottom: vs(4),
  },
  connectingText: {
    fontSize: ms(15, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
  },

  
  interestsSection: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: s(16),
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: s(8),
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: s(14),
    paddingVertical: vs(8),
    gap: 6,
    backgroundColor: 'rgba(20,20,20,0.6)',
  },
  chipText: {
    fontSize: ms(12, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_500Medium',
  },

  
  bottomSection: {
    alignItems: 'center',
    paddingHorizontal: s(24),
  },
  safetyText: {
    fontSize: ms(13, 0.3),
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
    fontStyle: 'italic',
    marginBottom: vs(16),
    textAlign: 'center',
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
