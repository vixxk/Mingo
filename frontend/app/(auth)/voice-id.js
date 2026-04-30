import { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ms, s, vs, SCREEN_HEIGHT } from '../../utils/responsive';

export default function VoiceIdentificationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);

  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.5, duration: 800, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(pulseOpacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
            Animated.timing(pulseOpacity, { toValue: 0, duration: 800, useNativeDriver: true }),
          ]),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
      pulseOpacity.setValue(0);
    }
  }, [isRecording]);

  const handlePressIn = () => setIsRecording(true);
  const handlePressOut = () => setIsRecording(false);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {}
      <LinearGradient
        colors={['transparent', '#1A0000', '#4A0000']}
        locations={[0, 0.55, 1]}
        style={styles.bgGradient}
      />

      {}
      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + vs(8) }]}
        onPress={() => router.back()}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={22} color="#fff" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      {}
      <View style={[styles.content, { paddingTop: insets.top + vs(120) }]}>
        <Text style={styles.heading}>Voice Identification</Text>
        <Text style={styles.subtitle}>
          To confirm your identity, please record{'\n'}yourself saying the following sentence.
        </Text>

        {}
        <View style={styles.divider} />

        {}
        <Text style={styles.dummyText}>Dummy Text Line Here To Speak</Text>
      </View>

      {}
      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + vs(40) }]}>
        {}
        <Animated.View
          style={[
            styles.pulseRing,
            { transform: [{ scale: pulseAnim }], opacity: pulseOpacity },
          ]}
        />

        {}
        <TouchableOpacity
          style={[styles.micBtn, isRecording && styles.micBtnActive]}
          activeOpacity={0.8}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <Ionicons name="mic" size={28} color={isRecording ? '#EF4444' : '#000'} />
        </TouchableOpacity>

        <Text style={styles.micHint}>Tap and hold to speak</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  bgGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.55,
  },

  
  backBtn: {
    position: 'absolute',
    left: s(16),
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    fontSize: ms(16, 0.3),
    color: '#fff',
    fontFamily: 'Inter_500Medium',
  },

  
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: s(24),
  },
  heading: {
    fontSize: ms(28, 0.3),
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Inter_900Black',
    textAlign: 'center',
    marginBottom: vs(12),
  },
  subtitle: {
    fontSize: ms(14, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: ms(20),
    marginBottom: vs(24),
  },
  divider: {
    width: '80%',
    height: 1,
    backgroundColor: '#2A2A2A',
    marginBottom: vs(28),
  },
  dummyText: {
    fontSize: ms(18, 0.3),
    color: '#E5E7EB',
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },

  
  bottomSection: {
    alignItems: 'center',
    paddingBottom: vs(60),
  },
  pulseRing: {
    position: 'absolute',
    width: s(72),
    height: s(72),
    borderRadius: s(36),
    backgroundColor: '#fff',
    bottom: vs(80),
  },
  micBtn: {
    width: s(64),
    height: s(64),
    borderRadius: s(32),
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(14),
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  micBtnActive: {
    backgroundColor: '#FEE2E2',
  },
  micHint: {
    fontSize: ms(13, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
  },
});
