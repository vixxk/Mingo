import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ms, s, vs, SCREEN_HEIGHT } from '../../utils/responsive';

export default function PaymentFailedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

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
      <View style={styles.center}>
        {}
        <View style={styles.iconCircle}>
          <Ionicons name="close" size={28} color="#000" />
        </View>

        <Text style={styles.title}>Payment Failed</Text>

        <Text style={styles.subtitle}>
          Incase any amount was deducted, please{'\n'}contact{' '}
          <Text style={styles.emailLink}>support@mingo.in</Text>
        </Text>

        <TouchableOpacity
          style={styles.tryAgainBtn}
          activeOpacity={0.8}
          onPress={() => router.back()}
        >
          <Text style={styles.tryAgainText}>Try Again</Text>
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
  bgGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.5,
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

  
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: s(32),
  },
  iconCircle: {
    width: s(56),
    height: s(56),
    borderRadius: s(28),
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(20),
  },
  title: {
    fontSize: ms(28, 0.3),
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Inter_900Black',
    marginBottom: vs(14),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: ms(14, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: ms(21),
    marginBottom: vs(24),
  },
  emailLink: {
    color: '#fff',
    textDecorationLine: 'underline',
    fontFamily: 'Inter_500Medium',
  },
  tryAgainBtn: {
    backgroundColor: '#fff',
    borderRadius: 30,
    paddingHorizontal: s(40),
    paddingVertical: vs(14),
  },
  tryAgainText: {
    fontSize: ms(16, 0.3),
    color: '#000',
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
});
