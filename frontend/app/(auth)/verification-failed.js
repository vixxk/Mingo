import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ms, s, vs, SCREEN_WIDTH, SCREEN_HEIGHT } from '../../utils/responsive';

export default function VerificationFailedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleBecomeCustomer = () => {
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Decorative background ambient light circles matching the Role Selection screen theme */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + vs(60), paddingBottom: insets.bottom + vs(30) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Left-aligned Text Content from the reference image */}
        <View style={styles.textContainer}>
          <Text style={styles.heading}>Verification failed</Text>
          <Text style={styles.subtitle}>
            Unable to verify as per policy. You can try again after 15 days.
          </Text>
        </View>

        {/* Custom Glowing Sad Face Vector Graphic */}
        <View style={styles.graphicContainer}>
          <LinearGradient
            colors={['#EC4899', '#D946EF', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sadFaceCircle}
          >
            <View style={styles.eyesRow}>
              <View style={styles.eye} />
              <View style={styles.eye} />
            </View>
            <View style={styles.sadMouth} />
          </LinearGradient>
        </View>

        {/* Become a Customer Button styled with Mingo's Signature Gradient */}
        <TouchableOpacity
          style={styles.buttonContainer}
          activeOpacity={0.85}
          onPress={handleBecomeCustomer}
        >
          <LinearGradient
            colors={['#3B82F6', '#EC4899', '#F59E0B']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Become a Customer</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Contact Support Footer */}
        <Text style={styles.supportText}>
          For any queries please contact{' '}
          <Text style={styles.supportEmail}>support@talkmingo.com</Text>
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  bgCircle1: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.8,
    borderRadius: SCREEN_WIDTH * 0.4,
    backgroundColor: '#3B82F6',
    top: -SCREEN_WIDTH * 0.2,
    right: -SCREEN_WIDTH * 0.2,
    opacity: 0.12,
  },
  bgCircle2: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.7,
    borderRadius: SCREEN_WIDTH * 0.35,
    backgroundColor: '#8B5CF6',
    bottom: -SCREEN_WIDTH * 0.15,
    left: -SCREEN_WIDTH * 0.15,
    opacity: 0.12,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: s(28),
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: SCREEN_HEIGHT * 0.88,
  },
  textContainer: {
    width: '100%',
    alignItems: 'flex-start',
    marginBottom: vs(20),
  },
  heading: {
    fontSize: ms(30, 0.3),
    color: '#fff',
    fontFamily: 'Inter_900Black',
    textAlign: 'left',
    lineHeight: ms(38),
    marginBottom: vs(12),
  },
  subtitle: {
    fontSize: ms(15, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    textAlign: 'left',
    lineHeight: ms(22),
  },
  graphicContainer: {
    width: SCREEN_WIDTH * 0.72,
    height: SCREEN_WIDTH * 0.72,
    borderRadius: (SCREEN_WIDTH * 0.72) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: vs(40),
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 10,
  },
  sadFaceCircle: {
    width: '100%',
    height: '100%',
    borderRadius: (SCREEN_WIDTH * 0.72) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    paddingTop: vs(12),
  },
  eyesRow: {
    flexDirection: 'row',
    gap: s(20),
    marginBottom: vs(24),
  },
  eye: {
    width: s(16),
    height: vs(34),
    borderRadius: s(8),
    backgroundColor: '#FFF',
  },
  sadMouth: {
    width: s(54),
    height: vs(27),
    borderWidth: s(5),
    borderColor: '#FFF',
    borderBottomWidth: 0,
    borderTopLeftRadius: s(27),
    borderTopRightRadius: s(27),
    transform: [{ rotate: '180deg' }],
  },
  buttonContainer: {
    width: '100%',
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: vs(24),
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  button: {
    width: '100%',
    paddingVertical: vs(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: ms(16, 0.3),
    color: '#fff',
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  supportText: {
    fontSize: ms(13, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginTop: 'auto',
  },
  supportEmail: {
    color: '#D8B4FE',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
});
